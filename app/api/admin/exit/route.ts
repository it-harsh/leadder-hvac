import { NextResponse } from 'next/server'

const CLEAR_COOKIE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
}

// POST — called by the Exit button in the impersonation banner
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('leadder_impersonating_business_id', '', CLEAR_COOKIE)
  return response
}

// GET — called by server-side redirect when access is revoked
export async function GET() {
  const response = NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  response.cookies.set('leadder_impersonating_business_id', '', CLEAR_COOKIE)
  return response
}
