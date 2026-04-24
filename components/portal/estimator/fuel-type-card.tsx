'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BusinessProductConfig } from '@/lib/types/database'

interface FuelTypeCardProps {
  businessId: string
  productId: string
  productConfig: BusinessProductConfig | null
  onConfigUpdate: (config: BusinessProductConfig) => void
}

export function FuelTypeCard({
  businessId,
  productId,
  productConfig,
  onConfigUpdate,
}: FuelTypeCardProps) {
  const [oilCost, setOilCost] = useState(productConfig?.oil_additional_cost?.toString() ?? '0')
  const [saving, setSaving] = useState(false)

  async function save() {
    const oil_additional_cost = parseFloat(oilCost) || 0

    // Optimistic update
    onConfigUpdate({
      ...(productConfig ?? { id: 'optimistic', business_id: businessId, product_id: productId, is_enabled: true, price_range_pct: 0, multi_unit_discount_pct: 0, created_at: '', updated_at: '' }),
      oil_additional_cost,
    } as BusinessProductConfig)

    setSaving(true)
    try {
      const res = await fetch('/api/portal/product-config-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, oil_additional_cost }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      const { config } = await res.json()
      onConfigUpdate(config)
      toast.success('Fuel type pricing saved')
    } catch (err) {
      console.error('Error saving fuel type pricing:', err)
      if (productConfig) onConfigUpdate(productConfig)
      toast.error('Failed to save fuel type pricing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Fuel Type Price Increase</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set additional installation costs for oil heating systems. This value is added
          to the base price when the customer selects Oil as their heat source.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 max-w-[200px]">
          <Label>Oil Additional Cost ($)</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input type="number" min="0" step="0.01" placeholder="0" value={oilCost} onChange={e => setOilCost(e.target.value)} />
          </div>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Fuel Pricing
        </Button>
      </CardContent>
    </Card>
  )
}
