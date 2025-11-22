-- Fix payment_gateways schema
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS config jsonb;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Fix expenses RLS policies if needed (ensure no user_id dependency)
-- (The error suggests a query is using user_id, which might be a frontend issue, but ensuring the schema is correct is good)

-- Reload schema cache (this is usually automatic but good to note)
NOTIFY pgrst, 'reload config';
