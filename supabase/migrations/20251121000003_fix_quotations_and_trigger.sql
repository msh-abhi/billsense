-- Add currency column to quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Fix calculate_totals function to handle table-specific columns safely
CREATE OR REPLACE FUNCTION calculate_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal := COALESCE((
    SELECT SUM(amount) FROM invoice_items
    WHERE invoice_id = NEW.id OR quotation_id = NEW.id
  ), 0);

  -- Calculate tax amount
  NEW.tax_amount := NEW.subtotal * (NEW.tax_rate / 100);

  -- Calculate discount amount
  IF NEW.discount_type = 'percentage' THEN
    NEW.discount_amount := NEW.subtotal * (NEW.discount_value / 100);
  ELSE
    NEW.discount_amount := NEW.discount_value;
  END IF;

  -- Calculate total
  NEW.total := NEW.subtotal + NEW.tax_amount - NEW.discount_amount;

  -- Calculate amount due for invoices ONLY
  IF TG_TABLE_NAME = 'invoices' THEN
    IF NEW.amount_paid IS NOT NULL THEN
      NEW.amount_due := NEW.total - NEW.amount_paid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
