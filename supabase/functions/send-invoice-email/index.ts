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
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 40px 30px; }
        .invoice-details { background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; }
        .invoice-details h2 { margin-top: 0; color: #495057; font-size: 20px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .detail-label { font-weight: 600; color: #6c757d; }
        .detail-value { color: #495057; }
        .amount { font-size: 24px; font-weight: bold; color: #28a745; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center; }
        .notes { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice Received</h1>
          <p>You have received a new invoice from ${freelancerName}</p>
        </div>
        
        <div class="content">
          <p>Hello ${clientName},</p>
          <p>You have received a new invoice. Please find the details below:</p>
          
          <div class="invoice-details">
            <h2>Invoice Details</h2>
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span class="detail-value">${invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">From:</span>
              <span class="detail-value">${freelancerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${dueDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value amount">${currency} ${amount.toLocaleString()}</span>
            </div>
          </div>
          
          ${notes ? `<div class="notes"><strong>Notes:</strong><br>${notes}</div>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceLink}" class="cta-button">View & Pay Invoice</a>
          </div>
          
          <p>Click the button above to view the full invoice and make payment securely online.</p>
          <p>If you have any questions about this invoice, please contact ${freelancerName} directly.</p>
        </div>
        
        <div class="footer">
          <p>This invoice was sent via BillSense</p>
          <p>Professional time tracking and invoicing for freelancers</p>
        </div>
      </div>
    </body>
    </html>
  `
}