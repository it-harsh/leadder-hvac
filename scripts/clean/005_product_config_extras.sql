-- ============================================================
-- 005_product_config_extras.sql
-- 1. Add heads + oil additional cost columns to business_product_configs
-- 2. Add missing 1 Ton and 5 Ton capacity options to existing mini-split products
-- Run in Supabase SQL editor
-- ============================================================

ALTER TABLE public.business_product_configs
  ADD COLUMN IF NOT EXISTS heads_2_additional_cost     DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heads_3_additional_cost     DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heads_4plus_additional_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oil_additional_cost         DECIMAL(10,2) DEFAULT 0;

-- Add 1 Ton to existing mini-split products (display_order 0 = before 1.5 Ton)
INSERT INTO public.capacity_options (product_id, label, value, unit, display_order, is_enabled)
SELECT p.id, '1 Ton', '1', 'ton', 0, true
FROM public.products p
WHERE p.slug = 'mini-split'
  AND NOT EXISTS (
    SELECT 1 FROM public.capacity_options co
    WHERE co.product_id = p.id AND co.value = '1' AND co.unit = 'ton'
  );

-- Add 5 Ton to existing mini-split products (display_order 8 = after 4 Ton)
INSERT INTO public.capacity_options (product_id, label, value, unit, display_order, is_enabled)
SELECT p.id, '5 Ton', '5', 'ton', 8, true
FROM public.products p
WHERE p.slug = 'mini-split'
  AND NOT EXISTS (
    SELECT 1 FROM public.capacity_options co
    WHERE co.product_id = p.id AND co.value = '5' AND co.unit = 'ton'
  );
