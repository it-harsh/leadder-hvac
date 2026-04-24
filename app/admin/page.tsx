import { createServiceClient, getUser } from '@/lib/supabase/server'
import { AdminClientTable } from '@/components/admin/client-table'

export default async function AdminClientListPage() {
  const [serviceClient, currentUser] = await Promise.all([
    createServiceClient(),
    getUser(),
  ])

  // Fetch all businesses with their support_access_enabled setting
  const { data: businesses } = await serviceClient
    .from('businesses')
    .select(`
      id,
      owner_id,
      name,
      slug,
      created_at,
      business_settings ( support_access_enabled )
    `)
    .order('created_at', { ascending: false })

  // Fetch owner emails from auth.users via service role admin API
  const ownerIds = [...new Set((businesses ?? []).map(b => b.owner_id))]
  const emailMap: Record<string, string> = {}
  await Promise.all(
    ownerIds.map(async (uid) => {
      const { data } = await serviceClient.auth.admin.getUserById(uid)
      if (data.user?.email) emailMap[uid] = data.user.email
    })
  )

  const rows = (businesses ?? []).map(b => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    created_at: b.created_at,
    email: emailMap[b.owner_id] ?? null,
    isOwn: b.owner_id === currentUser?.id,
    support_access_enabled:
      (b.business_settings as { support_access_enabled: boolean } | null)
        ?.support_access_enabled ?? false,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Client Businesses</h1>
        <p className="text-muted-foreground mt-1">
          {rows.length} total client{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      <AdminClientTable businesses={rows} />
    </div>
  )
}
