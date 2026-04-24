'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BusinessProductConfig } from '@/lib/types/database'

interface LocationAdjustmentsProps {
  businessId: string
  productId: string
  productConfig: BusinessProductConfig | null
  onConfigUpdate: (config: BusinessProductConfig) => void
}

const LOCATIONS = [
  { key: 'attic_additional_cost', label: 'Attic' },
  { key: 'basement_additional_cost', label: 'Basement' },
  { key: 'closet_additional_cost', label: 'Closet' },
  { key: 'garage_additional_cost', label: 'Garage' },
  { key: 'crawl_space_additional_cost', label: 'Crawl Space' },
] as const

type LocationKey = typeof LOCATIONS[number]['key']

export function LocationAdjustments({
  businessId,
  productId,
  productConfig,
  onConfigUpdate,
}: LocationAdjustmentsProps) {
  const [values, setValues] = useState<Record<LocationKey, string>>({
    attic_additional_cost: productConfig?.attic_additional_cost?.toString() ?? '0',
    basement_additional_cost: productConfig?.basement_additional_cost?.toString() ?? '0',
    closet_additional_cost: productConfig?.closet_additional_cost?.toString() ?? '0',
    garage_additional_cost: productConfig?.garage_additional_cost?.toString() ?? '0',
    crawl_space_additional_cost: productConfig?.crawl_space_additional_cost?.toString() ?? '0',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    const fields = {
      attic_additional_cost: parseFloat(values.attic_additional_cost) || 0,
      basement_additional_cost: parseFloat(values.basement_additional_cost) || 0,
      closet_additional_cost: parseFloat(values.closet_additional_cost) || 0,
      garage_additional_cost: parseFloat(values.garage_additional_cost) || 0,
      crawl_space_additional_cost: parseFloat(values.crawl_space_additional_cost) || 0,
    }

    // Optimistic update
    const optimistic = {
      ...(productConfig ?? { id: 'optimistic', business_id: businessId, product_id: productId, is_enabled: true, price_range_pct: 0, multi_unit_discount_pct: 0, created_at: '', updated_at: '' }),
      ...fields,
    } as BusinessProductConfig
    onConfigUpdate(optimistic)

    setSaving(true)
    try {
      const res = await fetch('/api/portal/product-config-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ...fields }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      const { config } = await res.json()
      onConfigUpdate(config)
      toast.success('Location adjustments saved')
    } catch (err) {
      console.error('Error saving location adjustments:', err)
      if (productConfig) onConfigUpdate(productConfig)
      toast.error('Failed to save location adjustments')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Location Adjustments</CardTitle>
        <p className="text-sm text-muted-foreground">
          Additional cost added to the base price based on installation location.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATIONS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input type="number" min="0" step="0.01" placeholder="0" value={values[key]} onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))} />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Adjustments
        </Button>
      </CardContent>
    </Card>
  )
}
