import { getUser, createServiceClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

async function resolveBusinessId(user: { id: string }): Promise<string | null> {
  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATION_COOKIE)?.value
  if (impersonatingId) return impersonatingId

  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  return business?.id ?? null
}

// POST /api/portal/system-config
// action: 'save-tier' | 'seed' | 'apply-to-all'
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, productId } = body

  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

  const businessId = await resolveBusinessId(user)
  if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const serviceClient = await createServiceClient()

  // Verify product ownership
  const { data: product } = await serviceClient
    .from('products').select('id').eq('id', productId).eq('business_id', businessId).maybeSingle()
  if (!product) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── save-tier ────────────────────────────────────────────────
  if (action === 'save-tier') {
    const { tier, config } = body
    if (!tier || !config) return NextResponse.json({ error: 'Missing tier or config' }, { status: 400 })

    const payload = {
      business_id: businessId,
      product_id: productId,
      tier,
      efficiency_description: config.efficiency_description || null,
      warranty_years: config.warranty_years ? parseInt(config.warranty_years) : null,
      scope_of_work: config.scope_of_work || null,
      image_url: config.image_url || null,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await serviceClient
      .from('tier_system_configurations').select('id').eq('business_id', businessId).eq('product_id', productId).eq('tier', tier).maybeSingle()

    let result
    if (existing) {
      result = await serviceClient
        .from('tier_system_configurations').update(payload).eq('id', existing.id).select().single()
    } else {
      result = await serviceClient
        .from('tier_system_configurations').insert(payload).select().single()
    }

    if (result.error) {
      console.error('[system-config/save-tier]', result.error.message)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, config: result.data })
  }

  // ── seed ────────────────────────────────────────────────────
  if (action === 'seed') {
    const { tiers: missingTiers, defaultEfficiency, defaultScope } = body
    if (!Array.isArray(missingTiers)) return NextResponse.json({ error: 'Missing tiers array' }, { status: 400 })

    await Promise.all(missingTiers.map((tier: string) =>
      serviceClient.from('tier_system_configurations').insert({
        business_id: businessId,
        product_id: productId,
        tier,
        efficiency_description: defaultEfficiency?.[tier] ?? null,
        scope_of_work: defaultScope ?? null,
      })
    ))
    return NextResponse.json({ ok: true })
  }

  // ── apply-to-all ─────────────────────────────────────────────
  if (action === 'apply-to-all') {
    const { capacityIds, tierConfigs } = body
    if (!Array.isArray(capacityIds) || !tierConfigs) {
      return NextResponse.json({ error: 'Missing capacityIds or tierConfigs' }, { status: 400 })
    }

    // Fetch existing tiers for this product
    const { data: existingTiers } = await serviceClient
      .from('pricing_tiers').select('*').eq('business_id', businessId).eq('product_id', productId)

    const ops: Promise<{ error: unknown }>[] = []

    for (const capacityId of capacityIds) {
      for (const [tier, cfg] of Object.entries(tierConfigs) as [string, { warranty_years: string; scope_of_work: string }][]) {
        const warrantyYears = cfg.warranty_years ? parseInt(cfg.warranty_years) : null
        const scopeOfWork = cfg.scope_of_work || null
        const existing = existingTiers?.find(t => t.capacity_option_id === capacityId && t.tier === tier)

        if (existing) {
          ops.push(
            serviceClient.from('pricing_tiers')
              .update({ warranty_years: warrantyYears, scope_of_work: scopeOfWork, updated_at: new Date().toISOString() })
              .eq('id', existing.id)
          )
        } else {
          ops.push(
            serviceClient.from('pricing_tiers').insert({
              business_id: businessId, product_id: productId, capacity_option_id: capacityId,
              tier, price: 0, warranty_years: warrantyYears, scope_of_work: scopeOfWork, is_active: true,
            })
          )
        }
      }
    }

    const results = await Promise.all(ops)
    const errors = results.filter((r: { error: unknown }) => r.error)
    if (errors.length > 0) {
      console.error('[system-config/apply-to-all] errors:', errors)
      return NextResponse.json({ error: 'Some updates failed' }, { status: 500 })
    }

    const { data: refreshedTiers } = await serviceClient
      .from('pricing_tiers').select('*').eq('business_id', businessId).eq('product_id', productId)

    return NextResponse.json({ ok: true, tiers: refreshedTiers })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
