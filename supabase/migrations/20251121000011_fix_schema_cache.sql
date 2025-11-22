/*
  # Fix Schema Cache and Ensure Columns

  1. Changes
    - Explicitly notify PostgREST to reload the schema cache.
    - Ensure `invited_at` column exists in `client_users` (safety check).
*/

-- Ensure invited_at exists (it should, but just in case)
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS invited_at timestamptz;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
