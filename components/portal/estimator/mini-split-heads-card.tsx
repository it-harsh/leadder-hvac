'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BusinessProductConfig } from '@/lib/types/database'

const supabase = createClient()

interface MiniSplitHeadsCardProps {
  businessId: string
  productId: string
  productConfig: BusinessProductConfig | null
  onConfigUpdate: (config: BusinessProductConfig) => void
}

export function MiniSplitHeadsCard({
  businessId,
  productId,
  productConfig,
  onConfigUpdate,
}: MiniSplitHeadsCardProps) {
  const [heads2, setHeads2] = useState(productConfig?.heads_2_additional_cost?.toString() ?? '0')
  const [heads3, setHeads3] = useState(productConfig?.heads_3_additional_cost?.toString() ?? '0')
  const [heads4plus, setHeads4plus] = useState(productConfig?.heads_4plus_additional_cost?.toString() ?? '0')
  const [saving, setSaving] = useState(false)

  const heads2Num = parseFloat(heads2) || 0
  const exampleBase = 4000
  const exampleTotal = heads2Num > 0
    ? `$${(exampleBase + heads2Num).toLocaleString()} ($${exampleBase.toLocaleString()} + $${heads2Num.toLocaleString()})`
    : `$${exampleBase.toLocaleString()}`

  async function save() {
    setSaving(true)
    try {
      const payload = {
        business_id: businessId,
        product_id: productId,
        heads_2_additional_cost: parseFloat(heads2) || 0,
        heads_3_additional_cost: parseFloat(heads3) || 0,
        heads_4plus_additional_cost: parseFloat(heads4plus) || 0,
        updated_at: new Date().toISOString(),
      }

      let result
      if (productConfig) {
        result = await supabase
          .from('business_product_configs')
          .update(payload)
          .eq('id', productConfig.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('business_product_configs')
          .insert({ ...payload, is_enabled: true, price_range_pct: 0, multi_unit_discount_pct: 0 })
          .select()
          .single()
      }

      if (result.error) throw result.error
      onConfigUpdate(result.data)
      toast.success('Heads pricing saved')
    } catch (err) {
      console.error('Error saving heads pricing:', err)
      toast.error('Failed to save heads pricing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Number of Heads Additional Costs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set additional costs (in dollars) based on the number of indoor heads (rooms).
          These amounts are added to the base system price.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 1 Head — display only */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">1 Head (No Additional Cost)</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                value="0"
                disabled
                className="bg-muted/40 opacity-60"
              />
            </div>
          </div>

          {/* 2 Heads */}
          <div className="space-y-1">
            <Label>2 Heads Additional Cost ($)</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={heads2}
                onChange={e => setHeads2(e.target.value)}
              />
            </div>
          </div>

          {/* 3 Heads */}
          <div className="space-y-1">
            <Label>3 Heads Additional Cost ($)</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={heads3}
                onChange={e => setHeads3(e.target.value)}
              />
            </div>
          </div>

          {/* 4+ Heads */}
          <div className="space-y-1">
            <Label>4+ Heads Additional Cost ($)</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={heads4plus}
                onChange={e => setHeads4plus(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Example */}
        <div className="rounded-md bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Example: </span>
          If base price is ${exampleBase.toLocaleString()} and 2 heads additional cost is ${heads2Num > 0 ? heads2Num.toLocaleString() : '250'},
          the total for 2 heads would be{' '}
          {heads2Num > 0 ? exampleTotal : `$4,250 ($4,000 + $250)`}.
        </div>

        <Button onClick={save} disabled={saving} size="sm">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  )
}
