import { getUser, createServiceClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { productId, ...fields } = body

  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

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
      .from('businesses').select('id').eq('owner_id', user.id).single()
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    businessId = business.id
  }

  // Verify product belongs to this business
  const { data: product } = await serviceClient
    .from('products').select('id').eq('id', productId).eq('business_id', businessId).maybeSingle()
  if (!product) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Upsert business_product_configs
  const payload = { business_id: businessId, product_id: productId, updated_at: new Date().toISOString(), ...fields }

  const { data: existing } = await serviceClient
    .from('business_product_configs').select('id').eq('business_id', businessId).eq('product_id', productId).maybeSingle()

  let result
  if (existing) {
    result = await serviceClient
      .from('business_product_configs').update(payload).eq('id', existing.id).select().single()
  } else {
    result = await serviceClient
      .from('business_product_configs')
      .insert({ ...payload, is_enabled: true, price_range_pct: 0, multi_unit_discount_pct: 0 })
      .select().single()
  }

  if (result.error) {
    console.error('[product-config-update]', result.error.message)
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, config: result.data })
}
