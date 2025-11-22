-- Fix missing RLS policies for core tables
-- Ensures that Projects, Invoices, Quotations, Expenses, and Time Entries can be managed by company users

-- =================================================================
-- 1. Projects
-- =================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own projects" ON projects;

CREATE POLICY "Companies manage own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =================================================================
-- 2. Invoices
-- =================================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;

CREATE POLICY "Companies manage own invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =================================================================
-- 3. Quotations
-- =================================================================
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own quotations" ON quotations;

CREATE POLICY "Companies manage own quotations"
  ON quotations
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =================================================================
-- 4. Expenses
-- =================================================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own expenses" ON expenses;

CREATE POLICY "Companies manage own expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =================================================================
-- 5. Time Entries
-- =================================================================
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own time entries" ON time_entries;

CREATE POLICY "Companies manage own time entries"
  ON time_entries
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
