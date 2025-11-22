/*
  # Add RLS policies for time_entries

  1. Security
    - Enable RLS on time_entries table (already enabled but ensuring)
    - Add policy for company members to manage their company's time entries
    - Add policy for client users to view time entries for their projects
*/

-- Ensure RLS is enabled
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Companies manage own time_entries" ON time_entries;
DROP POLICY IF EXISTS "Client users view own project time entries" ON time_entries;

-- Policy for Company Members (Admins/Users)
CREATE POLICY "Companies manage own time_entries"
  ON time_entries
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy for Client Users
-- Client users can view time entries linked to projects that belong to their client account
CREATE POLICY "Client users view own project time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN client_users cu ON p.client_id = cu.client_id
      WHERE cu.id = auth.uid()
    )
  );
