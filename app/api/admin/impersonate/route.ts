import { NextRequest, NextResponse } from 'next/server'
import { getUser, isPlatformAdmin, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify platform admin
  const isAdmin = await isPlatformAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Parse request body
  let businessId: string
  try {
    const body = await request.json()
    businessId = body.businessId
    if (!businessId) throw new Error('Missing businessId')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 4. Check support_access_enabled via service role
  const serviceClient = await createServiceClient()
  const { data: settings, error: settingsError } = await serviceClient
    .from('business_settings')
    .select('support_access_enabled')
    .eq('business_id', businessId)
    .maybeSingle()

  if (settingsError) {
    console.error('[impersonate] settings fetch error:', settingsError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!settings?.support_access_enabled) {
    return NextResponse.json(
      { error: 'This client has not enabled support access' },
      { status: 403 }
    )
  }

  // 5. Set impersonation cookie
  const response = NextResponse.json({ ok: true })
  response.cookies.set('leadder_impersonating_business_id', businessId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
