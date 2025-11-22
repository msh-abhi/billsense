/*
  # Enhanced SaaS Schema Migration (Corrected)

  This migration has been corrected to fix dependency and ordering issues.

  Adds missing tables and features for full SaaS invoice management:
  - Multi-tenant companies table
  - Quotations system
  - Payment tracking
  - Expenses
  - Settings management
  - Tags and notifications
  - Enhanced relationships
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =================================================================
-- 1. Schema Changes (Tables and Columns)
-- =================================================================

-- Companies table for multi-tenancy
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address jsonb,
  logo_url text,
  vat_tin text,
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  invoice_prefix text DEFAULT 'INV',
  invoice_next_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update profiles to include company_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Update clients table for multi-tenancy
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='user_id') THEN
    EXECUTE 'UPDATE clients SET company_id = (SELECT p.company_id FROM profiles p WHERE p.id = clients.user_id) WHERE company_id IS NULL';
    -- We will drop the user_id column later, after dropping the policy that depends on it.
  END IF;
END $$;


-- Client users for client portal access
CREATE TABLE IF NOT EXISTS client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  password_hash text,
  is_active boolean DEFAULT true,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rename time_logs to time_entries for consistency
ALTER TABLE time_logs RENAME TO time_entries;
ALTER TABLE time_entries RENAME COLUMN task_description TO description;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS task_id uuid;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_billable boolean DEFAULT true;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS hourly_rate decimal;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  estimated_hours decimal,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  quote_number text UNIQUE NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  subtotal decimal DEFAULT 0,
  tax_rate decimal DEFAULT 0,
  tax_amount decimal DEFAULT 0,
  discount_type text DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal DEFAULT 0,
  discount_amount decimal DEFAULT 0,
  total decimal DEFAULT 0,
  notes text,
  terms text,
  template_id uuid,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhanced invoices with more fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES quotations(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid decimal DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_due decimal;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id uuid;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Update existing invoices company_id
UPDATE invoices SET company_id = (SELECT company_id FROM profiles WHERE profiles.id = invoices.user_id) WHERE company_id IS NULL;

-- Enhanced line_items with quotation support
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES quotations(id);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  payment_date date NOT NULL,
  payment_method text DEFAULT 'bank_transfer' CHECK (payment_method IN ('stripe', 'paypal', 'wise', 'bank_transfer', 'cash', 'other')),
  payment_gateway_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transactions table for gateway tracking
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  gateway text NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'wise')),
  amount decimal NOT NULL,
  currency text DEFAULT 'USD',
  status text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Recurring invoices
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  template_invoice_id uuid REFERENCES invoices(id),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  next_invoice_date date NOT NULL,
  is_active boolean DEFAULT true,
  auto_send boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  category text NOT NULL,
  amount decimal NOT NULL,
  currency text DEFAULT 'USD',
  expense_date date NOT NULL,
  description text,
  receipt_url text,
  is_billable boolean DEFAULT false,
  is_invoiced boolean DEFAULT false,
  invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  invoice_terms text DEFAULT 'Payment is due within 30 days from the date of invoice.',
  invoice_footer text,
  email_signature text,
  pdf_template text DEFAULT 'default',
  pdf_colors jsonb DEFAULT '{"primary": "#0066cc", "secondary": "#666666"}',
  notification_preferences jsonb DEFAULT '{"invoice_sent": true, "payment_received": true, "overdue_reminder": true}',
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'MM/dd/yyyy',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#0066cc',
  created_at timestamptz DEFAULT now()
);

-- Invoice tags junction table
CREATE TABLE IF NOT EXISTS invoice_tags (
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (invoice_id, tag_id)
);

-- Payment gateways configuration
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  gateway text NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'wise')),
  is_enabled boolean DEFAULT false,
  config jsonb, -- Encrypted configuration
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PDF settings
CREATE TABLE IF NOT EXISTS pdf_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  show_logo boolean DEFAULT true,
  show_signature boolean DEFAULT false,
  signature_url text,
  template text DEFAULT 'modern',
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('invoice_sent', 'quotation_sent', 'overdue_reminder', 'payment_received')),
  subject text NOT NULL,
  body text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- =================================================================
-- 2. Indexes
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_billable ON time_entries(is_billable);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_quote_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_is_recurring ON invoices(is_recurring);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_active ON recurring_invoices(is_active);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_tags_company_id ON tags(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =================================================================
-- 3. RLS Policies and Triggers
-- =================================================================

-- Ensure all tables have company_id before creating policies that depend on it.
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE pdf_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE;

-- Update existing projects to set company_id from user_id via profiles
UPDATE projects SET company_id = (SELECT company_id FROM profiles WHERE id = projects.user_id) WHERE company_id IS NULL;

-- Update existing time_entries to set company_id from user_id via profiles
UPDATE time_entries SET company_id = (SELECT company_id FROM profiles WHERE id = time_entries.user_id) WHERE company_id IS NULL;

-- Handle existing pdf_settings: delete rows without company_id as they are incompatible with multi-tenancy
DELETE FROM pdf_settings WHERE company_id IS NULL;
ALTER TABLE pdf_settings ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Update existing email_templates to set company_id from user_id
UPDATE email_templates SET company_id = (SELECT company_id FROM profiles WHERE id = user_id) WHERE company_id IS NULL;

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies first to ensure idempotency
DROP POLICY IF EXISTS "Users can manage their company" ON companies;
DROP POLICY IF EXISTS "Users can create a company if they do not have one" ON companies;
DROP POLICY IF EXISTS "Users can manage their own company" ON companies;
DROP POLICY IF EXISTS "Users can select their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can delete their own company" ON companies;
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
DROP POLICY IF EXISTS "Companies can manage their own clients" ON clients;
DROP POLICY IF EXISTS "Client users access own record" ON client_users;
DROP POLICY IF EXISTS "Companies manage client users" ON client_users;
DROP POLICY IF EXISTS "Companies manage own tasks" ON tasks;
DROP POLICY IF EXISTS "Companies manage own quotations" ON quotations;
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Companies manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Public invoice viewing" ON invoices;
DROP POLICY IF EXISTS "Companies manage own payments" ON payments;
DROP POLICY IF EXISTS "Companies manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Companies manage recurring invoices" ON recurring_invoices;
DROP POLICY IF EXISTS "Companies manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Companies manage own settings" ON settings;
DROP POLICY IF EXISTS "Companies manage own tags" ON tags;
DROP POLICY IF EXISTS "Companies manage payment gateways" ON payment_gateways;
DROP POLICY IF EXISTS "Companies manage PDF settings" ON pdf_settings;
DROP POLICY IF EXISTS "Companies manage email templates" ON email_templates;
DROP POLICY IF EXISTS "Users access own notifications" ON notifications;

-- Now, drop the user_id column from clients, as the dependent policy is gone.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='user_id') THEN
    EXECUTE 'ALTER TABLE clients DROP COLUMN user_id';
  END IF;
END $$;

-- Create new policies

-- Companies table
CREATE POLICY "Users can create a company if they do not have one"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT company_id FROM profiles WHERE id = auth.uid()) IS NULL
  );

CREATE POLICY "Users can select their own company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own company"
  ON companies
  FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clients table (new policy)
CREATE POLICY "Companies can manage their own clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Client users table
CREATE POLICY "Client users access own record"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Companies manage client users"
  ON client_users
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Tasks table
CREATE POLICY "Companies manage own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Quotations table
CREATE POLICY "Companies manage own quotations"
  ON quotations
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Enhanced invoice policies
CREATE POLICY "Companies manage own invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public invoice viewing"
  ON invoices
  FOR SELECT
  TO anon
  USING (payment_link IS NOT NULL);

-- Payments table
CREATE POLICY "Companies manage own payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Transactions table
CREATE POLICY "Companies manage own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Recurring invoices table
CREATE POLICY "Companies manage recurring invoices"
  ON recurring_invoices
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Expenses table
CREATE POLICY "Companies manage own expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Settings table
CREATE POLICY "Companies manage own settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Tags table
CREATE POLICY "Companies manage own tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Payment gateways table
CREATE POLICY "Companies manage payment gateways"
  ON payment_gateways
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- PDF settings table
CREATE POLICY "Companies manage PDF settings"
  ON pdf_settings
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Email templates table
CREATE POLICY "Companies manage email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Notifications table
CREATE POLICY "Users access own notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at BEFORE UPDATE ON client_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_invoices_updated_at ON recurring_invoices;
CREATE TRIGGER update_recurring_invoices_updated_at BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_gateways_updated_at ON payment_gateways;
CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON payment_gateways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON pdf_settings;
CREATE TRIGGER update_pdf_settings_updated_at BEFORE UPDATE ON pdf_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 4. Functions
-- =================================================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT invoice_prefix, invoice_next_number
  INTO prefix, next_num
  FROM companies
  WHERE id = company_uuid;

  IF prefix IS NULL THEN
    prefix := 'INV';
  END IF;

  IF next_num IS NULL THEN
    next_num := 1;
  END IF;

  invoice_num := prefix || LPAD(next_num::TEXT, 5, '0');

  UPDATE companies
  SET invoice_next_number = next_num + 1
  WHERE id = company_uuid;

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  quote_num TEXT;
BEGIN
  -- Use invoice numbering system for quotes too
  SELECT invoice_prefix, invoice_next_number
  INTO prefix, next_num
  FROM companies
  WHERE id = company_uuid;

  IF prefix IS NULL THEN
    prefix := 'QUO';
  END IF;

  IF next_num IS NULL THEN
    next_num := 1;
  END IF;

  quote_num := 'Q-' || prefix || LPAD(next_num::TEXT, 5, '0');

  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- Calculate totals function
CREATE OR REPLACE FUNCTION calculate_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal := COALESCE((
    SELECT SUM(amount) FROM invoice_items
    WHERE invoice_id = NEW.id OR quotation_id = NEW.id
  ), 0);

  -- Calculate tax amount
  NEW.tax_amount := NEW.subtotal * (NEW.tax_rate / 100);

  -- Calculate discount amount
  IF NEW.discount_type = 'percentage' THEN
    NEW.discount_amount := NEW.subtotal * (NEW.discount_value / 100);
  ELSE
    NEW.discount_amount := NEW.discount_value;
  END IF;

  -- Calculate total
  NEW.total := NEW.subtotal + NEW.tax_amount - NEW.discount_amount;

  -- Calculate amount due for invoices
  IF NEW.amount_paid IS NOT NULL THEN
    NEW.amount_due := NEW.total - NEW.amount_paid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for totals calculation
DROP TRIGGER IF EXISTS calculate_invoice_totals ON invoices;
CREATE TRIGGER calculate_invoice_totals
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION calculate_totals();

DROP TRIGGER IF EXISTS calculate_quotation_totals ON quotations;
CREATE TRIGGER calculate_quotation_totals
  BEFORE INSERT OR UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION calculate_totals();