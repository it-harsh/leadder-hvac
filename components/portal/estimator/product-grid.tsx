'use client'

import { useState } from 'react'
import { Product, CapacityOption, PricingTier, BusinessProductConfig } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Snowflake, 
  Thermometer, 
  Flame, 
  Wind, 
  Zap, 
  Fan, 
  Droplets,
  Wrench,
  Settings,
  Check,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProductWithCapacities extends Product {
  capacity_options: CapacityOption[]
}

interface ProductGridProps {
  products: ProductWithCapacities[]
  existingTiers: PricingTier[]
  productConfigs: BusinessProductConfig[]
  businessId: string
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Snowflake,
  Thermometer,
  Flame,
  Wind,
  Zap,
  Fan,
  Droplets,
  GitBranch: Settings,
  Wrench,
}

export function ProductGrid({ products, existingTiers, productConfigs, businessId }: ProductGridProps) {
  const router = useRouter()
  const [localTiers, setLocalTiers] = useState<PricingTier[]>(existingTiers)
  const [localConfigs, setLocalConfigs] = useState<BusinessProductConfig[]>(productConfigs)
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null)
  
  const getProductTiers = (productId: string) => {
    return localTiers.filter(tier => tier.product_id === productId)
  }

  const isProductConfigured = (productId: string) => {
    return getProductTiers(productId).length > 0
  }

  const getProductConfig = (productId: string) => {
    return localConfigs.find(c => c.product_id === productId)
  }

  const isProductEnabled = (productId: string) => {
    const config = getProductConfig(productId)
    return config?.is_enabled ?? true
  }

  const handleToggleProduct = async (productId: string, currentEnabled: boolean) => {
    setTogglingProduct(productId)
    const newEnabled = !currentEnabled

    try {
      const res = await fetch('/api/portal/product-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: [{ product_id: productId, is_enabled: newEnabled }] }),
      })
      if (!res.ok) throw new Error('Failed to update')

      // Optimistically update local state
      setLocalConfigs(prev => {
        const existing = prev.find(c => c.product_id === productId)
        if (existing) {
          return prev.map(c => c.product_id === productId ? { ...c, is_enabled: newEnabled } : c)
        }
        return [...prev, { id: '', business_id: businessId, product_id: productId, is_enabled: newEnabled } as BusinessProductConfig]
      })

      toast.success(newEnabled ? 'Product enabled' : 'Product disabled')
    } catch (error) {
      console.error('Error toggling product:', error)
      toast.error('Failed to update product')
    } finally {
      setTogglingProduct(null)
    }
  }

  const handleConfigureProduct = (product: ProductWithCapacities) => {
    router.push(`/portal/estimator/${product.slug}/pricing`)
  }

  // Separate equipment and services
  const equipment = products.filter(p => p.category === 'equipment' || p.category === 'hvac')
  const services = products.filter(p => p.category === 'service')

  const renderProductCard = (product: ProductWithCapacities, isService: boolean = false) => {
    const IconComponent = iconMap[product.icon || (isService ? 'Wrench' : 'Settings')] || Settings
    const configured = isProductConfigured(product.id)
    const tierCount = getProductTiers(product.id).length
    const enabled = isProductEnabled(product.id)
    const toggling = togglingProduct === product.id

    return (
      <Card 
        key={product.id} 
        className={`bg-card border-border transition-all ${
          enabled
            ? 'hover:border-primary/50'
            : 'opacity-60'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                enabled 
                  ? 'bg-primary/10 group-hover:bg-primary/20' 
                  : 'bg-muted'
              }`}>
                <IconComponent className={`w-5 h-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-semibold text-foreground">
                  {product.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isService ? 'Service' : `${product.capacity_options?.length || 0} capacities`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {configured && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  <Check className="w-3 h-3 mr-1" />
                  {tierCount}
                </Badge>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleToggleProduct(product.id, enabled)}
                  disabled={toggling}
                  className="sr-only peer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary">
                  {toggling && (
                    <Loader2 className="w-3 h-3 absolute top-1 left-1/2 -translate-x-1/2 animate-spin text-white" />
                  )}
                </div>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
          <Button
            variant={configured ? "secondary" : "default"}
            size="sm"
            className={`w-full ${configured ? 'cursor-pointer' : ''}`}
            disabled={!enabled}
            onClick={(e) => {
              e.stopPropagation()
              handleConfigureProduct(product)
            }}
          >
            {configured ? 'Edit Pricing' : 'Configure'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Equipment Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-foreground">Equipment</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {equipment.map((product) => renderProductCard(product, false))}
        </div>
      </div>

      {/* Services Section */}
      <div className="space-y-5 mt-10">
        <h3 className="text-lg font-semibold text-foreground">Services</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((product) => renderProductCard(product, true))}
        </div>
      </div>
    </>
  )
}
