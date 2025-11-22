-- Fix gateway_name vs gateway column mismatch
DO $$
BEGIN
    -- Check if gateway_name exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateways' AND column_name = 'gateway_name') THEN
        
        -- Check if gateway also exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateways' AND column_name = 'gateway') THEN
            -- Migrate data from gateway_name to gateway where gateway is null
            UPDATE payment_gateways SET gateway = gateway_name WHERE gateway IS NULL;
            
            -- Drop the legacy gateway_name column
            ALTER TABLE payment_gateways DROP COLUMN gateway_name;
        ELSE
            -- If gateway doesn't exist, just rename gateway_name
            ALTER TABLE payment_gateways RENAME COLUMN gateway_name TO gateway;
        END IF;
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
