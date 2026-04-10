import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalSidebar } from '@/components/portal/sidebar'
import { PortalHeader } from '@/components/portal/header'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch the user's business (take the most recent if multiple exist)
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const business = businesses?.[0]

  console.log('[portal/layout] user.id:', user.id, '| business:', business?.id ?? null, '| error:', bizError?.message ?? null)

  if (!business) {
    redirect('/auth/sign-up')
  }

  return (
    <div className="min-h-screen bg-background flex">
      <PortalSidebar business={business} />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader user={user} business={business} />
        <main className="flex-1 p-8 overflow-auto bg-[#f5f6fa] dark:bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
