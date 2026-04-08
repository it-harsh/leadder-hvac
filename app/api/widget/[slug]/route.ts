import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role to bypass RLS for public widget access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    // Fetch business by slug
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug, primary_color')
      .eq('slug', slug)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Fetch products with capacity options for this business only
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        slug,
        category,
        description,
        icon,
        display_order,
        capacity_options (
          id,
          label,
          value,
          unit,
          display_order,
          is_enabled
        )
      `)
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('display_order')

    // Fetch pricing tiers for this business
    const { data: pricingTiers } = await supabaseAdmin
      .from('pricing_tiers')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)

    // Fetch business settings
    const { data: settings } = await supabaseAdmin
      .from('business_settings')
      .select('widget_enabled, widget_title, widget_subtitle, widget_thank_you_message, price_range_pct, redirect_url, redirect_button_text, financing_enabled, financing_term_months, financing_apr, financing_link_text, financing_link_url')
      .eq('business_id', business.id)
      .single()

    if (settings?.widget_enabled === false) {
      return NextResponse.json({ error: 'Widget is currently disabled' }, { status: 403 })
    }

    // Fetch ALL per-product configs (need is_enabled to filter visibility + pricing modifiers)
    const { data: allProductConfigs } = await supabaseAdmin
      .from('business_product_configs')
      .select('product_id, is_enabled, price_range_pct, multi_unit_discount_pct, attic_additional_cost, basement_additional_cost, closet_additional_cost, garage_additional_cost, crawl_space_additional_cost, heads_2_additional_cost, heads_3_additional_cost, heads_4plus_additional_cost, oil_additional_cost')
      .eq('business_id', business.id)

    // Products are visible unless EXPLICITLY disabled (is_enabled = false)
    // No config entry = default enabled
    const explicitlyDisabledIds = new Set(
      allProductConfigs?.filter(c => c.is_enabled === false).map(c => c.product_id) || []
    )
    // Return ALL active non-disabled products so HVAC flows work even before pricing is set up
    // Strip disabled capacity options from each product
    const visibleProducts = (products || [])
      .filter(p => !explicitlyDisabledIds.has(p.id))
      .map(p => ({
        ...p,
        capacity_options: p.capacity_options.filter(co => co.is_enabled !== false),
      }))

    // Only pass enabled configs as pricing modifiers
    const productConfigs = allProductConfigs?.filter(c => c.is_enabled !== false) || []

    // Fetch tier system configurations (efficiency description per tier)
    const { data: systemConfigs } = await supabaseAdmin
      .from('tier_system_configurations')
      .select('product_id, tier, efficiency_description, image_url')
      .eq('business_id', business.id)

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        primaryColor: business.primary_color,
      },
      products: visibleProducts,
      pricingTiers: pricingTiers || [],
      productConfigs: productConfigs || [],
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
    })
  } catch (error) {
    console.error('Error fetching widget data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
