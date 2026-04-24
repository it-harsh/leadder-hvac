import { createServiceClient, getUser } from '@/lib/supabase/server'

interface AdminRow {
  id: string
  user_id: string
  created_by: string | null
  created_at: string
  email: string | null
}

export default async function AdminManagementPage() {
  const serviceClient = await createServiceClient()
  const currentUser = await getUser()

  // Fetch all platform admins
  const { data: admins } = await serviceClient
    .from('platform_admins')
    .select('id, user_id, created_by, created_at')
    .order('created_at', { ascending: true })

  // Fetch emails for each admin user from auth.users via admin API
  const adminRows: AdminRow[] = []
  for (const admin of admins ?? []) {
    let email: string | null = null
    try {
      const { data } = await serviceClient.auth.admin.getUserById(admin.user_id)
      email = data.user?.email ?? null
    } catch {
      // ignore
    }
    adminRows.push({ ...admin, email })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Admins</h1>
        <p className="text-muted-foreground mt-1">
          Platform admin accounts with access to the Leadder admin panel
        </p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {adminRows.map(admin => (
              <tr
                key={admin.id}
                className={`bg-card hover:bg-muted/30 transition-colors ${
                  admin.user_id === currentUser?.id ? 'ring-1 ring-inset ring-primary/30' : ''
                }`}
              >
                <td className="px-4 py-3 text-foreground">
                  {admin.email ?? (
                    <span className="text-muted-foreground italic">Unknown</span>
                  )}
                  {admin.user_id === currentUser?.id && (
                    <span className="ml-2 text-xs text-primary font-medium">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                  {admin.user_id}
                </td>
              </tr>
            ))}
            {adminRows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
