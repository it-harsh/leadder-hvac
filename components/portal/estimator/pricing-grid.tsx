'use client'

import { useState } from 'react'
import { Product, CapacityOption, PricingTier, TierSystemConfiguration, BusinessProductConfig } from '@/lib/types/database'
import { getSqftRange } from '@/lib/utils/hvac'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, ExternalLink, DollarSign, Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PricingCell } from './pricing-cell'
import { SystemConfigPanel } from './system-config-panel'
import { PricingSettings } from './pricing-settings'
import { LocationAdjustments } from './location-adjustments'
import { MiniSplitHeadsCard } from './mini-split-heads-card'
import { FuelTypeCard } from './fuel-type-card'
import { ProductPricingModal } from './product-pricing-modal'

const supabase = createClient()

interface PricingGridProps {
  product: Product
  capacities: CapacityOption[]
  tiers: PricingTier[]
  systemConfig: TierSystemConfiguration[]
  productConfig: BusinessProductConfig | null
  businessId: string
  businessSlug: string
}

export function PricingGridComponent({
  product,
  capacities,
  tiers,
  systemConfig: initialSystemConfig,
  productConfig: initialProductConfig,
  businessId,
  businessSlug,
}: PricingGridProps) {
  const router = useRouter()

  const [localCapacities, setLocalCapacities] = useState<CapacityOption[]>(capacities)
  const [localTiers, setLocalTiers] = useState<PricingTier[]>(tiers)
  const [localSystemConfig, setLocalSystemConfig] = useState<TierSystemConfiguration[]>(initialSystemConfig)
  const [localProductConfig, setLocalProductConfig] = useState<BusinessProductConfig | null>(initialProductConfig)
  const [pendingChanges, setPendingChanges] = useState<Map<string, number | null>>(new Map())
  const [togglingCapacity, setTogglingCapacity] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)

  const tierOrder: ('good' | 'better' | 'best')[] = ['good', 'better', 'best']
  const tierColors = {
    good: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
    better: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
    best: 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400',
  }
  const tierLabels = { good: 'Good', better: 'Better', best: 'Best' }

  // Capacity toggle
  const handleToggleCapacity = async (capacityId: string, currentEnabled: boolean) => {
    setTogglingCapacity(capacityId)
    try {
      const { error } = await supabase
        .from('capacity_options')
        .update({ is_enabled: !currentEnabled })
        .eq('id', capacityId)
      if (error) throw error
      setLocalCapacities(prev =>
        prev.map(c => c.id === capacityId ? { ...c, is_enabled: !currentEnabled } : c)
      )
      toast.success(!currentEnabled ? 'Capacity enabled' : 'Capacity disabled')
    } catch {
      toast.error('Failed to update capacity')
    } finally {
      setTogglingCapacity(null)
    }
  }

  // Price helpers — use | as separator to avoid UUID dash collisions
  const makeKey = (capacityId: string, tier: string) => `${capacityId}|${tier}`

  const getPrice = (capacityId: string, tier: 'good' | 'better' | 'best'): number | null => {
    const key = makeKey(capacityId, tier)
    if (pendingChanges.has(key)) return pendingChanges.get(key) ?? null
    return localTiers.find(t => t.capacity_option_id === capacityId && t.tier === tier)?.price ?? null
  }

  const handlePriceChange = (capacityId: string, tier: 'good' | 'better' | 'best', price: number | null) => {
    const savedPrice = localTiers.find(t => t.capacity_option_id === capacityId && t.tier === tier)?.price ?? null
    setPendingChanges(prev => {
      const next = new Map(prev)
      if (price === savedPrice) {
        next.delete(makeKey(capacityId, tier))
      } else {
        next.set(makeKey(capacityId, tier), price)
      }
      return next
    })
  }

  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) return
    setIsSaving(true)
    try {
      const updates: any[] = []

      for (const [key, price] of pendingChanges.entries()) {
        const lastPipe = key.lastIndexOf('|')
        const capacityId = key.slice(0, lastPipe)
        const tier = key.slice(lastPipe + 1) as 'good' | 'better' | 'best'

        const existing = localTiers.find(t => t.capacity_option_id === capacityId && t.tier === tier)

        if (existing) {
          if (price !== null) {
            updates.push(
              supabase.from('pricing_tiers')
                .update({ price, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .then(r => r)
            )
          }
        } else if (price !== null) {
          updates.push(
            supabase.from('pricing_tiers').insert({
              business_id: businessId,
              product_id: product.id,
              capacity_option_id: capacityId,
              tier,
              price,
              is_active: true,
            }).then(r => r)
          )
        }
      }

      const results = await Promise.all(updates)
      const errors = results.filter(r => r.error)
      if (errors.length > 0) throw new Error('Some updates failed')

      const { data: updatedTiers } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('business_id', businessId)
        .eq('product_id', product.id)

      if (updatedTiers) setLocalTiers(updatedTiers)
      setPendingChanges(new Map())
      toast.success(`${pendingChanges.size} price${pendingChanges.size > 1 ? 's' : ''} updated`)
    } catch {
      toast.error('Failed to save prices')
    } finally {
      setIsSaving(false)
    }
  }

  const isService = product.category === 'service'
  const isMiniSplit = product.slug === 'mini-split'
  const isPackaged = product.slug === 'packaged-system'
  const hasFuelType = product.slug === 'furnace' || product.slug === 'boiler'
  const showLocationCard = !isMiniSplit && !isPackaged
  const allCapacitiesDisabled = !isService && localCapacities.length > 0 && localCapacities.every(c => !c.is_enabled)

  if (allCapacitiesDisabled) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            All capacities are disabled. Enable at least one to configure pricing.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/portal/estimator')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={() => router.push('/portal/estimator')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

        <div className="flex items-center gap-2">
          {/* Widget preview — Task 10 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/widget/${businessSlug}`, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview Widget
          </Button>

          {!isService && pendingChanges.size > 0 && (
            <Button onClick={handleSaveAll} disabled={isSaving} size="sm">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save {pendingChanges.size} Change{pendingChanges.size > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Service Pricing Card */}
      {isService && (
        <Card>
          <CardHeader>
            <CardTitle>Service Pricing</CardTitle>
            <CardDescription>
              Configure the price and description for this service
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localTiers.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-foreground">
                        ${localTiers[0].price.toFixed(2)}
                      </span>
                    </div>
                    {localTiers[0].scope_of_work && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {localTiers[0].scope_of_work}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPricingModal(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No pricing configured yet
                </p>
                <Button onClick={() => setShowPricingModal(true)}>
                  Configure Pricing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Grid - Hide for services */}
      {!isService && (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-semibold text-foreground bg-muted/50">
                  Tier
                </th>
                {localCapacities.map((capacity) => {
                  const toggling = togglingCapacity === capacity.id
                  return (
                    <th
                      key={capacity.id}
                      className={`p-4 text-center font-semibold text-foreground bg-muted/50 min-w-[150px] ${!capacity.is_enabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span>{capacity.label}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={capacity.is_enabled}
                              onChange={() => handleToggleCapacity(capacity.id, capacity.is_enabled)}
                              disabled={toggling}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary">
                              {toggling && (
                                <Loader2 className="w-3 h-3 absolute top-1 left-1/2 -translate-x-1/2 animate-spin text-white" />
                              )}
                            </div>
                          </label>
                        </div>
                        {(() => {
                          const sqft = getSqftRange(capacity.value, capacity.unit)
                          return sqft ? (
                            <span className="text-xs text-muted-foreground font-normal">{sqft} sq ft</span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-normal">{capacity.value} {capacity.unit}</span>
                          )
                        })()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {tierOrder.map((tier) => (
                <tr key={tier} className="border-b border-border last:border-0">
                  <td className={`p-4 font-semibold ${tierColors[tier]}`}>
                    {tierLabels[tier]}
                  </td>
                  {localCapacities.map((capacity) => {
                    const price = getPrice(capacity.id, tier)
                    const isDisabled = !capacity.is_enabled
                    return (
                      <td
                        key={`${tier}|${capacity.id}`}
                        className={`p-2 ${isDisabled ? 'opacity-50' : ''}`}
                      >
                        <PricingCell
                          price={price}
                          capacityId={capacity.id}
                          tier={tier}
                          disabled={isDisabled}
                          onChange={handlePriceChange}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* Task 5: System Config Panel - Hide for services, they use the simple modal instead */}
      {!isService && (
      <SystemConfigPanel
        businessId={businessId}
        productId={product.id}
        systemConfig={localSystemConfig}
        capacities={localCapacities}
        tiers={localTiers}
        onConfigUpdate={setLocalSystemConfig}
        onTiersUpdate={setLocalTiers}
      />
      )}

      {/* Tasks 6 & 7: Price Range + Multi-Unit Discount - Hide for services */}
      {!isService && (
      <PricingSettings
        businessId={businessId}
        productId={product.id}
        productConfig={localProductConfig}
        onConfigUpdate={setLocalProductConfig}
      />
      )}

      {/* Mini Split: Number of Heads Additional Costs */}
      {!isService && isMiniSplit && (
        <MiniSplitHeadsCard
          businessId={businessId}
          productId={product.id}
          productConfig={localProductConfig}
          onConfigUpdate={setLocalProductConfig}
        />
      )}

      {/* Furnace / Boiler: Fuel Type Price Increase */}
      {!isService && hasFuelType && (
        <FuelTypeCard
          businessId={businessId}
          productId={product.id}
          productConfig={localProductConfig}
          onConfigUpdate={setLocalProductConfig}
        />
      )}

      {/* Location Adjustments — hidden for mini split and packaged system */}
      {!isService && showLocationCard && (
      <LocationAdjustments
        businessId={businessId}
        productId={product.id}
        productConfig={localProductConfig}
        onConfigUpdate={setLocalProductConfig}
      />
      )}

      {/* Service Pricing Modal */}
      {isService && (
        <ProductPricingModal
          product={{ ...product, capacity_options: [] }}
          existingTiers={localTiers}
          businessId={businessId}
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onTiersUpdated={setLocalTiers}
        />
      )}
    </div>
  )
}
