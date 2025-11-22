/*
  # Fix RLS Policy Infinite Recursion

  1. Drop all existing RLS policies that are causing recursion
  2. Create simple, non-recursive policies for all tables
  3. Ensure proper access control without circular dependencies
*/

-- Drop all existing policies that might cause recursion

-- Client Users table policies
DROP POLICY IF EXISTS "Client users read own record" ON client_users;
DROP POLICY IF EXISTS "Freelancers manage client users" ON client_users;
DROP POLICY IF EXISTS "Public read for authentication" ON client_users;
DROP POLICY IF EXISTS "Users can manage their client user links" ON client_users;
DROP POLICY IF EXISTS "Users can view client user links" ON client_users;
DROP POLICY IF EXISTS "Freelancers can manage client links" ON client_users;

-- Clients table policies
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
DROP POLICY IF EXISTS "Client users view own client record" ON clients;
DROP POLICY IF EXISTS "Freelancers manage own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;

-- Projects table policies
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP POLICY IF EXISTS "Client users view assigned projects" ON projects;
DROP POLICY IF EXISTS "Freelancers manage own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;

-- Time logs table policies
DROP POLICY IF EXISTS "Users can manage own time logs" ON time_logs;
DROP POLICY IF EXISTS "Client users view time logs for assigned projects" ON time_logs;
DROP POLICY IF EXISTS "Freelancers manage own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can view own time logs" ON time_logs;

-- Invoices table policies
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Client users view assigned invoices" ON invoices;
DROP POLICY IF EXISTS "Public can view invoices by payment link" ON invoices;
DROP POLICY IF EXISTS "Public view invoices by payment link" ON invoices;
DROP POLICY IF EXISTS "Freelancers manage own invoices" ON invoices;

-- Invoice items table policies
DROP POLICY IF EXISTS "Users can manage invoice items for own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Client users view invoice items for assigned invoices" ON invoice_items;
DROP POLICY IF EXISTS "Public can view invoice items for public invoices" ON invoice_items;
DROP POLICY IF EXISTS "Public view invoice items for public invoices" ON invoice_items;
DROP POLICY IF EXISTS "Freelancers manage own invoice items" ON invoice_items;

-- Profiles table policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Client users view freelancer profiles for assigned projects" ON profiles;

-- Payment gateways table policies
DROP POLICY IF EXISTS "Users can manage own payment gateways" ON payment_gateways;

-- PDF settings table policies
DROP POLICY IF EXISTS "Users can manage own PDF settings" ON pdf_settings;

-- Email templates table policies
DROP POLICY IF EXISTS "Users can manage own email templates" ON email_templates;

-- Create simple, non-recursive policies

-- Profiles table - Basic user access
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Client Users table - Simple access
CREATE POLICY "Client users read own record"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Public read for authentication"
  ON client_users
  FOR SELECT
  TO anon
  USING (true);

-- Clients table - Only freelancer access
CREATE POLICY "Users can manage own clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Projects table - Only freelancer access
CREATE POLICY "Users can manage own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Time logs table - Only freelancer access
CREATE POLICY "Users can manage own time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Invoices table - Freelancer access + public payment link access
CREATE POLICY "Users can manage own invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can view invoices by payment link"
  ON invoices
  FOR SELECT
  TO anon
  USING (payment_link IS NOT NULL);

-- Invoice items table - Based on invoice ownership
CREATE POLICY "Users can manage invoice items for own invoices"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view invoice items for public invoices"
  ON invoice_items
  FOR SELECT
  TO anon
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE payment_link IS NOT NULL
    )
  );

-- Payment gateways table
CREATE POLICY "Users can manage own payment gateways"
  ON payment_gateways
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- PDF settings table
CREATE POLICY "Users can manage own PDF settings"
  ON pdf_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Email templates table
CREATE POLICY "Users can manage own email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());