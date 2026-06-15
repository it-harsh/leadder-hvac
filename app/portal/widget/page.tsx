import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { WidgetEmbedCode } from '@/components/portal/widget-embed-code'

export default async function WidgetPage() {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
  }
  const supabase = await createClient()

  // Fetch the user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    redirect('/auth/login')
  }

  // Derive base URL from the actual request so local dev points to localhost
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`
  const widgetUrl = `${baseUrl}/widget/${business.slug}`
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border: none; max-width: 100%;"></iframe>`

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Widget Embed</h2>
        <p className="text-muted-foreground mt-1">
          Add the instant quote widget to your website
        </p>
      </div>

      <WidgetEmbedCode 
        widgetUrl={widgetUrl}
        iframeCode={iframeCode}
        businessSlug={business.slug}
      />
    </div>
  )
}
