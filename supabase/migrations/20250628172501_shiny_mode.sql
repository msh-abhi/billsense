/*
  # Payment Gateway and Enhanced Profile Setup

  1. New Tables
    - `payment_gateways`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `gateway_type` (text: stripe, paypal, bank_transfer)
      - `gateway_name` (text)
      - `is_enabled` (boolean)
      - `configuration` (jsonb)
      - `fees_percentage` (numeric)
      - `fees_fixed` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Enhanced Tables
    - Add address fields to `profiles` table
    - Add address fields to `clients` table
    - Add invoice display preferences to `profiles`

  3. Security
    - Enable RLS on payment_gateways table
    - Add policies for users to manage their own payment gateways
*/

-- Payment gateways table
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gateway_type text NOT NULL CHECK (gateway_type IN ('stripe', 'paypal', 'bank_transfer')),
  gateway_name text NOT NULL,
  is_enabled boolean DEFAULT false,
  configuration jsonb DEFAULT '{}',
  fees_percentage numeric DEFAULT 0,
  fees_fixed numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment gateways"
  ON payment_gateways
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Add address and business info to profiles
DO $$
BEGIN
  -- Add address fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address_line2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'state_province'
  ) THEN
    ALTER TABLE profiles ADD COLUMN state_province text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country text;
  END IF;

  -- Add business info
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'vat_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vat_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tin_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tin_number text;
  END IF;

  -- Add invoice display preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_address_on_invoice'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_address_on_invoice boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_vat_on_invoice'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_vat_on_invoice boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_tin_on_invoice'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_tin_on_invoice boolean DEFAULT true;
  END IF;
END $$;

-- Add enhanced client fields
DO $$
BEGIN
  -- Add phone number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'phone'
  ) THEN
    ALTER TABLE clients ADD COLUMN phone text;
  END IF;

  -- Add address fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE clients ADD COLUMN address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE clients ADD COLUMN address_line2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'city'
  ) THEN
    ALTER TABLE clients ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'state_province'
  ) THEN
    ALTER TABLE clients ADD COLUMN state_province text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE clients ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'country'
  ) THEN
    ALTER TABLE clients ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'tin_number'
  ) THEN
    ALTER TABLE clients ADD COLUMN tin_number text;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_gateways_user_id ON payment_gateways(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_enabled ON payment_gateways(user_id, is_enabled);

-- Trigger for payment_gateways updated_at
CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON payment_gateways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();