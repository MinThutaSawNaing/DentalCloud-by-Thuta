-- SQL Migration Script to Restore Orphaned Data
-- Run this in your Supabase SQL Editor to assign existing records to a location.

-- 1. Ensure uuid-ossp is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create a default location if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.locations) THEN
        INSERT INTO public.locations (id, name, address, phone)
        VALUES (uuid_generate_v4(), 'Main Clinic', 'Default Address', '000-000-0000');
    END IF;
END $$;

-- 3. Assign all NULL location_ids to the first available location
-- This will make your "missing" data visible again in the frontend.
DO $$
DECLARE
    default_loc_id UUID;
BEGIN
    -- Get the ID of the first location
    SELECT id INTO default_loc_id FROM public.locations LIMIT 1;

    -- Update patients
    UPDATE public.patients SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update appointments
    UPDATE public.appointments SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update doctors
    UPDATE public.doctors SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update treatment records
    UPDATE public.treatments SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update treatment types (service menu)
    UPDATE public.treatment_types SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update medicines (inventory)
    UPDATE public.medicines SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update medicine sales
    UPDATE public.medicine_sales SET location_id = default_loc_id WHERE location_id IS NULL;
    
    -- Update users (only if not already set, skipping global admins if needed)
    UPDATE public.users SET location_id = default_loc_id WHERE location_id IS NULL AND role != 'admin';
    
    RAISE NOTICE 'Migration completed using location ID: %', default_loc_id;
END $$;
