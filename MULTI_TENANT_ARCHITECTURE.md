# BillSense Multi-Tenant Architecture

## Overview
BillSense is a **multi-tenant SaaS application** where each user/company manages their own API keys and service configurations. **No API keys are hardcoded** in the application.

## API Key Storage

All API keys are stored **per-user/per-company** in Supabase tables:

### 1. Email Settings (`email_settings` table)
```sql
- user_id (references profiles)
- company_id (references companies)
- provider ('brevo' | 'resend' | 'system')
- brevo_config: {
    api_key: string
    sender_name: string
    sender_email: string
  }
- resend_config: {
    api_key: string
    sender_email: string
  }
```

### 2. Payment Gateway Settings (`payment_gateways` table)
```sql
- user_id (references profiles)
- company_id (references companies)
- gateway ('stripe' | 'paypal' | 'wise')
- is_active: boolean
- stripe_config: {
    publishable_key: string
    secret_key: string
  }
- paypal_config: {
    client_id: string
    client_secret: string
  }
- wise_config: {
    api_token: string
  }
```

## How It Works

### Email Sending (Multi-Tenant)

**Edge Function**: `supabase/functions/send-invoice-email/index.ts`

1. User triggers email send (e.g., sending an invoice)
2. Edge function receives request with `user_id` and `company_id`
3. Function fetches user's `email_settings` from Supabase:
   ```typescript
   const { data: emailSettings } = await supabase
     .from('email_settings')
     .select('*')
     .eq('user_id', userId)
     .eq('company_id', companyId)
     .single()
   ```
4. Function uses the user's API key to send email:
   ```typescript
   if (emailSettings.provider === 'brevo') {
     apiKey = emailSettings.brevo_config.api_key
     senderName = emailSettings.brevo_config.sender_name
     senderEmail = emailSettings.brevo_config.sender_email
   }
   ```

### Payment Processing (Multi-Tenant)

**Component**: `src/components/Settings/PaymentSettings.tsx`

1. User configures their payment gateway in Settings
2. API keys are saved to `payment_gateways` table
3. When processing payments, the app fetches the user's specific keys
4. Each transaction uses the user's own payment gateway credentials

## Security Best Practices

### ✅ What We Do
- Store all API keys in Supabase (encrypted at rest)
- Fetch keys per-user/per-company at runtime
- Use Supabase Edge Functions for server-side operations
- Never expose API keys to the client
- Use Row Level Security (RLS) policies

### ❌ What We DON'T Do
- Hardcode API keys in source code
- Store API keys in environment variables (except system fallbacks)
- Share API keys between users/companies
- Expose API keys in client-side code

## Environment Variables

The only environment variables used are:

### Required (Supabase Connection)
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional (System Fallbacks - Not Recommended for Production)
```
BREVO_API_KEY=fallback_system_key  # Only used if user hasn't configured their own
```

**Note**: System fallbacks should only be used for testing or demo purposes. In production, each user should configure their own API keys.

## User Flow

### Setting Up Email
1. User goes to **Settings** → **Email Settings**
2. Selects provider (Brevo or Resend)
3. Enters their own API key and sender details
4. Saves configuration to Supabase
5. All emails sent by this user use their API key

### Setting Up Payments
1. User goes to **Settings** → **Payment Gateways**
2. Selects gateway (Stripe, PayPal, or Wise)
3. Enters their own API credentials
4. Saves configuration to Supabase
5. All payments processed for this user use their credentials

## Database Schema

### Email Settings Table
```sql
CREATE TABLE email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  brevo_config jsonb,
  resend_config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policy: Users can only access their own settings
CREATE POLICY "Users can manage own email settings"
  ON email_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
```

### Payment Gateways Table
```sql
CREATE TABLE payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  gateway text NOT NULL,
  is_active boolean DEFAULT false,
  stripe_config jsonb,
  paypal_config jsonb,
  wise_config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policy: Users can only access their own gateways
CREATE POLICY "Users can manage own payment gateways"
  ON payment_gateways
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
```

## Code References

### Edge Functions
- `supabase/functions/send-invoice-email/index.ts` - Email sending with per-user API keys

### Settings Components
- `src/components/Settings/EmailSettings.tsx` - Email configuration UI
- `src/components/Settings/PaymentSettings.tsx` - Payment gateway configuration UI

### Deprecated Files
- `src/lib/email.ts` - **DEPRECATED**: Now handled by Edge Functions

## Testing Multi-Tenancy

### Test Scenario 1: Multiple Users, Different Email Providers
1. User A configures Brevo with their API key
2. User B configures Resend with their API key
3. Both users send invoices
4. Each email uses the respective user's API key

### Test Scenario 2: Multiple Companies
1. Company A uses Stripe for payments
2. Company B uses PayPal for payments
3. Invoices from Company A show Stripe payment option
4. Invoices from Company B show PayPal payment option

## Compliance

This multi-tenant architecture ensures:
- ✅ **Data Isolation**: Each user's API keys are isolated
- ✅ **Security**: Keys are encrypted at rest in Supabase
- ✅ **Scalability**: No shared rate limits between users
- ✅ **Flexibility**: Users can use their preferred services
- ✅ **Compliance**: Users maintain control of their own credentials

## Summary

BillSense is designed as a true multi-tenant SaaS application where:
- **No API keys are hardcoded**
- **Each user/company manages their own service credentials**
- **All keys are stored securely in Supabase**
- **Edge Functions fetch keys at runtime per user**
- **Complete data and credential isolation between tenants**
