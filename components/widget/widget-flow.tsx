'use client'

import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { getSqftRange } from '@/lib/utils/hvac'
import {
  Check, ArrowLeft, Loader2,
  User, Mail, Phone, MapPin,
  Snowflake, Thermometer, Flame, Wind, Zap, Fan, Droplets, Wrench, Settings,
  Home, Building2, DoorOpen, ArrowDownToLine, MoveDown, Activity, Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductConfig {
  product_id: string
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
}

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
  productConfigs: ProductConfig[]
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

type Tab = 'hvac' | 'services'
type SystemType = 'heating_cooling' | 'heating' | 'ac'
type HeatSource = 'gas' | 'electric' | 'oil' | 'dual_fuel'
type Step = 'system_type' | 'heat_source' | 'system_config' | 'capacity' | 'num_heads' | 'location' | 'qty' | 'contact' | 'confirmation'

type Product = WidgetData['products'][0]
type PricingTier = WidgetData['pricingTiers'][0]

type ConfigOption = {
  key: string
  label: string
  desc: string
  Icon: React.ComponentType<{ className?: string }>
  findProduct: (products: Product[]) => Product | undefined
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONF_TIER_STYLES: Record<string, { badge: string; headerBg: string; priceCls: string }> = {
  good:   { badge: 'bg-green-100 text-green-700',  headerBg: 'bg-green-50  border-green-200',  priceCls: 'text-green-700'  },
  better: { badge: 'bg-amber-100 text-amber-700',  headerBg: 'bg-amber-50  border-amber-200',  priceCls: 'text-amber-700'  },
  best:   { badge: 'bg-blue-100  text-blue-700',   headerBg: 'bg-blue-50   border-blue-200',   priceCls: 'text-blue-700'   },
}

const LOCATION_OPTIONS = [
  { key: 'attic',       label: 'Attic',       description: 'Indoor unit in the attic space',   Icon: Home },
  { key: 'garage',      label: 'Garage',      description: 'Indoor unit in the garage area',   Icon: Building2 },
  { key: 'closet',      label: 'Closet',      description: 'Indoor unit in a closet',          Icon: DoorOpen },
  { key: 'basement',    label: 'Basement',    description: 'Indoor unit in the basement',      Icon: ArrowDownToLine },
  { key: 'crawl_space', label: 'Crawl Space', description: 'Indoor unit in the crawl space',  Icon: MoveDown },
]

const SYSTEM_TYPE_OPTIONS: Array<{ key: SystemType; label: string; desc: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'heating_cooling', label: 'Heating & Cooling System', desc: 'Replace entire HVAC system',       Icon: Home },
  { key: 'heating',         label: 'Heating System',           desc: 'Install or replace heating only',  Icon: Flame },
  { key: 'ac',              label: 'A/C System',               desc: 'Install or replace your A/C',      Icon: Snowflake },
]

const HEAT_SOURCE_OPTIONS: Record<string, Array<{ key: HeatSource; label: string; desc: string; Icon: React.ComponentType<{ className?: string }> }>> = {
  heating_cooling: [
    { key: 'gas',       label: 'Gas',       desc: 'Natural gas or propane',         Icon: Flame },
    { key: 'electric',  label: 'Electric',  desc: 'Electric heat pump',             Icon: Zap },
    { key: 'dual_fuel', label: 'Dual Fuel', desc: 'Heat pump + gas furnace',        Icon: Settings },
  ],
  heating: [
    { key: 'gas',       label: 'Gas',       desc: 'Natural gas or propane',         Icon: Flame },
    { key: 'electric',  label: 'Electric',  desc: 'Electric heat pump',             Icon: Zap },
    { key: 'oil',       label: 'Oil',       desc: 'Oil-fired heating systems',      Icon: Droplets },
    { key: 'dual_fuel', label: 'Dual Fuel', desc: 'Heat pump + gas furnace',        Icon: Settings },
  ],
}

const SYSTEM_CONFIG_OPTIONS: Record<string, ConfigOption[]> = {
  heating_cooling_gas: [
    {
      key: 'split',
      label: 'Split System',
      desc: 'Traditional split A/C with gas furnace',
      Icon: Flame,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('gas furnace')),
    },
    {
      key: 'packaged',
      label: 'Packaged Unit',
      desc: 'All-in-one outdoor unit with gas heat',
      Icon: Settings,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('packaged')),
    },
  ],
  heating_cooling_electric: [
    {
      key: 'heat_pump',
      label: 'Split System Heat Pump',
      desc: 'Air-source heat pump with air handler',
      Icon: Zap,
      findProduct: ps => ps.find(p =>
        p.name.toLowerCase().includes('heat pump') &&
        !p.name.toLowerCase().includes('dual') &&
        !p.name.toLowerCase().includes('cooling only')
      ),
    },
    {
      key: 'mini_split',
      label: 'Mini Split',
      desc: 'Ductless system for zoned comfort',
      Icon: Snowflake,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('mini split')),
    },
    {
      key: 'packaged',
      label: 'Packaged Unit',
      desc: 'All-in-one outdoor unit with electric heat',
      Icon: Settings,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('packaged')),
    },
  ],
  heating_gas: [
    {
      key: 'furnace',
      label: 'Furnace',
      desc: 'Gas furnace for forced-air heating',
      Icon: Flame,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('furnace') && !p.name.toLowerCase().includes('split')),
    },
    {
      key: 'boiler',
      label: 'Boiler',
      desc: 'Hydronic heating with radiators',
      Icon: Droplets,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('boiler')),
    },
  ],
  heating_electric: [
    {
      key: 'heat_pump',
      label: 'Heat Pump',
      desc: 'Air-source heat pump for efficient heating',
      Icon: Zap,
      findProduct: ps => ps.find(p =>
        p.name.toLowerCase().includes('heat pump') &&
        !p.name.toLowerCase().includes('dual') &&
        !p.name.toLowerCase().includes('cooling only')
      ),
    },
    {
      key: 'mini_split',
      label: 'Mini Split',
      desc: 'Ductless mini split for zoned heating',
      Icon: Snowflake,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('mini split')),
    },
  ],
  heating_oil: [
    {
      key: 'furnace',
      label: 'Furnace',
      desc: 'Oil-fired furnace for forced-air heating',
      Icon: Flame,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('furnace') && !p.name.toLowerCase().includes('split')),
    },
    {
      key: 'boiler',
      label: 'Boiler',
      desc: 'Oil-fired boiler for hydronic heating',
      Icon: Droplets,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('boiler')),
    },
  ],
  ac: [
    {
      key: 'standard',
      label: 'Standard A/C System',
      desc: 'Central air conditioning, cooling only',
      Icon: Snowflake,
      findProduct: ps => ps.find(p => p.name.toLowerCase().includes('cooling only')),
    },
    {
      key: 'heat_strips',
      label: 'A/C with Heat Strips',
      desc: 'Central A/C with electric heat strips',
      Icon: Zap,
      findProduct: ps => ps.find(p =>
        p.name.toLowerCase().includes('heat pump') &&
        !p.name.toLowerCase().includes('dual') &&
        !p.name.toLowerCase().includes('cooling only')
      ),
    },
  ],
}

const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Snowflake, Thermometer, Flame, Wind, Zap, Fan, Droplets, Wrench, Settings,
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function SelectCard({ selected, onClick, icon: IconComp, title, description, children }: {
  selected: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 rounded-2xl border-2 bg-white px-4 py-4 text-left transition-all hover:border-indigo-400 ${
        selected ? 'border-indigo-600 shadow-sm' : 'border-gray-200'
      }`}
    >
      {IconComp && (
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <IconComp className="w-6 h-6 text-indigo-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-[#1a1a3e] text-sm leading-snug">{title}</p>}
        {description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
        {children}
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  )
}

function FormInput({ icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        {...props}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a3e] placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}

// ─── Financing helpers ────────────────────────────────────────────────────────

function calcMonthly(price: number, termMonths: number, apr: number): number {
  if (apr <= 0) return price / termMonths
  const r = apr / 100 / 12
  return price * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1)
}

function formatMonthly(amount: number): string {
  return '$' + Math.ceil(amount).toLocaleString() + '/mo'
}

// ─── Phone Input with Country Code ───────────────────────────────────────────

const COUNTRIES = [
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore' },
]

function PhoneInput({ value, onChange }: { value: string; onChange: (full: string) => void }) {
  const [selected, setSelected] = useState(COUNTRIES[0])
  const [number, setNumber] = useState('')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectCountry(c: typeof COUNTRIES[0]) {
    setSelected(c)
    setOpen(false)
    setSearch('')
    onChange(`${c.dial}${number}`)
  }

  function handleNumber(e: React.ChangeEvent<HTMLInputElement>) {
    const n = e.target.value
    setNumber(n)
    onChange(`${selected.dial}${n}`)
  }

  const filtered = search
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search))
    : COUNTRIES

  return (
    <div className="relative flex rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent" ref={ref}>
      {/* Country picker trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 pl-3 pr-2 py-3 text-sm text-[#1a1a3e] shrink-0 border-r border-gray-200 hover:bg-gray-50 rounded-l-xl transition-colors"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-medium text-xs text-gray-500">{selected.dial}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* Number input */}
      <input
        type="tel"
        required
        placeholder="Phone number"
        value={number}
        onChange={handleNumber}
        className="flex-1 pl-3 pr-4 py-3 text-sm text-[#1a1a3e] placeholder-gray-400 bg-transparent focus:outline-none rounded-r-xl"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-indigo-50 text-left transition-colors ${selected.code === c.code ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-[#1a1a3e]'}`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-gray-400 text-xs shrink-0">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WidgetFlow({ data }: { data: WidgetData }) {
  // Guided-flow state
  const [activeTab, setActiveTab]       = useState<Tab>('hvac')
  const [introActive, setIntroActive]   = useState(true)
  const [systemType, setSystemType]     = useState<SystemType | null>(null)
  const [heatSource, setHeatSource]     = useState<HeatSource | null>(null)
  const [systemConfig, setSystemConfig] = useState<string | null>(null)
  const [step, setStep]                 = useState<Step>('system_type')

  // Product / form state
  const [selectedProduct, setSelectedProduct]   = useState<Product | null>(null)
  const [selectedCapacity, setSelectedCapacity] = useState<{ id: string; label: string; value: string; unit: string; sqft: string | null } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [numHeads, setNumHeads]                 = useState(1)
  const [unitQty, setUnitQty]                   = useState(1)
  const [selectedTier, setSelectedTier]         = useState<PricingTier | null>(null)
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [address, setAddress]     = useState('')
  const [city, setCity]           = useState('')
  const [addrState, setAddrState] = useState('')
  const [zip, setZip]             = useState('')
  const [consent, setConsent]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [scopeExpanded, setScopeExpanded] = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getProductConfig = (productId: string) =>
    data.productConfigs?.find(c => c.product_id === productId)

  const getEfficiencyDescription = (productId: string, tier: string) =>
    data.systemConfigs?.find(c => c.product_id === productId && c.tier === tier)?.efficiency_description ?? null

  const getTierImage = (productId: string, tier: string) =>
    data.systemConfigs?.find(c => c.product_id === productId && c.tier === tier)?.image_url ?? null

  const getScopeOfWork = (productId: string, tier: string) =>
    data.systemConfigs?.find(c => c.product_id === productId && c.tier === tier)?.scope_of_work ?? null

  const getLocationCost = (productId: string, location: string): number => {
    const cfg = getProductConfig(productId)
    if (!cfg || !location) return 0
    const map: Record<string, number> = {
      attic: cfg.attic_additional_cost, basement: cfg.basement_additional_cost,
      closet: cfg.closet_additional_cost, garage: cfg.garage_additional_cost,
      crawl_space: cfg.crawl_space_additional_cost,
    }
    return map[location] ?? 0
  }

  const getHeadsCost = (productId: string, heads: number): number => {
    const cfg = getProductConfig(productId)
    if (!cfg || heads <= 1) return 0
    if (heads === 2) return cfg.heads_2_additional_cost ?? 0
    if (heads === 3) return cfg.heads_3_additional_cost ?? 0
    return cfg.heads_4plus_additional_cost ?? 0
  }

  const calcAdjustedPrice = (price: number): number => {
    const cfg = selectedProduct ? getProductConfig(selectedProduct.id) : undefined
    const isMiniSplit = selectedProduct?.slug === 'mini-split'
    const isPackaged = selectedProduct?.slug === 'packaged-system'
    const locationCost = selectedProduct && !isMiniSplit && !isPackaged
      ? getLocationCost(selectedProduct.id, selectedLocation) : 0
    const headsCost = selectedProduct && isMiniSplit
      ? getHeadsCost(selectedProduct.id, numHeads) : 0
    const oilCost = heatSource === 'oil' && selectedProduct
      ? (getProductConfig(selectedProduct.id)?.oil_additional_cost ?? 0) : 0
    const discountPct = cfg?.multi_unit_discount_pct ?? 0
    let base = price + locationCost + headsCost + oilCost
    if (unitQty > 1 && discountPct > 0) base = base * unitQty * (1 - discountPct / 100)
    else if (unitQty > 1) base = base * unitQty
    return Math.round(base)
  }

  const formatPrice = (price: number): string => {
    const cfg = selectedProduct ? getProductConfig(selectedProduct.id) : undefined
    const pct = cfg?.price_range_pct || data.settings.price_range_pct || 10
    const base = calcAdjustedPrice(price)
    if (pct > 0) {
      const high = Math.round(base * (1 + pct / 100))
      return `$${base.toLocaleString()} – $${high.toLocaleString()}`
    }
    return `$${base.toLocaleString()}`
  }

  const formatServicePrice = (productId: string): string | null => {
    const tier = data.pricingTiers.find(t => t.product_id === productId && t.capacity_option_id === null)
    if (!tier) return null
    const pct = data.settings.price_range_pct || 10
    if (pct > 0) return `$${tier.price.toLocaleString()} – $${Math.round(tier.price * (1 + pct / 100)).toLocaleString()}`
    return `$${tier.price.toLocaleString()}`
  }

  const getTiersForSelection = () => {
    if (!selectedProduct) return []
    const filtered = data.pricingTiers
      .filter(t => {
        if (t.product_id !== selectedProduct.id) return false
        return selectedCapacity ? t.capacity_option_id === selectedCapacity.id : t.capacity_option_id === null
      })
      .sort((a, b) => ({ good: 0, better: 1, best: 2 }[a.tier as 'good'|'better'|'best'] ?? 0) -
                      ({ good: 0, better: 1, best: 2 }[b.tier as 'good'|'better'|'best'] ?? 0))
    
    // Debug logging
    if (filtered.length === 0) {
      console.log('No tiers found:', {
        selectedProduct: selectedProduct.id,
        selectedCapacity: selectedCapacity?.id,
        allTiers: data.pricingTiers.filter(t => t.product_id === selectedProduct.id)
      })
    }
    
    return filtered
  }

  const getConfigOptions = (): ConfigOption[] => {
    if (!systemType) return []
    if (systemType === 'ac') return SYSTEM_CONFIG_OPTIONS['ac'] ?? []
    if (!heatSource || heatSource === 'dual_fuel') return []
    return SYSTEM_CONFIG_OPTIONS[`${systemType}_${heatSource}`] ?? []
  }

  // ── Step management ───────────────────────────────────────────────────────────

  const getActiveSteps = (): Step[] => {
    if (activeTab === 'services') return ['contact', 'confirmation']
    const steps: Step[] = ['system_type']
    if (systemType === 'heating_cooling' || systemType === 'heating') {
      steps.push('heat_source')
      if (heatSource && heatSource !== 'dual_fuel') steps.push('system_config')
    } else if (systemType === 'ac') {
      steps.push('system_config')
    }
    if (selectedProduct) {
      const isService = selectedProduct.category === 'service'
      const isMiniSplit = selectedProduct.slug === 'mini-split'
      const isPackaged = selectedProduct.slug === 'packaged-system'
      if (selectedProduct.capacity_options?.length) steps.push('capacity')
      if (isMiniSplit) steps.push('num_heads')
      if (!isService && !isMiniSplit && !isPackaged) steps.push('location')
      if (!isService) steps.push('qty')
    }
    steps.push('contact', 'confirmation')
    return steps
  }

  const advanceFrom = (currentStep: Step, explicitSteps?: Step[]) => {
    const steps = explicitSteps ?? getActiveSteps()
    const idx = steps.indexOf(currentStep)
    if (idx >= 0 && idx < steps.length - 1) setStep(steps[idx + 1])
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const resetProductState = () => {
    setSelectedProduct(null); setSelectedCapacity(null)
    setSelectedLocation(''); setNumHeads(1); setUnitQty(1); setSelectedTier(null); setScopeExpanded(false)
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setIntroActive(true)
    setSystemType(null); setHeatSource(null); setSystemConfig(null)
    resetProductState()
    setFullName(''); setEmail(''); setPhone('')
    setAddress(''); setCity(''); setAddrState(''); setZip('')
    setConsent(false); setSubmitting(false); setSubmitted(false)
    setStep('system_type')
  }

  const handleSystemTypeSelect = (type: SystemType) => {
    setSystemType(type); setHeatSource(null); setSystemConfig(null)
    resetProductState()
  }

  const handleHeatSourceSelect = (source: HeatSource) => {
    setHeatSource(source); setSystemConfig(null)
    resetProductState()
    if (source === 'dual_fuel') {
      const product = data.products.find(p => p.name.toLowerCase().includes('dual fuel'))
      if (product) {
        setSelectedProduct(product)
      }
    }
  }

  const handleSystemConfigSelect = (configKey: string) => {
    const opt = getConfigOptions().find(o => o.key === configKey)
    const product = opt?.findProduct(data.products) ?? null
    setSystemConfig(configKey); setSelectedProduct(product)
    setSelectedCapacity(null); setSelectedLocation(''); setUnitQty(1)
    if (!product) { setStep('contact'); return }
  }

  const handleServiceSelect = (service: Product) => {
    const tier = data.pricingTiers.find(t => t.product_id === service.id && t.capacity_option_id === null) ?? null
    setSelectedProduct(service); setSelectedTier(tier); setStep('contact')
  }

  const handleBack = () => {
    if (activeTab === 'services') {
      setSelectedProduct(null); setSelectedTier(null); return
    }
    const activeSteps = getActiveSteps()
    const currentIndex = activeSteps.indexOf(step)
    if (currentIndex <= 0) {
      // Back from system_type → intro
      setIntroActive(true); return
    }
    const prevStep = activeSteps[currentIndex - 1]
    switch (prevStep) {
      case 'system_type':  setHeatSource(null); setSystemConfig(null); resetProductState(); break
      case 'heat_source':  setSystemConfig(null); resetProductState(); break
      case 'system_config': setSelectedProduct(null); setSelectedCapacity(null); setSelectedLocation(''); setUnitQty(1); break
      case 'capacity':     setSelectedCapacity(null); setNumHeads(1); setSelectedLocation(''); setUnitQty(1); break
      case 'num_heads':    setNumHeads(1); setSelectedLocation(''); setUnitQty(1); break
      case 'location':     setSelectedLocation(''); setUnitQty(1); break
      case 'qty':          setUnitQty(1); break
    }
    setStep(prevStep)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) return
    setSubmitting(true)
    setSubmitError(null)
    const parts = fullName.trim().split(' ')
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ') || parts[0]
    const isService = selectedProduct?.category === 'service'
    let priceGood: number | null = null, priceBetter: number | null = null, priceBest: number | null = null
    let quotedPrice: number | null = null, tierSelected: string | null = null, pricingTierId: string | null = null
    if (isService && selectedTier) {
      quotedPrice = calcAdjustedPrice(selectedTier.price)
      tierSelected = selectedTier.tier; pricingTierId = selectedTier.id
    } else if (!isService) {
      const tiers = getTiersForSelection()
      const tm = Object.fromEntries(tiers.map(t => [t.tier, t]))
      priceGood   = tm.good   ? calcAdjustedPrice(tm.good.price)   : null
      priceBetter = tm.better ? calcAdjustedPrice(tm.better.price) : null
      priceBest   = tm.best   ? calcAdjustedPrice(tm.best.price)   : null
    }
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: data.business.id, productId: selectedProduct?.id,
          capacityOptionId: selectedCapacity?.id, pricingTierId,
          productName: selectedProduct?.name, capacityLabel: selectedCapacity?.label,
          tierSelected, quotedPrice, priceGood, priceBetter, priceBest,
          firstName, lastName, email, phone,
          address: address || null, city: city || null, state: addrState || null, zip: zip || null,
        }),
      })
      if (res.ok) { setSubmitted(true); setStep('confirmation') }
      else { setSubmitError('Something went wrong. Please try again.') }
    } catch (err) {
      console.error('Error submitting lead:', err)
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────────────

  const activeSteps = getActiveSteps()
  const currentStepIndex = activeSteps.indexOf(step)
  const totalSteps = activeSteps.length - 1
  const progress = step === 'confirmation' ? 100
    : currentStepIndex >= 0 && totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

  const canContinue = (() => {
    switch (step) {
      case 'system_type': return !!systemType
      case 'heat_source': return !!heatSource
      case 'system_config': return !!systemConfig
      case 'capacity': return !!selectedCapacity
      case 'num_heads': return numHeads > 0
      case 'location': return !!selectedLocation
      case 'qty': return unitQty > 0
      default: return false
    }
  })()

  const selectionSummary: string[] = (() => {
    const parts: string[] = []
    if (systemType) {
      const opt = SYSTEM_TYPE_OPTIONS.find(o => o.key === systemType)
      if (opt) parts.push(opt.label)
    }
    if (heatSource) {
      const opts = HEAT_SOURCE_OPTIONS[systemType ?? ''] ?? []
      const opt = opts.find(o => o.key === heatSource)
      if (opt) parts.push(opt.label)
    }
    if (systemConfig) {
      const opt = getConfigOptions().find(o => o.key === systemConfig)
      if (opt) parts.push(opt.label)
    }
    if (selectedCapacity) {
      const sqft = selectedCapacity.sqft
      parts.push(sqft ? `${sqft} sq ft` : selectedCapacity.label)
    }
    if (numHeads && numHeads > 1) parts.push(`${numHeads} heads`)
    if (selectedLocation) {
      const loc = LOCATION_OPTIONS.find(l => l.key === selectedLocation)
      if (loc) parts.push(loc.label)
    }
    return parts
  })()

  const NOT_SURE_HINTS: Partial<Record<Step, string>> = {
    system_type: 'Most homeowners replacing an existing system should choose Replacement. Choose New Installation only if no system exists.',
    heat_source: 'Natural gas is the most common heating source. If you only have an outdoor heat pump unit, choose Electric.',
    system_config: 'Most homes with existing ductwork use a Split System. Choose Packaged Unit if you have an all-in-one outdoor system.',
    capacity: 'Not sure of your system size? A 2,000–2,500 sq ft home typically needs a 3–4 ton system.',
    num_heads: 'Each room or zone gets its own indoor unit for independent temperature control.',
    location: 'The attic is the most common placement for the air handler. Choose where it will be most accessible.',
    qty: 'Most homeowners replace one unit at a time. Select more if replacing multiple systems at once.',
  }

  const serviceProducts = data.products.filter(p =>
    p.category === 'service' &&
    data.pricingTiers.some(t => t.product_id === p.id)
  )
  const showBack = !introActive && (
    activeTab === 'services'
      ? !!selectedProduct && step !== 'confirmation'
      : step !== 'confirmation'
  )

  const inStepFlow = !introActive && step !== 'confirmation' &&
    (activeTab === 'hvac' || (activeTab === 'services' && !!selectedProduct))

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex flex-col" style={{ colorScheme: 'light' }}>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {(['hvac', 'services'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'hvac' ? <Snowflake className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                {tab === 'hvac' ? 'HVAC' : 'Services'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">

        {/* HVAC intro */}
        {activeTab === 'hvac' && introActive && (
          <div className="text-center py-20 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-md">
              <Snowflake className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1a1a3e] mb-3">{data.settings.widget_title}</h1>
            <p className="text-gray-500 text-base mb-10 max-w-sm mx-auto leading-relaxed">{data.settings.widget_subtitle}</p>
            <button
              onClick={() => setIntroActive(false)}
              className="px-10 py-3.5 rounded-full bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Services intro */}
        {activeTab === 'services' && introActive && (
          <div className="text-center py-20 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-md">
              <Wrench className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1a1a3e] mb-3">HVAC Services</h1>
            <p className="text-gray-500 text-base mb-10 max-w-sm mx-auto leading-relaxed">
              Professional HVAC service and maintenance for your home or business
            </p>
            <button
              onClick={() => setIntroActive(false)}
              className="px-10 py-3.5 rounded-full bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 transition-colors shadow-sm"
            >
              View Services
            </button>
          </div>
        )}

        {/* Services: picker (no product selected yet) */}
        {activeTab === 'services' && !introActive && !selectedProduct && (
          <>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#1a1a3e]">HVAC Services</h2>
              <p className="text-gray-500 mt-1">Choose a service to get started</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
              {serviceProducts.length === 0 ? (
                <p className="text-center text-gray-400 text-sm col-span-2">No services currently available.</p>
              ) : serviceProducts.map(service => {
                const IconComponent = PRODUCT_ICONS[service.icon] ?? Wrench
                const tier = data.pricingTiers.find(t => t.product_id === service.id && t.capacity_option_id === null)
                const descLines = tier
                  ? (tier.features?.length > 0 ? tier.features : (tier.scope_of_work ?? '').split('\n').map(l => l.trim()).filter(Boolean))
                  : []
                return (
                  <div key={service.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-[#1a1a3e] text-lg mb-1">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{service.description}</p>
                      )}
                      {tier?.warranty_years && (
                        <p className="text-xs text-gray-400 mb-4">{tier.warranty_years}-yr warranty</p>
                      )}
                      {descLines.length > 0 && (
                        <ul className="space-y-2 mt-3">
                          {descLines.map((line, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="px-6 pb-6">
                      <button
                        onClick={() => handleServiceSelect(service)}
                        className="w-full py-3 rounded-full bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
                      >
                        Get Quote
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Confirmation */}
        {step === 'confirmation' && submitted && (() => {
          const isService = selectedProduct?.category === 'service'
          const tiers = getTiersForSelection()
          const capLine = selectedCapacity
            ? selectedCapacity.sqft
              ? `${selectedCapacity.label} • ${selectedCapacity.sqft} sq ft`
              : selectedCapacity.label
            : null
          return (
            <div className="py-8">
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-5">
                  <Check className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#1a1a3e] mb-2">You&apos;re all set!</h2>
                <p className="text-gray-500 max-w-sm mx-auto text-sm">{data.settings.widget_thank_you_message}</p>
              </div>

              {/* Equipment: 3 tier cards */}
              {!isService && tiers.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {tiers.map(tier => {
                    const ts = CONF_TIER_STYLES[tier.tier] ?? CONF_TIER_STYLES.good
                    const eff = selectedProduct ? getEfficiencyDescription(selectedProduct.id, tier.tier) : null
                    const tierImg = selectedProduct ? getTierImage(selectedProduct.id, tier.tier) : null
                    const rawScope = (selectedProduct ? getScopeOfWork(selectedProduct.id, tier.tier) : null) ?? tier.scope_of_work ?? ''
                    const isHtmlScope = rawScope.trimStart().startsWith('<')
                    const safeScope = isHtmlScope ? DOMPurify.sanitize(rawScope) : ''
                    const scopeLines = isHtmlScope ? [] : rawScope.split('\n').map(l => l.trim()).filter(Boolean)
                    const PREVIEW_LINES = 3
                    const visibleLines = scopeExpanded ? scopeLines : scopeLines.slice(0, PREVIEW_LINES)
                    const hasMoreScope = scopeLines.length > PREVIEW_LINES
                    return (
                      <div key={tier.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
                        {tierImg && (
                          <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                            <img src={tierImg} alt={`${tier.tier} tier`} className="h-full w-full object-contain p-3" />
                          </div>
                        )}
                        <div className={`px-5 pt-4 pb-3 border-b ${ts.headerBg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${ts.badge}`}>
                              {tier.tier}
                            </span>
                            {tier.tier === 'better' && (
                              <span className="text-xs bg-amber-500 text-white font-semibold px-2 py-0.5 rounded-full">
                                Most Popular
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-[#1a1a3e] text-sm">{selectedProduct?.name}</p>
                          {capLine && <p className="text-xs text-gray-400 mt-0.5">{capLine}</p>}
                        </div>
                        <div className="p-5 space-y-4 flex-1">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Estimated Price</p>
                            <p className={`text-xl font-bold ${ts.priceCls}`}>{formatPrice(tier.price)}</p>
                            {data.settings.financing_enabled && tier.price > 0 && (
                              <p className="text-xs text-indigo-500 font-medium mt-0.5">
                                As low as {formatMonthly(calcMonthly(tier.price, data.settings.financing_term_months, data.settings.financing_apr))}
                              </p>
                            )}
                            {tier.warranty_years && (
                              <p className="text-xs text-gray-400 mt-0.5">{tier.warranty_years}-yr warranty</p>
                            )}
                          </div>
                          {eff && (
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Unit Efficiency</p>
                              <p className="text-sm text-gray-600 leading-relaxed">{eff}</p>
                            </div>
                          )}
                          {(isHtmlScope ? safeScope.length > 0 : scopeLines.length > 0) && (
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">What&apos;s Included</p>
                              {isHtmlScope ? (
                                <div
                                  className="text-sm text-gray-600 widget-scope-html"
                                  // Content is admin-entered and sanitized with DOMPurify
                                  dangerouslySetInnerHTML={{ __html: safeScope }}
                                />
                              ) : (
                                <>
                                  <ul className="space-y-1.5">
                                    {visibleLines.map((line, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                        {line}
                                      </li>
                                    ))}
                                  </ul>
                                  {hasMoreScope && (
                                    <button
                                      type="button"
                                      onClick={() => setScopeExpanded(v => !v)}
                                      className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-medium"
                                    >
                                      {scopeExpanded ? 'See Less' : `See More (${scopeLines.length - PREVIEW_LINES} more)`}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!isService && tiers.length === 0 && (
                <p className="text-center text-gray-400 text-sm">Contact us for a custom quote.</p>
              )}

              {isService && selectedTier && selectedProduct && (() => {
                const descLines = selectedTier.features?.length > 0
                  ? selectedTier.features
                  : (selectedTier.scope_of_work ?? '').split('\n').map(l => l.trim()).filter(Boolean)
                const IconComponent = PRODUCT_ICONS[selectedProduct.icon] ?? Wrench
                return (
                  <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-indigo-600 shadow-sm overflow-hidden">
                    <div className="p-7">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-[#1a1a3e] text-lg mb-1">{selectedProduct.name}</h3>
                      {selectedProduct.description && (
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{selectedProduct.description}</p>
                      )}
                      <p className="text-3xl font-bold text-indigo-600 mb-1">{formatPrice(selectedTier.price)}</p>
                      {selectedTier.warranty_years && (
                        <p className="text-xs text-gray-400 mb-4">{selectedTier.warranty_years}-yr warranty</p>
                      )}
                      {descLines.length > 0 && (
                        <ul className="space-y-2 mt-4">
                          {descLines.map((line, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })()}
              {/* Financing button */}
              {data.settings.financing_enabled && data.settings.financing_link_url && data.settings.financing_link_text && (
                <div className="text-center pt-4">
                  <p className="text-xs text-gray-400 mb-2">Flexible financing available</p>
                  <button
                    type="button"
                    onClick={() => window.open(data.settings.financing_link_url!, '_blank')}
                    className="px-6 py-2.5 rounded-full border-2 border-indigo-600 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 transition-colors"
                  >
                    {data.settings.financing_link_text}
                  </button>
                </div>
              )}

              {/* CTA button — only shown if both redirect_url and redirect_button_text are set */}
              {data.settings.redirect_url && data.settings.redirect_button_text && (
                <div className="text-center pt-6">
                  <button
                    type="button"
                    onClick={() => window.open(data.settings.redirect_url!, '_blank')}
                    className="px-8 py-3 rounded-full bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {data.settings.redirect_button_text}
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* Step flow */}
        {inStepFlow && (
          <>
            {/* Back + Progress */}
            <div className="mb-8">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <div className="flex items-center gap-1.5">
                {activeSteps.filter(s => s !== 'confirmation').map((s, i) => {
                  const isCurrent = i === currentStepIndex
                  const isDone = i < currentStepIndex
                  return (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isDone ? 'bg-indigo-600 w-2' :
                        isCurrent ? 'bg-indigo-600 w-6' :
                        'bg-gray-300 w-2'
                      }`}
                    />
                  )
                })}
                <span className="text-xs text-gray-400 ml-2">{currentStepIndex + 1} of {activeSteps.filter(s => s !== 'confirmation').length}</span>
              </div>
              {selectionSummary.length > 0 && (
                <div className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <Activity className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">You selected:</span>{' '}
                    {selectionSummary.map((part, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-gray-400 mx-1">·</span>}
                        <span className="font-semibold text-indigo-700">{part}</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>

            {/* System Type */}
            {step === 'system_type' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">What type of system do you need?</h2>
                  <p className="text-gray-500 mt-1">Select the system you want to install or replace</p>
                </div>
                <div className="flex flex-col gap-3">
                  {SYSTEM_TYPE_OPTIONS.map(opt => (
                    <SelectCard key={opt.key} selected={systemType === opt.key} onClick={() => handleSystemTypeSelect(opt.key)}
                      icon={opt.Icon} title={opt.label} description={opt.desc} />
                  ))}
                </div>
              </>
            )}

            {/* Heat Source */}
            {step === 'heat_source' && systemType && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">What&apos;s your heat source?</h2>
                  <p className="text-gray-500 mt-1">Choose the energy source for heating</p>
                </div>
                <div className="flex flex-col gap-3">
                  {(HEAT_SOURCE_OPTIONS[systemType] ?? []).map(opt => (
                    <SelectCard key={opt.key} selected={heatSource === opt.key} onClick={() => handleHeatSourceSelect(opt.key)}
                      icon={opt.Icon} title={opt.label} description={opt.desc} />
                  ))}
                </div>
              </>
            )}

            {/* System Config */}
            {step === 'system_config' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">Select your system configuration</h2>
                  <p className="text-gray-500 mt-1">Choose the setup that best fits your home</p>
                </div>
                <div className="flex flex-col gap-3">
                  {getConfigOptions().map(opt => (
                    <SelectCard key={opt.key} selected={systemConfig === opt.key} onClick={() => handleSystemConfigSelect(opt.key)}
                      icon={opt.Icon} title={opt.label} description={opt.desc} />
                  ))}
                </div>
              </>
            )}

            {/* Capacity */}
            {step === 'capacity' && selectedProduct && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">Select System Size</h2>
                  <p className="text-gray-500 mt-1">What size system do you need?</p>
                </div>
                <div className="flex flex-col gap-3">
                  {[...selectedProduct.capacity_options]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(cap => {
                      const sqft = getSqftRange(cap.value, cap.unit)
                      return (
                        <SelectCard
                          key={cap.id}
                          selected={selectedCapacity?.id === cap.id}
                          onClick={() => setSelectedCapacity({ id: cap.id, label: cap.label, value: cap.value, unit: cap.unit, sqft })}
                          icon={Home}
                          title={sqft ? `${sqft} sq ft` : cap.label}
                          description={sqft ? cap.label : undefined}
                        />
                      )
                    })}
                </div>
              </>
            )}

            {/* Number of Heads — Mini Split only */}
            {step === 'num_heads' && selectedProduct && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">How many rooms do you want to cool/heat?</h2>
                  <p className="text-gray-500 mt-1">Each room will have its own indoor unit (head) with independent temperature control</p>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { heads: 1, label: '1 Room',   desc: 'Single zone mini-split', Icon: Home },
                    { heads: 2, label: '2 Rooms',  desc: 'Dual zone mini-split',   Icon: Building2 },
                    { heads: 3, label: '3 Rooms',  desc: 'Triple zone mini-split', Icon: Building2 },
                    { heads: 4, label: '4+ Rooms', desc: 'Quad zone mini-split',   Icon: Building2 },
                  ].map(({ heads, label, desc, Icon }) => {
                    const cost = getHeadsCost(selectedProduct.id, heads)
                    return (
                      <SelectCard
                        key={heads}
                        selected={numHeads === heads}
                        onClick={() => setNumHeads(heads)}
                        icon={Icon} title={label} description={desc}
                      >
                        {cost > 0 && <p className="text-xs text-green-600 mt-0.5">+${cost.toLocaleString()}</p>}
                      </SelectCard>
                    )
                  })}
                </div>
              </>
            )}

            {/* Location */}
            {step === 'location' && selectedProduct && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">Indoor Unit Location</h2>
                  <p className="text-gray-500 mt-1">Where will the indoor unit be installed?</p>
                </div>
                <div className="flex flex-col gap-3">
                  {LOCATION_OPTIONS.map(loc => (
                    <SelectCard key={loc.key} selected={selectedLocation === loc.key}
                      onClick={() => setSelectedLocation(loc.key)}
                      icon={loc.Icon} title={loc.label} description={loc.description} />
                  ))}
                </div>
              </>
            )}

            {/* Qty */}
            {step === 'qty' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">How many units need to be replaced?</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectCard key={n} selected={unitQty === n} onClick={() => setUnitQty(n)}
                      title={`${n} unit${n > 1 ? 's' : ''}`}
                      description={n === 1 ? 'Single unit replacement' : `${n} units replaced together`} />
                  ))}
                </div>
              </>
            )}

            {/* Not sure hint + Continue button — shown for all selection steps */}
            {step !== 'contact' && (
              <>
                {NOT_SURE_HINTS[step] && (
                  <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 mt-3">
                    <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-500 leading-relaxed">
                      <span className="font-semibold text-gray-700">Not sure?</span>{' '}
                      {NOT_SURE_HINTS[step]}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => canContinue && advanceFrom(step)}
                  className={`w-full mt-4 py-4 rounded-2xl font-semibold text-base transition-colors ${
                    canContinue
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-200 text-white cursor-not-allowed'
                  }`}
                >
                  Continue →
                </button>
              </>
            )}

            {/* Contact */}
            {step === 'contact' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1a1a3e]">Almost there! Tell us about yourself</h2>
                  <p className="text-gray-500 mt-1">We&apos;ll use this information to prepare your personalized quote</p>
                </div>
                <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-3">
                  <FormInput icon={User} required placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <FormInput icon={Mail} required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
                  <PhoneInput value={phone} onChange={setPhone} />
                  <FormInput icon={MapPin} placeholder="Street Address" value={address} onChange={e => setAddress(e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="City"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="col-span-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a3e] placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                      placeholder="State"
                      value={addrState}
                      onChange={e => setAddrState(e.target.value)}
                      maxLength={2}
                      className="col-span-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a3e] placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                    />
                    <input
                      placeholder="ZIP"
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      maxLength={10}
                      className="col-span-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#1a1a3e] placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      I authorize {data.business.name} to contact me about my quote by call or text.
                      Consent is not required to purchase.
                    </span>
                  </label>
                  {submitError && (
                    <p className="text-sm text-red-600 text-center">{submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !consent}
                    className="w-full py-3.5 rounded-full bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Get My Quote'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-center py-4 text-xs text-gray-400">
        Powered by <span className="text-indigo-500 font-medium">{data.business.name}</span>
      </p>
    </div>
  )
}
