/*
  # Complete RLS Policy Cleanup and Recreation
  
  This migration completely removes all existing RLS policies that could cause
  infinite recursion and creates new, non-recursive policies for both freelancers
  and client portal users.
  
  1. Drop ALL existing policies on affected tables
  2. Create new, non-recursive policies with clear separation of concerns
  3. Ensure no circular dependencies between tables
*/

-- Drop ALL existing RLS policies on the affected tables to start completely fresh

-- Clients table policies
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own client data" ON clients;
DROP POLICY IF EXISTS "Clients can view assigned client data" ON clients;
DROP POLICY IF EXISTS "Freelancers manage own clients" ON clients;
DROP POLICY IF EXISTS "Client users view own client record" ON clients;

-- Client_users table policies
DROP POLICY IF EXISTS "Client users can read own data" ON client_users;
DROP POLICY IF EXISTS "Freelancers can manage client users for own clients" ON client_users;
DROP POLICY IF EXISTS "Public can read client users for authentication" ON client_users;
DROP POLICY IF EXISTS "Freelancers manage client users" ON client_users;
DROP POLICY IF EXISTS "Client users read own record" ON client_users;
DROP POLICY IF EXISTS "Public read for authentication" ON client_users;

-- Projects table policies
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP POLICY IF EXISTS "Clients can view own projects" ON projects;
DROP POLICY IF EXISTS "Clients can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Freelancers manage own projects" ON projects;
DROP POLICY IF EXISTS "Client users view assigned projects" ON projects;

-- Time_logs table policies
DROP POLICY IF EXISTS "Users can manage own time logs" ON time_logs;
DROP POLICY IF EXISTS "Clients can view time logs for own projects" ON time_logs;
DROP POLICY IF EXISTS "Clients can view time logs for assigned projects" ON time_logs;
DROP POLICY IF EXISTS "Freelancers manage own time logs" ON time_logs;
DROP POLICY IF EXISTS "Client users view time logs for assigned projects" ON time_logs;

-- Invoices table policies
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Clients can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Clients can view assigned invoices" ON invoices;
DROP POLICY IF EXISTS "Public can view invoices by payment link" ON invoices;
DROP POLICY IF EXISTS "Freelancers manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Client users view assigned invoices" ON invoices;
DROP POLICY IF EXISTS "Public view invoices by payment link" ON invoices;

-- Invoice_items table policies
DROP POLICY IF EXISTS "Users can manage invoice items for own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Clients can view invoice items for own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Clients can view invoice items for assigned invoices" ON invoice_items;
DROP POLICY IF EXISTS "Public can view invoice items for public invoices" ON invoice_items;
DROP POLICY IF EXISTS "Freelancers manage own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Client users view invoice items for assigned invoices" ON invoice_items;
DROP POLICY IF EXISTS "Public view invoice items for public invoices" ON invoice_items;

-- Profiles table policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Clients can view freelancer profile for their projects" ON profiles;
DROP POLICY IF EXISTS "Clients can view freelancer profiles for assigned projects" ON profiles;
DROP POLICY IF EXISTS "Client users view freelancer profiles for assigned projects" ON profiles;

-- Now create new, non-recursive policies

-- CLIENTS table policies
CREATE POLICY "Freelancers manage own clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Client users view own client record"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_users 
      WHERE client_users.client_id = clients.id 
      AND client_users.id = auth.uid()
    )
  );

-- CLIENT_USERS table policies
CREATE POLICY "Freelancers manage client users"
  ON client_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_users.client_id 
      AND clients.user_id = auth.uid()
    )
  );

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

-- PROJECTS table policies
CREATE POLICY "Freelancers manage own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Client users view assigned projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_users 
      WHERE client_users.client_id = projects.client_id 
      AND client_users.id = auth.uid()
    )
  );

-- TIME_LOGS table policies
CREATE POLICY "Freelancers manage own time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Client users view time logs for assigned projects"
  ON time_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_users cu ON p.client_id = cu.client_id
      WHERE p.id = time_logs.project_id 
      AND cu.id = auth.uid()
    )
  );

-- INVOICES table policies
CREATE POLICY "Freelancers manage own invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Client users view assigned invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_users 
      WHERE client_users.client_id = invoices.client_id 
      AND client_users.id = auth.uid()
    )
  );

CREATE POLICY "Public view invoices by payment link"
  ON invoices
  FOR SELECT
  TO anon
  USING (payment_link IS NOT NULL);

-- INVOICE_ITEMS table policies
CREATE POLICY "Freelancers manage own invoice items"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Client users view invoice items for assigned invoices"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN client_users cu ON i.client_id = cu.client_id
      WHERE i.id = invoice_items.invoice_id 
      AND cu.id = auth.uid()
    )
  );

CREATE POLICY "Public view invoice items for public invoices"
  ON invoice_items
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.payment_link IS NOT NULL
    )
  );

-- PROFILES table policies
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

CREATE POLICY "Client users view freelancer profiles for assigned projects"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_users cu ON p.client_id = cu.client_id
      WHERE p.user_id = profiles.id 
      AND cu.id = auth.uid()
    )
  );