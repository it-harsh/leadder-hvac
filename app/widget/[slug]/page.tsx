'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { WidgetFlow } from '@/components/widget/widget-flow'
import { Loader2 } from 'lucide-react'

interface WidgetData {
  business: {
    id: string
    name: string
    slug: string
    primaryColor: string
  }
  products: Array<{
    id: string
    name: string
    slug: string
    category: string
    description: string
    icon: string
    display_order: number
    capacity_options: Array<{
      id: string
      label: string
      value: string
      unit: string
      display_order: number
    }>
  }>
  pricingTiers: Array<{
    id: string
    product_id: string
    capacity_option_id: string | null
    tier: string
    price: number
    warranty_years: number | null
    features: string[]
    scope_of_work: string | null
  }>
  productConfigs: Array<{
    product_id: string
    price_range_pct: number
    multi_unit_discount_pct: number
    attic_additional_cost: number
    basement_additional_cost: number
    closet_additional_cost: number
    garage_additional_cost: number
    crawl_space_additional_cost: number
  }>
  systemConfigs: Array<{
    product_id: string
    tier: string
    efficiency_description: string | null
    image_url: string | null
    scope_of_work: string | null
  }>
  settings: {
    widget_title: string
    widget_subtitle: string
    widget_thank_you_message: string
    price_range_pct?: number
    redirect_url: string | null
    redirect_button_text: string | null
    financing_enabled: boolean
    financing_term_months: number
    financing_apr: number
    financing_link_text: string | null
    financing_link_url: string | null
  }
}

export default function WidgetPage() {
  const params = useParams()
  const slug = params.slug as string
  const [data, setData] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/widget/${slug}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load')
        }
        const widgetData = await res.json()
        setData(widgetData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background light">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    const isDisabled = error === 'Widget is currently disabled'
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8fc]">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">{isDisabled ? '🔒' : '⚠️'}</span>
          </div>
          <h1 className="text-xl font-semibold text-[#1a1a3e] mb-2">
            {isDisabled ? 'Quote Tool Unavailable' : 'Something went wrong'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isDisabled
              ? 'This quote tool is currently disabled. Please contact us directly for a quote.'
              : 'We couldn\'t load the quote tool. Please try again or contact us directly.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background light">
      <WidgetFlow data={data} />
    </div>
  )
}
