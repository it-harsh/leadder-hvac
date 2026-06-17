import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { mailtrap, FROM } from '@/lib/email/mailtrap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function generateTempPassword(): string {
  // Avoids visually ambiguous chars (0/O, 1/l/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(12)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

function baseSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50)
}

async function findUniqueSlug(name: string): Promise<string> {
  const base = baseSlug(name)
  const { data } = await supabaseAdmin.from('businesses').select('slug').like('slug', `${base}%`)
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function sendAdminNotification(businessName: string, email: string, tempPassword: string) {
  const raw = process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  if (!raw) return
  const recipients = raw.split(',').map(e => e.trim()).filter(Boolean)
  if (!recipients.length) return
  const [primaryEmail, ...bccEmails] = recipients

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8fc;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;">New Signup Request</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:800;color:#1a1a3e;">Leadder</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Business</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${esc(businessName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${esc(email)}</td></tr>
    </table>
    <div style="margin:24px 0;padding:16px;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#15803d;">Temporary Password</p>
      <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:2px;color:#14532d;font-family:monospace;">${esc(tempPassword)}</p>
    </div>
    <p style="margin:0 0 16px;font-size:12px;color:#9ca3af;">Share these credentials with the user to grant them access.</p>
    <a href="mailto:${esc(email)}?subject=${encodeURIComponent('Your Leadder Login Credentials')}&body=${encodeURIComponent(`Hi,\n\nYour Leadder account is ready. Here are your login credentials:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nSign in at: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.leadder.io'}/auth/login\n\nThanks,\nThe Leadder Team`)}" style="display:inline-block;background:#047857;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Send credentials to user</a>
  </div>
</body></html>`

  await mailtrap.send({
    from: FROM,
    to: [{ email: primaryEmail }],
    ...(bccEmails.length ? { bcc: bccEmails.map(e => ({ email: e })) } : {}),
    subject: `New signup: ${businessName.replace(/[\r\n]/g, ' ')}`,
    html,
    category: 'Transactional',
  })
}

export async function POST(request: Request) {
  try {
    const { businessName, email } = await request.json()

    if (!businessName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const tempPassword = generateTempPassword()

    // Create user via admin API — skips email verification
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { business_name: businessName.trim() },
    })

    if (createError) {
      if (createError.message?.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
      console.error('[sign-up] createUser failed:', createError)
      return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
    }

    const userId = userData.user.id
    const slug = await findUniqueSlug(businessName.trim())

    const { error: bizError } = await supabaseAdmin.rpc('create_business_with_settings', {
      p_owner_id: userId,
      p_name: businessName.trim(),
      p_slug: slug,
      p_email: email.trim(),
    })

    if (bizError) {
      // Roll back user creation if business setup fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('[sign-up] create_business_with_settings failed:', bizError)
      return NextResponse.json({ error: 'Failed to set up business account.' }, { status: 500 })
    }

    // Fire-and-forget — don't block the response
    sendAdminNotification(businessName.trim(), email.trim(), tempPassword).catch(err =>
      console.error('[sign-up] Admin notification failed:', err)
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[sign-up] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
