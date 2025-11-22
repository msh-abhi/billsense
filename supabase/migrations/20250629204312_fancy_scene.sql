/*
  # Clean up RLS policies and restore simple policies

  1. Drop existing RLS policies that may have been created
  2. Restore original simple RLS policies for freelancer access only
  3. Keep public policies for invoice viewing
*/

-- Drop all existing RLS policies to start fresh (only for tables that exist)

-- Clients table policies
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
DROP POLICY IF EXISTS "Freelancers manage own clients" ON clients;

-- Projects table policies
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP POLICY IF EXISTS "Freelancers manage own projects" ON projects;

-- Time_logs table policies
DROP POLICY IF EXISTS "Users can manage own time logs" ON time_logs;
DROP POLICY IF EXISTS "Freelancers manage own time logs" ON time_logs;

-- Invoices table policies
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Freelancers manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Public can view invoices by payment link" ON invoices;
DROP POLICY IF EXISTS "Public view invoices by payment link" ON invoices;

-- Invoice_items table policies
DROP POLICY IF EXISTS "Users can manage invoice items for own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Freelancers manage own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Public can view invoice items for public invoices" ON invoice_items;
DROP POLICY IF EXISTS "Public view invoice items for public invoices" ON invoice_items;

-- Profiles table policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Restore original simple RLS policies for freelancers only

-- Clients table
CREATE POLICY "Users can manage own clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Projects table
CREATE POLICY "Users can manage own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Time logs table
CREATE POLICY "Users can manage own time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Invoices table
CREATE POLICY "Users can manage own invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Public policy for invoice viewing (for client payment pages)
CREATE POLICY "Public can view invoices by payment link"
  ON invoices
  FOR SELECT
  TO anon
  USING (payment_link IS NOT NULL);

-- Invoice items table
CREATE POLICY "Users can manage invoice items for own invoices"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- Public policy for invoice item viewing
CREATE POLICY "Public can view invoice items for public invoices"
  ON invoice_items
  FOR SELECT
  TO anon
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE payment_link IS NOT NULL
    )
  );

-- Profiles table
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);