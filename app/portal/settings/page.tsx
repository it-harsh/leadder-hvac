import { getPortalBusiness } from '@/lib/portal/get-portal-business'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/portal/settings-form'

export default async function SettingsPage() {
  const { business, supabase, isImpersonating, accessRevoked } = await getPortalBusiness()

  if (!business) {
    redirect(accessRevoked ? '/admin/exit-impersonation' : '/auth/login')
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', business.id)
    .single()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          {isImpersonating
            ? 'Viewing client settings — read-only during support access'
            : 'Manage your business profile and integrations'}
        </p>
      </div>

      {isImpersonating && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          <span>⚠</span>
          <span>Settings are read-only during support access. Changes cannot be saved on behalf of a client.</span>
        </div>
      )}

      <SettingsForm
        business={business}
        settings={settings}
        readOnly={isImpersonating}
      />
    </div>
  )
}
