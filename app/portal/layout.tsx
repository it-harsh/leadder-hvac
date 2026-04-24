import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getUser, isPlatformAdmin, createServiceClient, createClient } from '@/lib/supabase/server'
import { PortalSidebar } from '@/components/portal/sidebar'
import { PortalHeader } from '@/components/portal/header'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATION_COOKIE)?.value

  // ── Impersonation path ──────────────────────────────────────────────────────
  if (impersonatingId) {
    // Re-verify: caller must still be a platform admin
    const isAdmin = await isPlatformAdmin(user.id)
    if (!isAdmin) {
      cookieStore.delete(IMPERSONATION_COOKIE)
      redirect('/auth/login')
    }

    const serviceClient = await createServiceClient()

    // Check support_access is still enabled (revocation is immediate)
    const { data: settings } = await serviceClient
      .from('business_settings')
      .select('support_access_enabled')
      .eq('business_id', impersonatingId)
      .maybeSingle()

    if (!settings?.support_access_enabled) {
      // Access revoked — clear impersonation cookie then redirect to admin
      cookieStore.delete(IMPERSONATION_COOKIE)
      redirect('/admin')
    }

    // Resolve the impersonated business
    const { data: business } = await serviceClient
      .from('businesses')
      .select('*')
      .eq('id', impersonatingId)
      .maybeSingle()

    if (!business) {
      cookieStore.delete(IMPERSONATION_COOKIE)
      redirect('/admin')
    }

    console.log('[portal/layout] IMPERSONATING business:', business.id, 'as admin:', user.id)

    return (
      <div className="min-h-screen bg-background">
        <PortalSidebar business={business} isAdmin={false} />
        <div className="ml-64 flex flex-col min-h-screen">
          <ImpersonationBanner businessName={business.name} />
          <PortalHeader user={user} business={business} />
          <main className="flex-1 p-8 bg-[#f5f6fa] dark:bg-background">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // ── Normal path ─────────────────────────────────────────────────────────────

  const isAdmin = await isPlatformAdmin(user.id)

  const supabase = await createClient()

  // Fetch the user's business (most recent if multiple)
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const business = businesses?.[0]

  console.log('[portal/layout] user.id:', user.id, '| business:', business?.id ?? null, '| isAdmin:', isAdmin, '| error:', bizError?.message ?? null)

  if (!business) {
    // Admins with no business go to /admin, regular users to sign-up
    redirect(isAdmin ? '/admin' : '/auth/sign-up')
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar business={business} isAdmin={isAdmin} />
      <div className="ml-64 flex flex-col min-h-screen">
        <PortalHeader user={user} business={business} />
        <main className="flex-1 p-8 bg-[#f5f6fa] dark:bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
