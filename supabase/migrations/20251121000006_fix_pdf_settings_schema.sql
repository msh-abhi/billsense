-- Add missing columns to pdf_settings table
ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS show_logo boolean DEFAULT true;
ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS show_signature boolean DEFAULT false;
ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS template text DEFAULT 'modern';
ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS custom_css text;

-- Ensure company_id is present (should be, but good to check)
-- ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Add RLS policy if it doesn't exist (idempotent check is hard in pure SQL without DO block, but we can try)
-- The previous migration should have handled RLS, but let's make sure the table is secure.
ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'pdf_settings'
        AND policyname = 'Companies manage PDF settings'
    ) THEN
        CREATE POLICY "Companies manage PDF settings"
          ON pdf_settings
          FOR ALL
          TO authenticated
          USING (
            company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          );
    END IF;
END
$$;
