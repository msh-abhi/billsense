-- Drop the problematic trigger that overwrites totals with 0 on insert
DROP TRIGGER IF EXISTS calculate_invoice_totals ON invoices;

-- Create a simpler function that only maintains amount_due consistency
CREATE OR REPLACE FUNCTION maintain_invoice_amount_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate amount due if total or amount_paid changes
  IF NEW.total IS NOT NULL AND NEW.amount_paid IS NOT NULL THEN
    NEW.amount_due := NEW.total - NEW.amount_paid;
  ELSIF NEW.total IS NOT NULL THEN
    NEW.amount_due := NEW.total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger
CREATE TRIGGER maintain_invoice_amount_due_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION maintain_invoice_amount_due();
