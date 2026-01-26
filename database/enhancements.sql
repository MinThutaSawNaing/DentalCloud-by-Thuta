-- Multi-location and Loyalty System Enhancements

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Loyalty Rules Table
CREATE TABLE IF NOT EXISTS public.loyalty_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('TREATMENT', 'PURCHASE', 'VISIT')),
    points_per_unit NUMERIC NOT NULL DEFAULT 0.001,
    min_amount NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Loyalty Transactions Table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL, -- Assuming patients table exists
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    points NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EARNED', 'REDEEMED', 'EXPIRED')),
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update existing tables to support multi-location
-- Add location_id to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS loyalty_points NUMERIC DEFAULT 0;

-- Add location_id to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add location_id to doctors
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add location_id to treatments (clinical records)
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add location_id to treatment_types
ALTER TABLE public.treatment_types ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add location_id to medicines
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add location_id to medicine_sales
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add location_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Enable RLS (Row Level Security) - Optional but recommended
-- Example: ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
