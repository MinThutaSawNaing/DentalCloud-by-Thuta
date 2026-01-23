-- Create medicines table for inventory management
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS medicines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL DEFAULT 'pack',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);

-- Create medicine_sales table to track medicine sales
CREATE TABLE IF NOT EXISTS medicine_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  treatment_id UUID, -- Optional: link to treatment if sold with treatment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for medicine_sales
CREATE INDEX IF NOT EXISTS idx_medicine_sales_patient ON medicine_sales(patient_id);
CREATE INDEX IF NOT EXISTS idx_medicine_sales_medicine ON medicine_sales(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_sales_date ON medicine_sales(date);
CREATE INDEX IF NOT EXISTS idx_medicine_sales_treatment ON medicine_sales(treatment_id);

-- Create function to update updated_at timestamp for medicines
CREATE OR REPLACE FUNCTION update_medicines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for medicines
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON medicines
    FOR EACH ROW EXECUTE FUNCTION update_medicines_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_sales ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users (adjust based on your security needs)
-- Note: In production, you should implement proper RLS policies
CREATE POLICY "Allow all for authenticated users" ON medicines
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON medicine_sales
    FOR ALL USING (true);

