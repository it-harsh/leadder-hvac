import { getPortalBusiness } from '@/lib/portal/get-portal-business'
import { redirect } from 'next/navigation'
import { ProductGrid } from '@/components/portal/estimator/product-grid'

export default async function EstimatorPage() {
  const { business, supabase, accessRevoked } = await getPortalBusiness()

  if (!business) {
    redirect(accessRevoked ? '/admin/exit-impersonation' : '/auth/login')
  }

  // Fetch all products with capacity options for this business
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      capacity_options (*)
    `)
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('display_order')

  // Fetch existing pricing tiers for this business
  const { data: pricingTiers } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('business_id', business.id)

  // Fetch product configurations for this business
  const { data: productConfigs } = await supabase
    .from('business_product_configs')
    .select('*')
    .eq('business_id', business.id)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Instant Estimator</h2>
        <p className="text-muted-foreground mt-1">
          Configure your Good / Better / Best pricing for each HVAC product and capacity
        </p>
      </div>

      <ProductGrid 
        products={products || []} 
        existingTiers={pricingTiers || []}
        productConfigs={productConfigs || []}
        businessId={business.id}
      />
    </div>
  )
}
