import { getUser, isPlatformAdmin, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const isAdmin = await isPlatformAdmin(user.id)
  if (!isAdmin) {
    redirect('/portal')
  }

  // Check if this admin also has their own business
  const supabase = await createClient()
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  const hasBusiness = (businesses?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar email={user.email!} hasBusiness={hasBusiness} />
      <div className="ml-64 flex flex-col min-h-screen">
        <AdminHeader email={user.email!} />
        <main className="flex-1 p-8 bg-[#f5f6fa] dark:bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
