-- ============================================================
-- 003_functions_and_seed.sql
-- Two functions:
--   seed_phase1_products(business_id) — seeds all 9 default products
--   create_business_with_settings(owner_id, name, slug, email)
--     — creates business + settings row + seeds products in one call
-- ============================================================


-- ── seed_phase1_products ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_phase1_products(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id      UUID;
  tonnage_labels    TEXT[] := ARRAY['1.5 Ton','2 Ton','2.5 Ton','3 Ton','3.5 Ton','4 Ton','5 Ton'];
  tonnage_values    TEXT[] := ARRAY['1.5','2','2.5','3','3.5','4','5'];
  mini_split_labels TEXT[] := ARRAY['1 Ton','1.5 Ton','2 Ton','2.5 Ton','3 Ton','3.5 Ton','4 Ton','5 Ton'];
  mini_split_values TEXT[] := ARRAY['1','1.5','2','2.5','3','3.5','4','5'];
  btu_labels        TEXT[] := ARRAY['40k BTU','60k BTU','80k BTU','100k BTU','120k BTU'];
  btu_values        TEXT[] := ARRAY['40000','60000','80000','100000','120000'];
  i INT;
BEGIN
  -- Split System - Gas Furnace (tonnage)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Split System - Gas Furnace', 'split-system-gas-furnace', 'equipment',
    'Complete split system with gas furnace and AC', 'Zap', 1, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..7 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, tonnage_labels[i], tonnage_values[i], 'ton', i);
  END LOOP;

  -- Split System - Cooling Only (tonnage)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Split System - Cooling Only', 'split-system-cooling-only', 'equipment',
    'Central air conditioning split system', 'Snowflake', 2, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..7 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, tonnage_labels[i], tonnage_values[i], 'ton', i);
  END LOOP;

  -- Mini Split (tonnage)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Mini Split', 'mini-split', 'equipment',
    'Ductless mini split heating and cooling system', 'Wind', 3, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..8 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, mini_split_labels[i], mini_split_values[i], 'ton', i);
  END LOOP;

  -- Packaged System (tonnage)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Packaged System', 'packaged-system', 'equipment',
    'All-in-one rooftop packaged HVAC unit', 'Fan', 4, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..7 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, tonnage_labels[i], tonnage_values[i], 'ton', i);
  END LOOP;

  -- Furnace (BTU)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Furnace', 'furnace', 'equipment',
    'Gas or electric furnace replacement', 'Flame', 5, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..5 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, btu_labels[i], btu_values[i], 'btu', i);
  END LOOP;

  -- Boiler (BTU)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Boiler', 'boiler', 'equipment',
    'Hot water or steam boiler replacement', 'Thermometer', 6, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..5 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, btu_labels[i], btu_values[i], 'btu', i);
  END LOOP;

  -- Dual Fuel System (tonnage)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Dual Fuel System', 'dual-fuel-system', 'equipment',
    'Heat pump with gas furnace backup', 'Zap', 7, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..7 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, tonnage_labels[i], tonnage_values[i], 'ton', i);
  END LOOP;

  -- Split System - Heat Pump (tonnage)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'Split System - Heat Pump', 'split-system-heat-pump', 'equipment',
    'Electric heat pump for heating and cooling', 'Thermometer', 8, true)
  RETURNING id INTO v_product_id;
  FOR i IN 1..7 LOOP
    INSERT INTO public.capacity_options (product_id, label, value, unit, display_order)
    VALUES (v_product_id, tonnage_labels[i], tonnage_values[i], 'ton', i);
  END LOOP;

  -- HVAC System Tune-Up (service, no capacity)
  INSERT INTO public.products (business_id, name, slug, category, description, icon, display_order, is_active)
  VALUES (p_business_id, 'HVAC System Tune-Up', 'hvac-tune-up', 'service',
    'Professional HVAC maintenance and tune-up service', 'Wrench', 9, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_phase1_products TO service_role;


-- ── create_business_with_settings ────────────────────────────
-- Called from the signup flow. Creates business + settings + seeds products.
CREATE OR REPLACE FUNCTION public.create_business_with_settings(
  p_owner_id UUID,
  p_name     TEXT,
  p_slug     TEXT,
  p_email    TEXT
)
RETURNS TABLE (business_id UUID, business_name TEXT, business_slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  INSERT INTO public.businesses (owner_id, name, slug, email)
  VALUES (p_owner_id, p_name, p_slug, p_email)
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_settings (business_id)
  VALUES (v_business_id);

  PERFORM public.seed_phase1_products(v_business_id);

  RETURN QUERY SELECT v_business_id, p_name, p_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_with_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_with_settings TO service_role;
