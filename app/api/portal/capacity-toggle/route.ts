import { getUser, createServiceClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { capacityId, isEnabled } = await request.json()
  if (!capacityId || typeof isEnabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Resolve which business this belongs to — impersonation or own
  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATION_COOKIE)?.value

  let businessId: string

  if (impersonatingId) {
    // Under impersonation — use the impersonated business directly
    businessId = impersonatingId
  } else {
    // Normal — resolve via owner_id
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

  // Verify the capacity belongs to a product owned by this business
  const { data: capacity } = await serviceClient
    .from('capacity_options')
    .select('id, product:products(business_id)')
    .eq('id', capacityId)
    .maybeSingle()

  const productBusinessId = (capacity?.product as { business_id: string } | null)?.business_id
  if (!capacity || productBusinessId !== businessId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update via service role — bypasses RLS
  const { error } = await serviceClient
    .from('capacity_options')
    .update({ is_enabled: isEnabled })
    .eq('id', capacityId)

  if (error) {
    console.error('[capacity-toggle] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
