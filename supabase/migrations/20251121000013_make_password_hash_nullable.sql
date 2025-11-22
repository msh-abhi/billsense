/*
  # Make password_hash Nullable

  1. Changes
    - Alter `client_users` table to allow NULL values for `password_hash`.
    - This is required because invited users do not have a password initially.
*/

ALTER TABLE client_users ALTER COLUMN password_hash DROP NOT NULL;
