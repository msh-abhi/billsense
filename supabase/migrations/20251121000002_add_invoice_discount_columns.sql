-- Add missing discount columns to invoices table
-- These are required by the calculate_totals() trigger function

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value decimal DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount decimal DEFAULT 0;
