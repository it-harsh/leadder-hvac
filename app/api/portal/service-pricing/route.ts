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

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, productId, capacityId } = body

  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

  const businessId = await resolveBusinessId(user)
  if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const serviceClient = await createServiceClient()

  // Verify product ownership
  const { data: product } = await serviceClient
    .from('products').select('id').eq('id', productId).eq('business_id', businessId).maybeSingle()
  if (!product) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── save ────────────────────────────────────────────────────
  if (action === 'save') {
    const { tiers: tiersToUpsert } = body

    // Delete existing for this product+capacity combo
    const deleteQuery = serviceClient
      .from('pricing_tiers')
      .delete()
      .eq('business_id', businessId)
      .eq('product_id', productId)

    if (capacityId) {
      await deleteQuery.eq('capacity_option_id', capacityId)
    } else {
      await deleteQuery.is('capacity_option_id', null)
    }

    // Insert new
    let newTiers: unknown[] = []
    if (Array.isArray(tiersToUpsert) && tiersToUpsert.length > 0) {
      const { data, error } = await serviceClient
        .from('pricing_tiers')
        .insert(tiersToUpsert.map((t: Record<string, unknown>) => ({ ...t, business_id: businessId, product_id: productId })))
        .select()

      if (error) {
        console.error('[service-pricing/save]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      newTiers = data ?? []
    }

    return NextResponse.json({ ok: true, tiers: newTiers })
  }

  // ── delete ───────────────────────────────────────────────────
  if (action === 'delete') {
    const deleteQuery = serviceClient
      .from('pricing_tiers')
      .delete()
      .eq('business_id', businessId)
      .eq('product_id', productId)

    if (capacityId) {
      await deleteQuery.eq('capacity_option_id', capacityId)
    } else {
      await deleteQuery.is('capacity_option_id', null)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
