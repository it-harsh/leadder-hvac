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
  let email: string, password: string
  try {
    const body = await request.json()
    email = body.email
    password = body.password
    if (!email || !password) throw new Error('Missing email or password')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 4. Create the new user via service role admin API
  const serviceClient = await createServiceClient()
  const { data: createData, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !createData.user) {
    console.error('[create-user] createUser error:', createError?.message)
    return NextResponse.json(
      { error: createError?.message || 'Failed to create user' },
      { status: 500 }
    )
  }

  const newUserId = createData.user.id

  // 5. Insert into platform_admins
  const { error: insertError } = await serviceClient
    .from('platform_admins')
    .insert({ user_id: newUserId, created_by: user.id })

  if (insertError) {
    console.error('[create-user] platform_admins insert error:', insertError.message)
    // Attempt to clean up the auth user if the insert fails
    await serviceClient.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: 'Failed to register admin' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
