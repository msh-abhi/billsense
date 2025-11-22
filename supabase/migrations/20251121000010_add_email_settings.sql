/*
  # Add Email Settings

  1. Changes
    - Add `email_settings` column to `settings` table to store provider configuration (Brevo, etc.)
    - JSONB structure: { provider: 'brevo', api_key: '...', sender_name: '...', sender_email: '...' }
*/

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS email_settings jsonb DEFAULT '{"provider": "system"}'::jsonb;
