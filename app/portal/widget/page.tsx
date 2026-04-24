import { getPortalBusiness } from '@/lib/portal/get-portal-business'
import { redirect } from 'next/navigation'
import { WidgetEmbedCode } from '@/components/portal/widget-embed-code'

export default async function WidgetPage() {
  const { business } = await getPortalBusiness()

  if (!business) {
    redirect('/auth/login')
  }

  // Get base URL for the widget
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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
