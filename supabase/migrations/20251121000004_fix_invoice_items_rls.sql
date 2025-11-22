-- Enable RLS on invoice_items if not already enabled
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policy for invoice_items
-- Users can manage items if they belong to an invoice or quotation in their company
CREATE POLICY "Users can manage invoice items"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (
    (invoice_id IS NOT NULL AND invoice_id IN (
      SELECT id FROM invoices 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    ))
    OR
    (quotation_id IS NOT NULL AND quotation_id IN (
      SELECT id FROM quotations 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    ))
  )
  WITH CHECK (
    (invoice_id IS NOT NULL AND invoice_id IN (
      SELECT id FROM invoices 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    ))
    OR
    (quotation_id IS NOT NULL AND quotation_id IN (
      SELECT id FROM quotations 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    ))
  );
