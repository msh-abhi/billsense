-- Fix RLS policies for multi-tenancy
-- Reverts the broken "Users can manage companies" policy and restores granular policies

-- =================================================================
-- 1. Fix Companies Policies
-- =================================================================

-- Cleanup potentially conflicting or broken policies
DROP POLICY IF EXISTS "Users can manage companies" ON companies;
DROP POLICY IF EXISTS "Users can create a company if they do not have one" ON companies;
DROP POLICY IF EXISTS "Users can select their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can delete their own company" ON companies;

-- Add drops for the specific names we are about to create (to be safe/idempotent)
DROP POLICY IF EXISTS "Users can create company" ON companies;
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Users can update own company" ON companies;
DROP POLICY IF EXISTS "Users can delete own company" ON companies;

-- INSERT: Allow if user doesn't have a company yet
CREATE POLICY "Users can create company"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT company_id FROM profiles WHERE id = auth.uid()) IS NULL
  );

-- SELECT: Allow if user belongs to the company
CREATE POLICY "Users can view own company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- UPDATE: Allow if user belongs to the company
CREATE POLICY "Users can update own company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- DELETE: Allow if user belongs to the company
CREATE POLICY "Users can delete own company"
  ON companies
  FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =================================================================
-- 2. Fix Clients Policies
-- =================================================================

DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
DROP POLICY IF EXISTS "Companies can manage their own clients" ON clients;

CREATE POLICY "Companies can manage their own clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =================================================================
-- 3. Ensure Profiles Policies (Safety Check)
-- =================================================================

-- Ensure users can update their own profile (needed for onboarding to set company_id)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Ensure users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
