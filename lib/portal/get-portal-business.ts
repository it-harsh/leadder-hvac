import { cookies } from 'next/headers'
import { createClient, createServiceClient, isPlatformAdmin, getUser } from '@/lib/supabase/server'
import { Business } from '@/lib/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

export interface PortalContext {
  business: Business | null
  isImpersonating: boolean
  /** True when impersonation was active but access was revoked — pages should redirect to /admin/exit-impersonation */
  accessRevoked: boolean
  /** Use this client for all data fetches — service role under impersonation, anon otherwise */
  supabase: SupabaseClient
}

export async function getPortalBusiness(): Promise<PortalContext> {
  const user = await getUser()
  if (!user) {
    const supabase = await createClient()
    return { business: null, isImpersonating: false, accessRevoked: false, supabase }
  }

  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATION_COOKIE)?.value

  if (impersonatingId) {
    const isAdmin = await isPlatformAdmin(user.id)
    if (!isAdmin) {
      const supabase = await createClient()
      return { business: null, isImpersonating: false, accessRevoked: true, supabase }
    }

    const serviceClient = await createServiceClient()

    const { data: settings } = await serviceClient
      .from('business_settings')
      .select('support_access_enabled')
      .eq('business_id', impersonatingId)
      .maybeSingle()

    if (!settings?.support_access_enabled) {
      return { business: null, isImpersonating: false, accessRevoked: true, supabase: serviceClient }
    }

    const { data: business } = await serviceClient
      .from('businesses')
      .select('*')
      .eq('id', impersonatingId)
      .maybeSingle()

    if (!business) {
      return { business: null, isImpersonating: false, accessRevoked: true, supabase: serviceClient }
    }

    return { business, isImpersonating: true, accessRevoked: false, supabase: serviceClient }
  }

  // Normal flow
  const supabase = await createClient()
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  return { business: businesses?.[0] ?? null, isImpersonating: false, accessRevoked: false, supabase }
}
