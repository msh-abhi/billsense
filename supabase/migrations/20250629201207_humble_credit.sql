/*
  # Client Portal Authentication and RLS Setup

  1. New Tables
    - `client_users`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `email` (text, unique)
      - `password_hash` (text)
      - `is_active` (boolean, default true)
      - `last_login` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Enhanced RLS Policies
    - Add policies for client users to view their own data
    - Ensure clients can only see data related to their client_id
    - Add public policies for client authentication

  3. Security
    - Enable RLS on all relevant tables for client access
    - Add client-specific policies for projects, time_logs, and invoices
*/

-- Client users table for authentication
CREATE TABLE IF NOT EXISTS client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Client users can read their own data
CREATE POLICY "Client users can read own data"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Freelancers can manage client users for their clients
CREATE POLICY "Freelancers can manage client users for own clients"
  ON client_users
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Public policy for client authentication (needed for login)
CREATE POLICY "Public can read client users for authentication"
  ON client_users
  FOR SELECT
  TO anon
  USING (true);

-- Enhanced RLS policies for client access to projects
CREATE POLICY "Clients can view own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE id = auth.uid()
    )
  );

-- Enhanced RLS policies for client access to time logs
CREATE POLICY "Clients can view time logs for own projects"
  ON time_logs
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN client_users cu ON p.client_id = cu.client_id
      WHERE cu.id = auth.uid()
    )
  );

-- Enhanced RLS policies for client access to invoices
CREATE POLICY "Clients can view own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE id = auth.uid()
    )
  );

-- Enhanced RLS policies for client access to invoice items
CREATE POLICY "Clients can view invoice items for own invoices"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN client_users cu ON i.client_id = cu.client_id
      WHERE cu.id = auth.uid()
    )
  );

-- Enhanced RLS policies for client access to client data
CREATE POLICY "Clients can view own client data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM client_users WHERE id = auth.uid()
    )
  );

-- Enhanced RLS policies for client access to freelancer profile (for branding)
CREATE POLICY "Clients can view freelancer profile for their projects"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT p.user_id FROM projects p
      JOIN client_users cu ON p.client_id = cu.client_id
      WHERE cu.id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);

-- Trigger for client_users updated_at
CREATE TRIGGER update_client_users_updated_at BEFORE UPDATE ON client_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create client user account
CREATE OR REPLACE FUNCTION create_client_user(
  p_client_id uuid,
  p_email text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
BEGIN
  -- Hash the password (in production, use a proper hashing function)
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Insert client user
  INSERT INTO client_users (client_id, email, password_hash)
  VALUES (p_client_id, p_email, v_password_hash)
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- Function to authenticate client user
CREATE OR REPLACE FUNCTION authenticate_client_user(
  p_email text,
  p_password text
)
RETURNS TABLE(
  user_id uuid,
  client_id uuid,
  client_name text,
  freelancer_name text,
  freelancer_company text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id,
    cu.client_id,
    c.name,
    pr.full_name,
    pr.company_name
  FROM client_users cu
  JOIN clients c ON cu.client_id = c.id
  JOIN profiles pr ON c.user_id = pr.id
  WHERE cu.email = p_email 
    AND cu.password_hash = crypt(p_password, cu.password_hash)
    AND cu.is_active = true;
END;
$$;