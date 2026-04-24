import { getPortalBusiness } from '@/lib/portal/get-portal-business'
import { redirect } from 'next/navigation'
import { LeadsTable } from '@/components/portal/leads-table'

export default async function LeadsPage() {
  const { business, supabase } = await getPortalBusiness()

  if (!business) {
    redirect('/auth/login')
  }

  // Fetch leads for this business
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leads</h2>
          <p className="text-muted-foreground mt-1">
            Manage your quote requests and customer leads
          </p>
        </div>
      </div>

      <LeadsTable leads={leads || []} />
    </div>
  )
}
