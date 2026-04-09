'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, CopyCheck, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { TierSystemConfiguration, CapacityOption, PricingTier } from '@/lib/types/database'

const supabase = createClient()

interface SystemConfigPanelProps {
  businessId: string
  productId: string
  systemConfig: TierSystemConfiguration[]
  capacities: CapacityOption[]
  tiers: PricingTier[]
  onConfigUpdate: (newConfig: TierSystemConfiguration[]) => void
  onTiersUpdate: (newTiers: PricingTier[]) => void
}

type TierType = 'good' | 'better' | 'best'

const tierColors: Record<TierType, string> = {
  good: 'data-[state=active]:bg-green-500/10 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-400',
  better: 'data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-400',
  best: 'data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400',
}

const TIER_ORDER: TierType[] = ['good', 'better', 'best']

const DEFAULT_SCOPE = `<p><strong>Site Prep &amp; Demo</strong></p><p>Inspect site and prep area.</p><p>Remove existing HVAC unit(s) if applicable.</p><p><strong>System Installation</strong></p><p>Install air handler/furnace and condenser unit.</p><p>Run refrigerant lines, drain lines, and electrical.</p><p>Modify or connect ductwork as needed.</p><p>Install and program thermostat.</p><p><strong>Startup &amp; Testing</strong></p><p>Pressure test, vacuum, and charge system.</p><p>Test heating/cooling, balance airflow.</p><p>Verify thermostat operation.</p><p><strong>Cleanup &amp; Handover</strong></p><p>Clean work area.</p><p>Provide manuals, warranty info, and usage guidance.</p>`

const DEFAULT_EFFICIENCY: Record<TierType, string> = {
  good: 'Basic efficiency that meets minimum requirements. Most affordable upfront cost but higher utility bills over time.',
  better: 'Balanced efficiency with moderate energy savings. Good compromise between upfront cost and long-term savings.',
  best: 'Maximum efficiency with significant energy savings. Higher upfront cost but lowest utility bills and better comfort.',
}

function getConfig(systemConfig: TierSystemConfiguration[], tier: TierType): Partial<TierSystemConfiguration> {
  return systemConfig.find(c => c.tier === tier) ?? {}
}

export function SystemConfigPanel({
  businessId,
  productId,
  systemConfig,
  capacities,
  tiers,
  onConfigUpdate,
  onTiersUpdate,
}: SystemConfigPanelProps) {

  const fileInputRefs = useRef<Record<TierType, HTMLInputElement | null>>({ good: null, better: null, best: null })
  const [uploadingTier, setUploadingTier] = useState<TierType | null>(null)

  // Local editable state per tier
  const [configs, setConfigs] = useState<Record<TierType, {
    efficiency_description: string
    warranty_years: string
    scope_of_work: string
    image_url: string
  }>>({
    good: {
      efficiency_description: getConfig(systemConfig, 'good').efficiency_description || DEFAULT_EFFICIENCY.good,
      warranty_years: getConfig(systemConfig, 'good').warranty_years?.toString() ?? '',
      scope_of_work: getConfig(systemConfig, 'good').scope_of_work || DEFAULT_SCOPE,
      image_url: getConfig(systemConfig, 'good').image_url ?? '',
    },
    better: {
      efficiency_description: getConfig(systemConfig, 'better').efficiency_description || DEFAULT_EFFICIENCY.better,
      warranty_years: getConfig(systemConfig, 'better').warranty_years?.toString() ?? '',
      scope_of_work: getConfig(systemConfig, 'better').scope_of_work || DEFAULT_SCOPE,
      image_url: getConfig(systemConfig, 'better').image_url ?? '',
    },
    best: {
      efficiency_description: getConfig(systemConfig, 'best').efficiency_description || DEFAULT_EFFICIENCY.best,
      warranty_years: getConfig(systemConfig, 'best').warranty_years?.toString() ?? '',
      scope_of_work: getConfig(systemConfig, 'best').scope_of_work || DEFAULT_SCOPE,
      image_url: getConfig(systemConfig, 'best').image_url ?? '',
    },
  })

  const [savingTier, setSavingTier] = useState<TierType | null>(null)
  const [applyingAll, setApplyingAll] = useState(false)

  // Auto-seed default config rows for tiers that have never been saved
  useEffect(() => {
    const missingTiers = TIER_ORDER.filter(tier => !systemConfig.find(c => c.tier === tier))
    if (missingTiers.length === 0) return
    Promise.all(missingTiers.map(tier =>
      supabase.from('tier_system_configurations').insert({
        business_id: businessId,
        product_id: productId,
        tier,
        efficiency_description: DEFAULT_EFFICIENCY[tier],
        scope_of_work: DEFAULT_SCOPE,
      })
    ))
  }, [businessId, productId])

  function updateField(tier: TierType, field: string, value: string) {
    setConfigs(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }))
  }

  async function handleImageUpload(tier: TierType, file: File) {
    setUploadingTier(tier)
    try {
      const ext = file.name.split('.').pop()
      const path = `${businessId}/${productId}/${tier}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('tier-images')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('tier-images').getPublicUrl(path)
      updateField(tier, 'image_url', publicUrl)
      toast.success(`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier image uploaded`)
    } catch (err) {
      console.error('Image upload error:', err)
      toast.error('Failed to upload image')
    } finally {
      setUploadingTier(null)
    }
  }

  async function removeImage(tier: TierType) {
    updateField(tier, 'image_url', '')
  }

  async function saveTierConfig(tier: TierType) {
    setSavingTier(tier)
    try {
      const cfg = configs[tier]
      const payload = {
        business_id: businessId,
        product_id: productId,
        tier,
        efficiency_description: cfg.efficiency_description || null,
        warranty_years: cfg.warranty_years ? parseInt(cfg.warranty_years) : null,
        scope_of_work: cfg.scope_of_work || null,
        image_url: cfg.image_url || null,
        updated_at: new Date().toISOString(),
      }

      const existing = systemConfig.find(c => c.tier === tier)
      let result

      if (existing) {
        result = await supabase
          .from('tier_system_configurations')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('tier_system_configurations')
          .insert(payload)
          .select()
          .single()
      }

      if (result.error) throw result.error

      const updated = systemConfig.filter(c => c.tier !== tier)
      onConfigUpdate([...updated, result.data])
      toast.success(`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier saved`)
    } catch (err) {
      console.error('Error saving tier config:', err)
      toast.error('Failed to save tier configuration')
    } finally {
      setSavingTier(null)
    }
  }

  async function applyToAll() {
    setApplyingAll(true)
    try {
      const enabledCapacities = capacities.filter(c => c.is_enabled)
      if (enabledCapacities.length === 0) {
        toast.error('No enabled capacities to apply to')
        return
      }

      const updates: any[] = []

      for (const capacity of enabledCapacities) {
        for (const tier of TIER_ORDER) {
          const cfg = configs[tier]
          const warrantyYears = cfg.warranty_years ? parseInt(cfg.warranty_years) : null
          const scopeOfWork = cfg.scope_of_work || null

          const existing = tiers.find(
            t => t.capacity_option_id === capacity.id && t.tier === tier
          )

          if (existing) {
            updates.push(
              supabase
                .from('pricing_tiers')
                .update({
                  warranty_years: warrantyYears,
                  scope_of_work: scopeOfWork,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .then(r => r)
            )
          } else {
            updates.push(
              supabase
                .from('pricing_tiers')
                .insert({
                  business_id: businessId,
                  product_id: productId,
                  capacity_option_id: capacity.id,
                  tier,
                  price: 0,
                  warranty_years: warrantyYears,
                  scope_of_work: scopeOfWork,
                  is_active: true,
                })
                .then(r => r)
            )
          }
        }
      }

      const results = await Promise.all(updates)
      const errors = results.filter(r => r.error)
      if (errors.length > 0) throw new Error('Some updates failed')

      // Refresh tiers
      const { data: refreshedTiers } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('business_id', businessId)
        .eq('product_id', productId)

      if (refreshedTiers) onTiersUpdate(refreshedTiers)
      toast.success(`Applied to ${enabledCapacities.length} capacities`)
    } catch (err) {
      console.error('Error applying to all:', err)
      toast.error('Failed to apply configurations')
    } finally {
      setApplyingAll(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">System Configuration</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={applyToAll}
            disabled={applyingAll}
          >
            {applyingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CopyCheck className="w-4 h-4 mr-2" />
            )}
            Apply to All Capacities
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure tier descriptions, warranties, and scope of work. Use "Apply to All" to push to every capacity.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="good">
          <TabsList className="mb-6 w-full grid grid-cols-3 h-auto p-1">
            {TIER_ORDER.map(tier => (
              <TabsTrigger key={tier} value={tier} className={`py-3 text-sm font-semibold ${tierColors[tier]}`}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {TIER_ORDER.map(tier => (
            <TabsContent key={tier} value={tier} className="space-y-8 pt-4">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Efficiency Description</Label>
                  <Input
                    placeholder="e.g. 14 SEER Standard Efficiency"
                    value={configs[tier].efficiency_description}
                    onChange={e => updateField(tier, 'efficiency_description', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warranty (years)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="e.g. 10"
                    value={configs[tier].warranty_years}
                    onChange={e => updateField(tier, 'warranty_years', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Scope of Work</Label>
                <RichTextEditor
                  value={configs[tier].scope_of_work}
                  onChange={html => updateField(tier, 'scope_of_work', html)}
                />
              </div>

              {/* Tier Image */}
              <div className="space-y-3">
                <Label>{tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Image</Label>
                {configs[tier].image_url ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                      <img
                        src={configs[tier].image_url}
                        alt={`${tier} tier`}
                        className="w-full h-64 object-contain p-4"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Shown on the quote results screen</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRefs.current[tier]?.click()}
                          disabled={uploadingTier === tier}
                        >
                          {uploadingTier === tier ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeImage(tier)}
                        >
                          <X className="w-4 h-4 mr-1.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    onClick={() => fileInputRefs.current[tier]?.click()}
                  >
                    {uploadingTier === tier ? (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Upload an image</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Shown on the quote results screen for this tier</p>
                    </div>
                  </div>
                )}
                <input
                  ref={el => { fileInputRefs.current[tier] = el }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(tier, file)
                    e.target.value = ''
                  }}
                />
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  onClick={() => saveTierConfig(tier)}
                  disabled={savingTier === tier}
                  size="sm"
                >
                  {savingTier === tier && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
