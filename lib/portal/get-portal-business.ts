import { cookies } from 'next/headers'
import { createClient, createServiceClient, isPlatformAdmin, getUser } from '@/lib/supabase/server'
import { Business } from '@/lib/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

const IMPERSONATION_COOKIE = 'leadder_impersonating_business_id'

export interface PortalContext {
  business: Business | null
  isImpersonating: boolean
  /** Use this client for all data fetches — service role under impersonation, anon otherwise */
  supabase: SupabaseClient
}

/**
 * Resolves the active business and the correct Supabase client for the session.
 *
 * - Impersonating: returns impersonated business + service role client (bypasses RLS)
 * - Normal: returns owned business + anon client (RLS applies as normal)
 *
 * Pages should use the returned `supabase` for all data queries so impersonation
 * can read another user's data without RLS blocking it.
 */
export async function getPortalBusiness(): Promise<PortalContext> {
  const user = await getUser()
  if (!user) {
    const supabase = await createClient()
    return { business: null, isImpersonating: false, supabase }
  }

  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get(IMPERSONATION_COOKIE)?.value

  if (impersonatingId) {
    const isAdmin = await isPlatformAdmin(user.id)
    if (!isAdmin) {
      cookieStore.delete(IMPERSONATION_COOKIE)
      const supabase = await createClient()
      return { business: null, isImpersonating: false, supabase }
    }

    const serviceClient = await createServiceClient()

    const { data: settings } = await serviceClient
      .from('business_settings')
      .select('support_access_enabled')
      .eq('business_id', impersonatingId)
      .maybeSingle()

    if (!settings?.support_access_enabled) {
      cookieStore.delete(IMPERSONATION_COOKIE)
      return { business: null, isImpersonating: false, supabase: serviceClient }
    }

    const { data: business } = await serviceClient
      .from('businesses')
      .select('*')
      .eq('id', impersonatingId)
      .maybeSingle()

    return { business: business ?? null, isImpersonating: true, supabase: serviceClient }
  }

  // Normal flow: use anon client, RLS applies
  const supabase = await createClient()
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  return { business: businesses?.[0] ?? null, isImpersonating: false, supabase }
}
