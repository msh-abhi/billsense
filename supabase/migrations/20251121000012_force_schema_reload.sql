/*
  # Force Schema Cache Reload

  1. Changes
    - Add and drop a dummy column to force schema cache invalidation.
    - Explicitly notify pgrst to reload schema.
*/

-- Add dummy column
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS _cache_buster int;

-- Drop dummy column
ALTER TABLE client_users DROP COLUMN IF EXISTS _cache_buster;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
