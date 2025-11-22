/*
  # Add project type fields to projects table

  1. Changes
    - Add `project_type` column (hourly/fixed)
    - Add `fixed_price` column for fixed price projects
    - Update existing projects to be 'hourly' by default
    - Ensure hourly_rate can be null for fixed projects
*/

-- Add new columns to projects table
DO $$
BEGIN
  -- Add project_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'project_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_type text DEFAULT 'hourly';
  END IF;

  -- Add fixed_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'fixed_price'
  ) THEN
    ALTER TABLE projects ADD COLUMN fixed_price numeric DEFAULT 0;
  END IF;
END $$;

-- Update existing projects to have project_type = 'hourly'
UPDATE projects SET project_type = 'hourly' WHERE project_type IS NULL;

-- Make project_type NOT NULL after setting defaults
ALTER TABLE projects ALTER COLUMN project_type SET NOT NULL;