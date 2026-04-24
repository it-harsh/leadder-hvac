import { getUser, createServiceClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

interface PricingChange {
  capacityId: string
  tier: 'good' | 'better' | 'best'
  price: number | null
  existingTierId?: string
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId, changes } = await request.json() as {
    productId: string
    changes: PricingChange[]
  }

  if (!productId || !Array.isArray(changes)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Resolve business
  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATION_COOKIE)?.value

  let businessId: string

  if (impersonatingId) {
    businessId = impersonatingId
  } else {
    const supabase = await createClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    businessId = business.id
  }

  // Verify product belongs to this business
  const { data: product } = await serviceClient
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (!product) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Apply changes — update existing rows, insert new ones
  const ops: Promise<{ error: unknown }>[] = []

  for (const change of changes) {
    if (change.price === null) continue

    if (change.existingTierId && !change.existingTierId.startsWith('optimistic-')) {
      // Real existing row — update by ID
      ops.push(
        serviceClient
          .from('pricing_tiers')
          .update({ price: change.price, updated_at: new Date().toISOString() })
          .eq('id', change.existingTierId)
      )
    } else {
      // New row — but first check if one already exists (handles optimistic ID edge case)
      const { data: existing } = await serviceClient
        .from('pricing_tiers')
        .select('id')
        .eq('business_id', businessId)
        .eq('product_id', productId)
        .eq('capacity_option_id', change.capacityId)
        .eq('tier', change.tier)
        .maybeSingle()

      if (existing) {
        ops.push(
          serviceClient
            .from('pricing_tiers')
            .update({ price: change.price, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
        )
      } else {
        ops.push(
          serviceClient
            .from('pricing_tiers')
            .insert({
              business_id: businessId,
              product_id: productId,
              capacity_option_id: change.capacityId,
              tier: change.tier,
              price: change.price,
              is_active: true,
            })
        )
      }
    }
  }

  const results = await Promise.all(ops)
  const errors = results.filter((r: { error: unknown }) => r.error)
  if (errors.length > 0) {
    console.error('[pricing-tiers] errors:', errors)
    return NextResponse.json({ error: 'Some updates failed' }, { status: 500 })
  }

  // Return updated tiers for this product
  const { data: updatedTiers } = await serviceClient
    .from('pricing_tiers')
    .select('*')
    .eq('business_id', businessId)
    .eq('product_id', productId)

  return NextResponse.json({ ok: true, tiers: updatedTiers })
}
