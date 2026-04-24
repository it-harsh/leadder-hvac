export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  primary_color: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  category: 'equipment' | 'service' | 'hvac'
  description: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CapacityOption {
  id: string
  product_id: string
  label: string
  value: string
  unit: string
  display_order: number
  is_enabled: boolean
  created_at: string
}

export interface PricingTier {
  id: string
  business_id: string
  product_id: string
  capacity_option_id: string | null
  tier: 'good' | 'better' | 'best'
  price: number
  warranty_years: number | null
  features: string[]
  scope_of_work: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  business_id: string
  product_id: string | null
  capacity_option_id: string | null
  pricing_tier_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  product_name: string | null
  capacity_label: string | null
  tier_selected: string | null
  quoted_price: number | null
  price_good: number | null
  price_better: number | null
  price_best: number | null
  created_at: string
  updated_at: string
}

export interface BusinessSettings {
  id: string
  business_id: string
  widget_enabled: boolean
  widget_title: string
  widget_subtitle: string
  widget_thank_you_message: string
  price_range_pct: number
  webhook_url: string | null
  redirect_url: string | null
  redirect_button_text: string | null
  financing_enabled: boolean
  financing_term_months: number
  financing_apr: number
  financing_link_text: string | null
  financing_link_url: string | null
  webhook_enabled: boolean
  ghl_enabled: boolean
  ghl_api_key: string | null
  ghl_location_id: string | null
  ghl_pipeline_id: string | null
  ghl_stage_id: string | null
  support_access_enabled: boolean
  created_at: string
  updated_at: string
}

export interface PlatformAdmin {
  id: string
  user_id: string
  created_by: string | null
  created_at: string
}

export interface BusinessProductConfig {
  id: string
  business_id: string
  product_id: string
  is_enabled: boolean
  price_range_pct: number
  multi_unit_discount_pct: number
  attic_additional_cost: number
  basement_additional_cost: number
  closet_additional_cost: number
  garage_additional_cost: number
  crawl_space_additional_cost: number
  heads_2_additional_cost: number
  heads_3_additional_cost: number
  heads_4plus_additional_cost: number
  oil_additional_cost: number
  created_at: string
  updated_at: string
}

export interface TierSystemConfiguration {
  id: string
  business_id: string
  product_id: string
  tier: 'good' | 'better' | 'best'
  efficiency_description: string | null
  warranty_years: number | null
  scope_of_work: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface ProductWithCapacities extends Product {
  capacity_options: CapacityOption[]
}

export interface PricingTierWithRelations extends PricingTier {
  product?: Product
  capacity_option?: CapacityOption
}

export interface LeadWithRelations extends Lead {
  product?: Product
  capacity_option?: CapacityOption
  pricing_tier?: PricingTier
}

export interface PricingGridData {
  product: Product
  capacities: CapacityOption[]
  tiers: PricingTier[]
  systemConfig: TierSystemConfiguration[]
  productConfig: BusinessProductConfig | null
}
