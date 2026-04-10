import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role to bypass RLS for business creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

function baseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

async function findUniqueSlug(name: string): Promise<string> {
  const base = baseSlug(name)
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('slug')
    .like('slug', `${base}%`)
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const { userId, businessName, email } = await request.json()

    if (!userId || !businessName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const slug = await findUniqueSlug(businessName)

    // Wait for user to be fully committed to auth.users (Supabase replication lag)
    // Poll the admin API instead of blindly retrying the insert
    const delays = [500, 1000, 2000, 3000]
    let userConfirmed = false
    for (const delay of delays) {
      await sleep(delay)
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (userData?.user?.id) { userConfirmed = true; break }
    }

    if (!userConfirmed) {
      console.error('User not found in auth.users after waiting:', userId)
      return NextResponse.json({ error: 'Account setup timed out. Please try signing in.' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .rpc('create_business_with_settings', {
        p_owner_id: userId,
        p_name: businessName,
        p_slug: slug,
        p_email: email,
      })

    if (error) {
      if (error.code === '23505' && error.message?.includes('businesses_owner_id_unique')) {
        return NextResponse.json({ error: 'User already has a business' }, { status: 409 })
      }
      console.error('Error creating business:', error)
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
    }

    const businessInfo = data[0]
    return NextResponse.json({
      success: true,
      business: {
        id: businessInfo.business_id,
        name: businessInfo.business_name,
        slug: businessInfo.business_slug,
      }
    })
  } catch (error) {
    console.error('Error in create-business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
