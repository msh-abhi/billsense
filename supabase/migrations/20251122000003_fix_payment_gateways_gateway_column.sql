-- Fix gateway_type vs gateway column mismatch
DO $$
BEGIN
    -- Check if gateway_type exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateways' AND column_name = 'gateway_type') THEN
        
        -- Check if gateway also exists (it likely does from previous migrations)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateways' AND column_name = 'gateway') THEN
            -- Migrate data from gateway_type to gateway where gateway is null
            UPDATE payment_gateways SET gateway = gateway_type WHERE gateway IS NULL;
            
            -- Drop the legacy gateway_type column
            ALTER TABLE payment_gateways DROP COLUMN gateway_type;
        ELSE
            -- If gateway doesn't exist, just rename gateway_type
            ALTER TABLE payment_gateways RENAME COLUMN gateway_type TO gateway;
        END IF;
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
