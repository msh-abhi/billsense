/*
  # Add project type and fixed price support

  1. Changes
    - Add `project_type` column to projects table (hourly or fixed)
    - Add `fixed_price` column to projects table
    - Update existing projects to have default project_type of 'hourly'

  2. Security
    - No changes to RLS policies needed
*/

-- Add project_type column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_type text DEFAULT 'hourly';
  END IF;
END $$;

-- Add fixed_price column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'fixed_price'
  ) THEN
    ALTER TABLE projects ADD COLUMN fixed_price numeric DEFAULT 0;
  END IF;
END $$;

-- Update existing projects to have project_type 'hourly' if null
UPDATE projects SET project_type = 'hourly' WHERE project_type IS NULL;