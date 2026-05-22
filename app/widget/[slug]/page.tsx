import { createClient } from '@supabase/supabase-js'
import { WidgetFlow } from '@/components/widget/widget-flow'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: business, error: businessError } = await supabaseAdmin
    .from('businesses')
    .select('id, name, slug, primary_color')
    .eq('slug', slug)
    .single()

  if (businessError || !business) {
    return <WidgetError message="We couldn't load the quote tool. Please try again or contact us directly." icon="⚠️" title="Something went wrong" />
  }

  const [
    { data: products },
    { data: pricingTiers },
    { data: settings },
    { data: allProductConfigs },
    { data: systemConfigs },
  ] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select(`id, name, slug, category, description, icon, display_order,
        capacity_options (id, label, value, unit, display_order, is_enabled)`)
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('display_order'),
    supabaseAdmin
      .from('pricing_tiers')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true),
    supabaseAdmin
      .from('business_settings')
      .select('widget_enabled, widget_title, widget_subtitle, widget_thank_you_message, price_range_pct, redirect_url, redirect_button_text, financing_enabled, financing_term_months, financing_apr, financing_link_text, financing_link_url')
      .eq('business_id', business.id)
      .single(),
    supabaseAdmin
      .from('business_product_configs')
      .select('product_id, is_enabled, price_range_pct, multi_unit_discount_pct, attic_additional_cost, basement_additional_cost, closet_additional_cost, garage_additional_cost, crawl_space_additional_cost, heads_2_additional_cost, heads_3_additional_cost, heads_4plus_additional_cost, oil_additional_cost')
      .eq('business_id', business.id),
    supabaseAdmin
      .from('tier_system_configurations')
      .select('product_id, tier, efficiency_description, image_url, scope_of_work')
      .eq('business_id', business.id),
  ])

  if (settings?.widget_enabled === false) {
    return <WidgetError message="This quote tool is currently disabled. Please contact us directly for a quote." icon="🔒" title="Quote Tool Unavailable" />
  }

  const explicitlyDisabledIds = new Set(
    allProductConfigs?.filter(c => c.is_enabled === false).map(c => c.product_id) || []
  )
  const visibleProducts = (products || [])
    .filter(p => !explicitlyDisabledIds.has(p.id))
    .map(p => ({
      ...p,
      capacity_options: p.capacity_options.filter((co: { is_enabled?: boolean }) => co.is_enabled !== false),
    }))

  const data = {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      primaryColor: business.primary_color,
    },
    products: visibleProducts,
    pricingTiers: pricingTiers || [],
    productConfigs: allProductConfigs?.filter(c => c.is_enabled !== false) || [],
    systemConfigs: systemConfigs || [],
    settings: {
      widget_title: settings?.widget_title || 'Get Your Instant Quote',
      widget_subtitle: settings?.widget_subtitle || 'Select your HVAC service to see pricing',
      widget_thank_you_message: settings?.widget_thank_you_message || "Thank you! We'll be in touch soon.",
      price_range_pct: settings?.price_range_pct || 10,
      redirect_url: settings?.redirect_url || null,
      redirect_button_text: settings?.redirect_button_text || null,
      financing_enabled: settings?.financing_enabled ?? false,
      financing_term_months: settings?.financing_term_months ?? 60,
      financing_apr: settings?.financing_apr ?? 0,
      financing_link_text: settings?.financing_link_text || null,
      financing_link_url: settings?.financing_link_url || null,
    },
  }

  return (
    <div className="min-h-screen bg-background light">
      <WidgetFlow data={data} />
    </div>
  )
}

function WidgetError({ message, icon, title }: { message: string; icon: string; title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fc]">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">{icon}</span>
        </div>
        <h1 className="text-xl font-semibold text-[#1a1a3e] mb-2">{title}</h1>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}
