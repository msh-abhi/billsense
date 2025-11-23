import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  invoiceId: string
  recipientEmail: string
  recipientName: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { invoiceId, recipientEmail, recipientName }: EmailRequest = await req.json()

    if (!invoiceId || !recipientEmail) {
      throw new Error('Missing required fields: invoiceId or recipientEmail')
    }

    // Get invoice details with company_id
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        profiles!invoices_user_id_fkey (full_name, company_name, company_id),
        clients (name)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError)
      throw new Error('Invoice not found')
    }

    // Fetch company settings for email provider
    const { data: settings } = await supabaseClient
      .from('settings')
      .select('email_settings')
      .eq('company_id', invoice.profiles.company_id)
      .maybeSingle()

    const emailSettings = settings?.email_settings || { provider: 'system' }

    // Use the deployed site URL - replace with your actual domain
    // Get site URL from environment variable (future-proof for custom domains)
    // Update SITE_URL in Supabase Edge Functions settings when domain changes
    const siteUrl = Deno.env.get('SITE_URL') || 'https://billsense.netlify.app'

    // Generate public invoice link
    const invoiceLink = `${siteUrl}/invoice/public/${invoice.payment_link}`

    const htmlContent = generateInvoiceEmailHTML(
      invoice.profiles.full_name,
      recipientName,
      invoice.invoice_number,
      invoice.total,
      invoice.currency,
      new Date(invoice.due_date).toLocaleDateString(),
      invoiceLink,
      invoice.notes
    )

    const subject = `Invoice ${invoice.invoice_number} from ${invoice.profiles.full_name}`

    // Determine provider and send email
    if (emailSettings.provider === 'resend' && emailSettings.resend_config?.api_key) {
      // Send via Resend
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailSettings.resend_config.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${emailSettings.resend_config.sender_name} <${emailSettings.resend_config.sender_email}>`,
          to: [recipientEmail],
          subject: subject,
          html: htmlContent
        })
      })

      if (!resendRes.ok) {
        const errorText = await resendRes.text()
        console.error('Resend API error:', errorText)
        throw new Error(`Resend API error: ${resendRes.statusText} - ${errorText}`)
      }

    } else {
      // Default to Brevo (System or Custom)
      // Multi-tenant: API key is fetched from user's email_settings in Supabase
      let apiKey = Deno.env.get('BREVO_API_KEY') // Fallback only, should use user's key
      let senderName = 'BillSense'
      let senderEmail = 'noreply@billsense.com'

      if (emailSettings.provider === 'brevo' && emailSettings.brevo_config?.api_key) {
        apiKey = emailSettings.brevo_config.api_key
        senderName = emailSettings.brevo_config.sender_name || senderName
        senderEmail = emailSettings.brevo_config.sender_email || senderEmail
      }

      const emailData = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: subject,
        htmlContent: htmlContent
      }

      const brevoResponse = await fetch('https://api.sendinblue.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(emailData)
      })

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text()
        console.error('Brevo API error:', errorText)
        throw new Error(`Brevo API error: ${brevoResponse.statusText} - ${errorText}`)
      }
    }

    // Update invoice status to 'sent'
    await supabaseClient
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoiceId)

    return new Response(
      JSON.stringify({ success: true, message: 'Invoice email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function generateInvoiceEmailHTML(
  freelancerName: string,
  clientName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  dueDate: string,
  invoiceLink: string,
  notes?: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #1f2937; 
          background-color: #f3f4f6; 
          padding: 20px;
        }
        .email-wrapper { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }
        .header { 
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; 
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 { 
          font-size: 24px; 
          font-weight: 600; 
          margin-bottom: 8px;
        }
        .header p { 
          font-size: 15px; 
          opacity: 0.95;
        }
        .content { 
          padding: 40px 30px;
        }
        .greeting { 
          font-size: 16px; 
          color: #374151;
          margin-bottom: 20px;
        }
        .invoice-card { 
          background: linear-gradient(to bottom, #f9fafb, #ffffff);
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 24px;
          margin: 24px 0;
        }
        .invoice-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }
        .invoice-number { 
          font-size: 14px; 
          color: #6b7280;
          font-weight: 500;
        }
        .invoice-number span { 
          color: #1f2937;
          font-weight: 600;
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-row:last-child { 
          border-bottom: none;
        }
        .detail-label { 
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        .detail-value { 
          font-size: 14px;
          color: #1f2937;
          font-weight: 600;
        }
        .amount-row { 
          background: #f0f9ff;
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }
        .amount { 
          font-size: 28px; 
          font-weight: 700; 
          color: #2563eb;
        }
        .notes-box { 
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .notes-box strong { 
          color: #92400e;
          display: block;
          margin-bottom: 8px;
        }
        .notes-box p { 
          color: #78350f;
          font-size: 14px;
          line-height: 1.5;
        }
        .cta-section { 
          text-align: center; 
          margin: 32px 0;
        }
        .cta-button { 
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 16px 40px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
          transition: all 0.2s;
        }
        .cta-button:hover { 
          box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3);
          transform: translateY(-1px);
        }
        .payment-info { 
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .payment-info p { 
          color: #166534;
          font-size: 14px;
          margin: 4px 0;
        }
        .payment-info strong { 
          color: #15803d;
        }
        .help-text { 
          color: #6b7280;
          font-size: 14px;
          text-align: center;
          margin: 20px 0;
        }
        .footer { 
          background: #f9fafb;
          padding: 24px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-brand { 
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .footer-tagline { 
          font-size: 13px;
          color: #6b7280;
        }
        .footer-link { 
          color: #3b82f6;
          text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .invoice-card { padding: 16px; }
          .amount { font-size: 24px; }
          .cta-button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>📄 New Invoice Received</h1>
          <p>From ${freelancerName}</p>
        </div>
        
        <div class="content">
          <p class="greeting">Hello ${clientName},</p>
          <p class="greeting">You have received a new invoice. Please review the details below:</p>
          
          <div class="invoice-card">
            <div class="invoice-header">
              <div class="invoice-number">Invoice <span>#${invoiceNumber}</span></div>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">From</span>
              <span class="detail-value">${freelancerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Due Date</span>
              <span class="detail-value">${dueDate}</span>
            </div>
            
            <div class="amount-row">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="detail-label" style="font-size: 16px;">Total Amount</span>
                <span class="amount">${currency} ${amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          ${notes ? `
          <div class="notes-box">
            <strong>📝 Notes from ${freelancerName}</strong>
            <p>${notes}</p>
          </div>
          ` : ''}
          
          <div class="payment-info">
            <p><strong>💳 Multiple Payment Options Available</strong></p>
            <p>Pay securely online with your preferred payment method</p>
          </div>
          
          <div class="cta-section">
            <a href="${invoiceLink}" class="cta-button">View & Pay Invoice →</a>
          </div>
          
          <p class="help-text">
            Click the button above to view the full invoice and make a secure payment online.<br>
            If you have any questions, please contact ${freelancerName} directly.
          </p>
        </div>
        
        <div class="footer">
          <div class="footer-brand">BillSense</div>
          <p class="footer-tagline">Professional invoicing and time tracking for freelancers</p>
        </div>
      </div>
    </body>
    </html>
  `
}