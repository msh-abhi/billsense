# BillSense - Smart Invoicing & Time Tracking

Professional invoicing, time tracking, and expense management for freelancers.

**Live Demo**: [https://billsense.netlify.app](https://billsense.netlify.app)

## Features

- 🧾 **Professional Invoicing** - Create and send beautiful invoices
- ⏱️ **Time Tracking** - Track billable hours with built-in timer
- 💳 **Multiple Payment Gateways** - Stripe, PayPal, Wise integration
- 📧 **Email Delivery** - Send invoices via Brevo or Resend
- 📊 **Dashboard & Reports** - Track revenue and business metrics
- 👥 **Client Portal** - Dedicated portal for clients to view invoices
- 🎨 **Customizable PDF Templates** - Professional invoice designs
- 🔒 **Multi-Tenant Architecture** - Each user manages their own API keys

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Deployment**: Netlify
- **Email**: Brevo / Resend (user-configured)
- **Payments**: Stripe / PayPal / Wise (user-configured)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Netlify account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/msh-abhi/billsense.git
   cd billsense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_APP_URL=http://localhost:5173
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

## Deployment

### Deploy to Netlify

1. Push to GitHub
2. Connect to Netlify and select your repository
3. Add environment variables in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL=https://your-site.netlify.app`

4. Configure Supabase Edge Functions:
   - Add `SITE_URL=https://your-site.netlify.app` in Supabase Dashboard

### Updating Domain

When you add a custom domain, just update the environment variables:
- Netlify: `VITE_APP_URL=https://yourdomain.com`
- Supabase: `SITE_URL=https://yourdomain.com`

No code changes needed!

## Multi-Tenant Architecture

BillSense is designed as a multi-tenant SaaS application where each user/company manages their own API keys. See [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) for details.

## Documentation

- [Multi-Tenant Architecture](./MULTI_TENANT_ARCHITECTURE.md)
- [URL Management](./URL_MANAGEMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)

## License

MIT License
