-- Make user_id nullable in payment_gateways if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateways' AND column_name = 'user_id') THEN
        ALTER TABLE payment_gateways ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
