-- Ensure all columns exist for payment_gateways
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS gateway text CHECK (gateway IN ('stripe', 'paypal', 'wise'));
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT false;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS config jsonb;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Reload schema cache
NOTIFY pgrst, 'reload config';
