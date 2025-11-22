/*
  # Email Templates Table

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `template_type` (text, enum: invoice_sent, invoice_reminder, payment_received)
      - `subject` (text)
      - `html_content` (text)
      - `is_enabled` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on email_templates table
    - Add policy for users to manage their own templates

  3. Indexes
    - Add index for user_id and template_type
*/

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('invoice_sent', 'invoice_reminder', 'payment_received')),
  subject text NOT NULL,
  html_content text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, template_type)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(user_id, template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_enabled ON email_templates(user_id, is_enabled);

-- Trigger for email_templates updated_at
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();