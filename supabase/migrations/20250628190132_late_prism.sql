/*
  # PDF Settings Table

  1. New Tables
    - `pdf_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `settings` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `pdf_settings` table
    - Add policy for users to manage their own PDF settings

  3. Indexes
    - Add index for user_id
*/

-- PDF settings table
CREATE TABLE IF NOT EXISTS pdf_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PDF settings"
  ON pdf_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pdf_settings_user_id ON pdf_settings(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pdf_settings_updated_at BEFORE UPDATE ON pdf_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add payment_gateway_id to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_gateway_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_gateway_id uuid REFERENCES payment_gateways(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for payment gateway
CREATE INDEX IF NOT EXISTS idx_invoices_payment_gateway_id ON invoices(payment_gateway_id);