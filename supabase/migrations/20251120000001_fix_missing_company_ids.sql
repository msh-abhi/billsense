-- Migration: Fix missing company_id columns
-- Description: Add company_id columns to tables that were missing them

-- Add company_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to time_entries table
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Add missing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES quotations(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid decimal DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_due decimal;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id uuid;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value decimal DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount decimal DEFAULT 0;

-- Update existing projects to set company_id from user_id via profiles
UPDATE projects SET company_id = (SELECT company_id FROM profiles WHERE id = projects.user_id) WHERE company_id IS NULL;

-- Update existing time_entries to set company_id from user_id via profiles
UPDATE time_entries SET company_id = (SELECT company_id FROM profiles WHERE id = time_entries.user_id) WHERE company_id IS NULL;

-- Update existing invoices to set company_id from user_id via profiles
UPDATE invoices SET company_id = (SELECT company_id FROM profiles WHERE id = invoices.user_id) WHERE company_id IS NULL;

-- Make company_id NOT NULL for projects (after populating)
ALTER TABLE projects ALTER COLUMN company_id SET NOT NULL;

-- Make company_id NOT NULL for time_entries (after populating)
ALTER TABLE time_entries ALTER COLUMN company_id SET NOT NULL;

-- Make company_id NOT NULL for invoices (after populating)
ALTER TABLE invoices ALTER COLUMN company_id SET NOT NULL;