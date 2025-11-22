-- Make invoice_id nullable in invoice_items to support quotations
ALTER TABLE invoice_items ALTER COLUMN invoice_id DROP NOT NULL;

-- Add constraint to ensure either invoice_id or quotation_id is present
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_parent_check;
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_parent_check 
  CHECK (invoice_id IS NOT NULL OR quotation_id IS NOT NULL);
