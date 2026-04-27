-- ============================================================
-- 001_schema.sql
-- Full clean schema — 7 tables, no legacy columns.
-- Run after 000_drop_all.sql on a fresh project.
-- ============================================================


-- ── businesses ───────────────────────────────────────────────
CREATE TABLE public.businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  primary_color TEXT DEFAULT '#10B981',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX idx_businesses_slug     ON public.businesses(slug);


-- ── products ─────────────────────────────────────────────────
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('equipment', 'service')),
  description   TEXT,
  icon          TEXT,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, slug)
);
CREATE INDEX idx_products_business_id ON public.products(business_id);


-- ── capacity_options ─────────────────────────────────────────
CREATE TABLE public.capacity_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,   -- "2 Ton", "80k BTU"
  value         TEXT NOT NULL,   -- "2", "80000"
  unit          TEXT NOT NULL,   -- "ton", "btu"
  display_order INTEGER DEFAULT 0,
  is_enabled    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_capacity_options_product_id ON public.capacity_options(product_id);


-- ── pricing_tiers ────────────────────────────────────────────
CREATE TABLE public.pricing_tiers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  capacity_option_id UUID REFERENCES public.capacity_options(id) ON DELETE SET NULL,
  tier               TEXT NOT NULL CHECK (tier IN ('good', 'better', 'best')),
  price              DECIMAL(10,2) NOT NULL,
  warranty_years     INTEGER,
  features           TEXT[] DEFAULT '{}',
  scope_of_work      TEXT,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, product_id, capacity_option_id, tier)
);
CREATE INDEX idx_pricing_tiers_business_id ON public.pricing_tiers(business_id);
CREATE INDEX idx_pricing_tiers_product_id  ON public.pricing_tiers(product_id);


-- ── leads ────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id         UUID REFERENCES public.products(id) ON DELETE SET NULL,
  capacity_option_id UUID REFERENCES public.capacity_options(id) ON DELETE SET NULL,
  pricing_tier_id    UUID REFERENCES public.pricing_tiers(id) ON DELETE SET NULL,
  -- Contact
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  -- Address
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip         TEXT,
  -- Quote details
  product_name    TEXT,
  capacity_label  TEXT,
  tier_selected   TEXT CHECK (tier_selected IN ('good', 'better', 'best')),
  quoted_price    DECIMAL(10,2),
  price_good      DECIMAL(10,2),
  price_better    DECIMAL(10,2),
  price_best      DECIMAL(10,2),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leads_business_id ON public.leads(business_id);
CREATE INDEX idx_leads_created_at  ON public.leads(created_at DESC);


-- ── business_settings ────────────────────────────────────────
CREATE TABLE public.business_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  widget_enabled           BOOLEAN DEFAULT TRUE,
  widget_title             TEXT DEFAULT 'Get Your Instant Quote',
  widget_subtitle          TEXT DEFAULT 'Select your HVAC service to see pricing',
  widget_thank_you_message TEXT DEFAULT 'Thank you! We''ll be in touch soon.',
  price_range_pct          DECIMAL(5,2) DEFAULT 10,
  webhook_url              TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);


-- ── business_product_configs ─────────────────────────────────
CREATE TABLE public.business_product_configs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                 UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id                  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_enabled                  BOOLEAN DEFAULT TRUE,
  price_range_pct             DECIMAL(5,2) DEFAULT 10,
  multi_unit_discount_pct     DECIMAL(5,2) DEFAULT 0,
  attic_additional_cost       DECIMAL(10,2) DEFAULT 0,
  basement_additional_cost    DECIMAL(10,2) DEFAULT 0,
  closet_additional_cost      DECIMAL(10,2) DEFAULT 0,
  garage_additional_cost      DECIMAL(10,2) DEFAULT 0,
  crawl_space_additional_cost DECIMAL(10,2) DEFAULT 0,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, product_id)
);
CREATE INDEX idx_business_product_configs_business_id ON public.business_product_configs(business_id);


-- ── tier_system_configurations ───────────────────────────────
CREATE TABLE public.tier_system_configurations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier                  TEXT NOT NULL CHECK (tier IN ('good', 'better', 'best')),
  efficiency_description TEXT,
  warranty_years        INTEGER,
  scope_of_work         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, product_id, tier)
);
CREATE INDEX idx_tier_system_configs_business_product ON public.tier_system_configurations(business_id, product_id);
