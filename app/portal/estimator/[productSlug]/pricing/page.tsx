import { createClient, getUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PricingGridComponent } from '@/components/portal/estimator/pricing-grid'

interface PricingPageProps {
  params: {
    productSlug: string
  }
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { productSlug } = await params
  
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch the user's business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (businessError || !business) {
    redirect('/auth/login')
  }

  // Fetch the product by slug and business_id
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('slug', productSlug)
    .eq('business_id', business.id)
    .eq('is_active', true)
    .single()

  if (productError || !product) {
    console.error('Product error:', productError)
    notFound()
  }

  // Fetch capacity options for this product
  const { data: capacities, error: capacitiesError } = await supabase
    .from('capacity_options')
    .select('*')
    .eq('product_id', product.id)
    .order('display_order')

  if (capacitiesError) {
    console.error('Error fetching capacities:', capacitiesError)
  }

  // Fetch existing pricing tiers for this product
  const { data: tiers, error: tiersError } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('business_id', business.id)
    .eq('product_id', product.id)

  if (tiersError) {
    console.error('Error fetching tiers:', tiersError)
  }

  // Fetch system configuration for this product
  const { data: systemConfig, error: systemConfigError } = await supabase
    .from('tier_system_configurations')
    .select('*')
    .eq('business_id', business.id)
    .eq('product_id', product.id)

  if (systemConfigError) {
    console.error('Error fetching system config:', systemConfigError)
  }

  // Fetch product configuration
  const { data: productConfig, error: productConfigError } = await supabase
    .from('business_product_configs')
    .select('*')
    .eq('business_id', business.id)
    .eq('product_id', product.id)
    .single()

  if (productConfigError && productConfigError.code !== 'PGRST116') {
    console.error('Error fetching product config:', productConfigError)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{product.name} Pricing</h2>
          <p className="text-muted-foreground mt-1">
            Configure Good / Better / Best pricing for each capacity
          </p>
        </div>
      </div>

      <PricingGridComponent
        product={product}
        capacities={capacities || []}
        tiers={tiers || []}
        systemConfig={systemConfig || []}
        productConfig={productConfig}
        businessId={business.id}
        businessSlug={business.slug}
      />
    </div>
  )
}
