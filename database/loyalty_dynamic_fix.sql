-- SQL Migration to support dynamic loyalty redemption rules
-- Run this in your Supabase SQL Editor

-- 1. Update the check constraint on loyalty_rules table to allow 'REDEEM'
ALTER TABLE public.loyalty_rules DROP CONSTRAINT IF EXISTS loyalty_rules_event_type_check;
ALTER TABLE public.loyalty_rules ADD CONSTRAINT loyalty_rules_event_type_check 
CHECK (event_type IN ('TREATMENT', 'PURCHASE', 'VISIT', 'REDEEM'));

-- 2. Add a default redemption rule for existing locations if needed
-- This assigns 1 MMK per 1 point with a 500 point minimum
INSERT INTO public.loyalty_rules (location_id, name, event_type, points_per_unit, min_amount, active)
SELECT id, 'Default Redemption', 'REDEEM', 1, 500, true
FROM public.locations
ON CONFLICT DO NOTHING;
