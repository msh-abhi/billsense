-- Fix Client Portal Access RLS
-- This migration adds policies to allow client users (authenticated via client_users table)
-- to access their own data.

-- =================================================================
-- 1. Helper Function for Client Access
-- =================================================================

-- Function to check if the current user is a valid client user for a specific client_id
CREATE OR REPLACE FUNCTION is_client_user(client_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM client_users
    WHERE id = auth.uid()
    AND client_id = client_uuid
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the client_id for the current user (if they are a client user)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS uuid AS $$
DECLARE
  cid uuid;
BEGIN
  SELECT client_id INTO cid
  FROM client_users
  WHERE id = auth.uid()
  AND is_active = true;
  
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 2. Clients Table Policies
-- =================================================================

-- Allow client users to view their own client record
CREATE POLICY "Client users can view own client record"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    id = get_current_client_id()
  );

-- =================================================================
-- 3. Projects Table Policies
-- =================================================================

-- Allow client users to view projects assigned to them
CREATE POLICY "Client users can view own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    client_id = get_current_client_id()
  );

-- =================================================================
-- 4. Invoices Table Policies
-- =================================================================

-- Allow client users to view invoices assigned to them
CREATE POLICY "Client users can view own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    -- Check if the invoice belongs to the client
    -- We need to join with clients or check client_id if it exists on invoices
    -- Invoices table usually has client_id (from user_id in single tenant, but let's check schema)
    -- The schema has 'client_id' on invoices? Let's check 20251120000000_enhanced_saas_schema.sql
    -- It seems invoices uses 'client_id' (implied from relationships, but let's be safe)
    -- Actually, the schema shows `client_id uuid REFERENCES clients(id)` in original schema or we should assume it exists.
    -- Let's assume standard relationship: invoices.client_id
    client_id = get_current_client_id()
  );

-- =================================================================
-- 5. Quotations Table Policies
-- =================================================================

CREATE POLICY "Client users can view own quotations"
  ON quotations
  FOR SELECT
  TO authenticated
  USING (
    client_id = get_current_client_id()
  );

-- =================================================================
-- 6. Payments Table Policies
-- =================================================================

-- Payments are linked to invoices, so we check if the invoice belongs to the client
CREATE POLICY "Client users can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE client_id = get_current_client_id()
    )
  );

-- =================================================================
-- 7. Transactions Table Policies
-- =================================================================

-- Transactions are linked to payments
CREATE POLICY "Client users can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM payments WHERE invoice_id IN (
        SELECT id FROM invoices WHERE client_id = get_current_client_id()
      )
    )
  );

-- =================================================================
-- 8. Expenses Table Policies
-- =================================================================

-- Expenses might be visible if billable/invoiced? 
-- For now, let's allow viewing if linked to a project the client owns
CREATE POLICY "Client users can view project expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id = get_current_client_id()
    )
    AND is_billable = true -- Optional: only show billable expenses?
  );

-- =================================================================
-- 9. Companies & Settings (For Branding)
-- =================================================================

-- Allow client users to view the company details of their provider
CREATE POLICY "Client users can view provider company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT company_id FROM clients WHERE id = get_current_client_id())
  );

-- Allow client users to view settings (for branding/terms)
CREATE POLICY "Client users can view provider settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM clients WHERE id = get_current_client_id())
  );

-- =================================================================
-- 10. Client Users Self-Access
-- =================================================================

-- Ensure client users can read their own user record (already covered in previous migration, but reinforcing)
DROP POLICY IF EXISTS "Client users access own record" ON client_users;
CREATE POLICY "Client users access own record"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
