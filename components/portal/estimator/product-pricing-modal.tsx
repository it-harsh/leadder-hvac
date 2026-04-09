'use client'

import { useState, useEffect } from 'react'
import { Product, CapacityOption, PricingTier } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProductWithCapacities extends Product {
  capacity_options: CapacityOption[]
}

interface ProductPricingModalProps {
  product: ProductWithCapacities
  existingTiers: PricingTier[]
  businessId: string
  isOpen: boolean
  onClose: () => void
  onTiersUpdated: (tiers: PricingTier[]) => void
}

interface TierFormData {
  good: { price: string; warranty: string; features: string; scope: string }
  better: { price: string; warranty: string; features: string; scope: string }
  best: { price: string; warranty: string; features: string; scope: string }
}

const DEFAULT_SCOPE = `<p><strong>Site Prep &amp; Demo</strong></p><p>Inspect site and prep area.</p><p>Remove existing HVAC unit(s) if applicable.</p><p><strong>System Installation</strong></p><p>Install air handler/furnace and condenser unit.</p><p>Run refrigerant lines, drain lines, and electrical.</p><p>Modify or connect ductwork as needed.</p><p>Install and program thermostat.</p><p><strong>Startup &amp; Testing</strong></p><p>Pressure test, vacuum, and charge system.</p><p>Test heating/cooling, balance airflow.</p><p>Verify thermostat operation.</p><p><strong>Cleanup &amp; Handover</strong></p><p>Clean work area.</p><p>Provide manuals, warranty info, and usage guidance.</p>`

const defaultTierData = {
  good: {
    price: '',
    warranty: '5',
    features: 'Basic efficiency that meets minimum requirements. Most affordable upfront cost but higher utility bills over time.',
    scope: DEFAULT_SCOPE,
  },
  better: {
    price: '',
    warranty: '10',
    features: 'Balanced efficiency with moderate energy savings. Good compromise between upfront cost and long-term savings.',
    scope: DEFAULT_SCOPE,
  },
  best: {
    price: '',
    warranty: '12',
    features: 'Maximum efficiency with significant energy savings. Higher upfront cost but lowest utility bills and better comfort.',
    scope: DEFAULT_SCOPE,
  },
}

export function ProductPricingModal({
  product,
  existingTiers,
  businessId,
  isOpen,
  onClose,
  onTiersUpdated,
}: ProductPricingModalProps) {
  const [selectedCapacity, setSelectedCapacity] = useState<CapacityOption | null>(null)
  const [formData, setFormData] = useState<TierFormData>(defaultTierData)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const hasCapacities = product.capacity_options && product.capacity_options.length > 0
  const isService = product.category === 'service'

  // Service-specific state
  const [servicePrice, setServicePrice] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')

  // Initialize selected capacity
  useEffect(() => {
    if (hasCapacities && product.capacity_options.length > 0) {
      setSelectedCapacity(product.capacity_options[0])
    } else {
      setSelectedCapacity(null)
    }
  }, [product, hasCapacities])

  // Load existing tier data when capacity changes
  useEffect(() => {
    if (!isOpen) return

    if (isService) {
      // Load service pricing
      const serviceTier = existingTiers.find(t => t.capacity_option_id === null)
      if (serviceTier) {
        setServicePrice(serviceTier.price?.toString() || '')
        setServiceDescription(serviceTier.scope_of_work || '')
      } else {
        setServicePrice('')
        setServiceDescription('')
      }
      return
    }

    const capacityId = selectedCapacity?.id || null
    const tiersForCapacity = existingTiers.filter(
      t => t.capacity_option_id === capacityId
    )

    const newFormData = { ...defaultTierData }
    
    tiersForCapacity.forEach(tier => {
      const tierKey = tier.tier as keyof TierFormData
      newFormData[tierKey] = {
        price: tier.price?.toString() || '',
        warranty: tier.warranty_years?.toString() || '',
        features: Array.isArray(tier.features) ? tier.features.join('\n') : '',
        scope: tier.scope_of_work || '',
      }
    })

    setFormData(newFormData)
  }, [selectedCapacity, existingTiers, isOpen, isService])

  const handleInputChange = (
    tier: keyof TierFormData,
    field: keyof TierFormData['good'],
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isService) {
        // Handle service pricing (simple)
        await supabase
          .from('pricing_tiers')
          .delete()
          .eq('business_id', businessId)
          .eq('product_id', product.id)

        if (servicePrice && parseFloat(servicePrice) > 0) {
          const { data: newTier, error } = await supabase
            .from('pricing_tiers')
            .insert({
              business_id: businessId,
              product_id: product.id,
              capacity_option_id: null,
              tier: 'good',
              price: parseFloat(servicePrice),
              warranty_years: null,
              features: [],
              scope_of_work: serviceDescription || null,
            })
            .select()
            .single()

          if (error) throw error
          onTiersUpdated(newTier ? [newTier] : [])
        } else {
          onTiersUpdated([])
        }

        toast.success('Service pricing saved successfully')
        onClose()
        return
      }

      const capacityId = selectedCapacity?.id || null
      const tiersToUpsert: Array<{
        business_id: string
        product_id: string
        capacity_option_id: string | null
        tier: string
        price: number
        warranty_years: number | null
        features: string[]
        scope_of_work: string | null
      }> = []

      for (const tierKey of ['good', 'better', 'best'] as const) {
        const data = formData[tierKey]
        if (data.price && parseFloat(data.price) > 0) {
          tiersToUpsert.push({
            business_id: businessId,
            product_id: product.id,
            capacity_option_id: capacityId,
            tier: tierKey,
            price: parseFloat(data.price),
            warranty_years: data.warranty ? parseInt(data.warranty) : null,
            features: data.features.split('\n').filter(f => f.trim()),
            scope_of_work: data.scope || null,
          })
        }
      }

      // Delete existing tiers for this product/capacity
      await supabase
        .from('pricing_tiers')
        .delete()
        .eq('business_id', businessId)
        .eq('product_id', product.id)
        .eq('capacity_option_id', capacityId)

      // Insert new tiers
      if (tiersToUpsert.length > 0) {
        const { data: newTiers, error } = await supabase
          .from('pricing_tiers')
          .insert(tiersToUpsert)
          .select()

        if (error) throw error

        // Update parent with new tiers
        const otherTiers = existingTiers.filter(t => t.capacity_option_id !== capacityId)
        onTiersUpdated([...otherTiers, ...(newTiers || [])])
      } else {
        // No tiers to save, just remove existing
        const otherTiers = existingTiers.filter(t => t.capacity_option_id !== capacityId)
        onTiersUpdated(otherTiers)
      }

      toast.success('Pricing saved successfully')
    } catch (error) {
      console.error('Error saving pricing:', error)
      toast.error('Failed to save pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      if (isService) {
        await supabase
          .from('pricing_tiers')
          .delete()
          .eq('business_id', businessId)
          .eq('product_id', product.id)

        onTiersUpdated([])
        setServicePrice('')
        setServiceDescription('')
        toast.success('Service pricing deleted')
        return
      }

      const capacityId = selectedCapacity?.id || null
      
      await supabase
        .from('pricing_tiers')
        .delete()
        .eq('business_id', businessId)
        .eq('product_id', product.id)
        .eq('capacity_option_id', capacityId)

      const otherTiers = existingTiers.filter(t => t.capacity_option_id !== capacityId)
      onTiersUpdated(otherTiers)
      setFormData(defaultTierData)
      
      toast.success('Pricing deleted')
    } catch (error) {
      console.error('Error deleting pricing:', error)
      toast.error('Failed to delete pricing')
    } finally {
      setSaving(false)
    }
  }

  const hasPricing = isService 
    ? !!servicePrice 
    : (formData.good.price || formData.better.price || formData.best.price)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Configure Pricing: {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Simple Service Pricing UI */}
          {isService ? (
            <>
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Service Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-price" className="text-foreground">
                      Price ($)
                    </Label>
                    <Input
                      id="service-price"
                      type="number"
                      placeholder="0.00"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-description" className="text-foreground">
                      Description
                    </Label>
                    <Textarea
                      id="service-description"
                      placeholder="Describe what's included in this service..."
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      rows={6}
                      className="bg-input border-border text-foreground resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      This description will be displayed to customers when they select this service.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions for Service */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                {hasPricing ? (
                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Pricing
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Save Pricing
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Capacity Selection */}
          {hasCapacities && (
            <div className="space-y-3">
              <Label className="text-foreground">Select Capacity</Label>
              <div className="flex flex-wrap gap-2">
                {product.capacity_options
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((capacity) => {
                    const isSelected = selectedCapacity?.id === capacity.id
                    const hasExistingTiers = existingTiers.some(
                      t => t.capacity_option_id === capacity.id
                    )
                    return (
                      <Button
                        key={capacity.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCapacity(capacity)}
                        className={isSelected ? 'bg-primary text-primary-foreground' : ''}
                      >
                        {capacity.label}
                        {hasExistingTiers && !isSelected && (
                          <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary text-xs">
                            Set
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Tier Configuration */}
          <Tabs defaultValue="good" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="good" className="data-[state=active]:bg-background">
                Good
              </TabsTrigger>
              <TabsTrigger value="better" className="data-[state=active]:bg-background">
                Better
              </TabsTrigger>
              <TabsTrigger value="best" className="data-[state=active]:bg-background">
                Best
              </TabsTrigger>
            </TabsList>

            {(['good', 'better', 'best'] as const).map((tier) => (
              <TabsContent key={tier} value={tier} className="mt-4">
                <Card className="bg-muted/30 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground capitalize flex items-center gap-2">
                      {tier} Tier
                      {tier === 'good' && <Badge variant="outline" className="text-xs">Budget</Badge>}
                      {tier === 'better' && <Badge variant="outline" className="text-xs">Recommended</Badge>}
                      {tier === 'best' && <Badge variant="outline" className="text-xs">Premium</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${tier}-price`} className="text-foreground">
                          Price ($)
                        </Label>
                        <Input
                          id={`${tier}-price`}
                          type="number"
                          placeholder="0.00"
                          value={formData[tier].price}
                          onChange={(e) => handleInputChange(tier, 'price', e.target.value)}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${tier}-warranty`} className="text-foreground">
                          Warranty (years)
                        </Label>
                        <Input
                          id={`${tier}-warranty`}
                          type="number"
                          placeholder="5"
                          value={formData[tier].warranty}
                          onChange={(e) => handleInputChange(tier, 'warranty', e.target.value)}
                          className="bg-input border-border text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${tier}-features`} className="text-foreground">
                        Features (one per line)
                      </Label>
                      <Textarea
                        id={`${tier}-features`}
                        placeholder="Standard equipment&#10;Basic installation&#10;1-year labor warranty"
                        value={formData[tier].features}
                        onChange={(e) => handleInputChange(tier, 'features', e.target.value)}
                        rows={4}
                        className="bg-input border-border text-foreground resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Scope of Work</Label>
                      <RichTextEditor
                        value={formData[tier].scope}
                        onChange={(html) => handleInputChange(tier, 'scope', html)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {hasPricing ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={saving}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Pricing
              </Button>
            ) : (
              <div />
            )}
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Pricing
                  </>
                )}
              </Button>
            </div>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
