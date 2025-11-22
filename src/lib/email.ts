import SibApiV3Sdk from '@sendinblue/client'

// NOTE: This file is deprecated in favor of Supabase Edge Functions
// API keys are stored per-user in Supabase email_settings table
// Email sending is handled by supabase/functions/send-invoice-email/index.ts
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export interface EmailTemplate {
  to: string
  subject: string
  htmlContent: string
  textContent?: string
  senderName?: string
  senderEmail?: string
}

export const sendEmail = async (emailData: EmailTemplate): Promise<boolean> => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    sendSmtpEmail.to = [{ email: emailData.to }]
    sendSmtpEmail.sender = {
      name: emailData.senderName || 'BillSense',
      email: emailData.senderEmail || 'noreply@billsense.com'
    }
    sendSmtpEmail.subject = emailData.subject
    sendSmtpEmail.htmlContent = emailData.htmlContent

    if (emailData.textContent) {
      sendSmtpEmail.textContent = emailData.textContent
    }

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail)
    console.log('Email sent successfully:', response)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

export const generateInvoiceEmailTemplate = (
  freelancerName: string,
  clientName: string,
  invoiceNumber: string,
  invoiceAmount: number,
  currency: string,
  dueDate: string,
  invoiceLink: string,
  notes?: string
): EmailTemplate => {
  const subject = `Invoice ${invoiceNumber} from ${freelancerName}`

  const htmlContent = `
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
        .cta-button:hover { opacity: 0.9; }
        .notes { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .footer a { color: #667eea; text-decoration: none; }
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
              <span class="detail-value amount">${currency} ${invoiceAmount.toLocaleString()}</span>
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
          <p>This invoice was sent via <a href="#">BillSense</a></p>
          <p>Professional time tracking and invoicing for freelancers</p>
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `
    Invoice ${invoiceNumber} from ${freelancerName}
    
    Hello ${clientName},
    
    You have received a new invoice with the following details:
    
    Invoice Number: ${invoiceNumber}
    From: ${freelancerName}
    Amount: ${currency} ${invoiceAmount.toLocaleString()}
    Due Date: ${dueDate}
    
    ${notes ? `Notes: ${notes}` : ''}
    
    View and pay your invoice: ${invoiceLink}
    
    If you have any questions about this invoice, please contact ${freelancerName} directly.
    
    ---
    This invoice was sent via BillSense
    Professional time tracking and invoicing for freelancers
  `

  return {
    to: '',
    subject,
    htmlContent,
    textContent
  }
}

export const generateWelcomeEmailTemplate = (
  userName: string,
  userEmail: string
): EmailTemplate => {
  const subject = 'Welcome to BillSense!'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to BillSense</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; font-weight: 300; }
        .content { padding: 40px 30px; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .feature-list li:before { content: "✓"; color: #28a745; font-weight: bold; margin-right: 10px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to BillSense!</h1>
          <p>Your professional time tracking and invoicing platform</p>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Welcome to BillSense! We're excited to help you streamline your freelance business with our powerful time tracking and invoicing tools.</p>
          
          <h2>What you can do with BillSense:</h2>
          <ul class="feature-list">
            <li>Track time for multiple projects and clients</li>
            <li>Generate professional invoices automatically</li>
            <li>Accept payments via Stripe, PayPal, and Wise</li>
            <li>Manage clients and projects efficiently</li>
            <li>Monitor your earnings and productivity</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" class="cta-button">Get Started Now</a>
          </div>
          
          <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
          
          <p>Happy freelancing!</p>
          <p>The BillSense Team</p>
        </div>
        
        <div class="footer">
          <p>BillSense - Professional time tracking and invoicing for freelancers</p>
        </div>
      </div>
    </body>
    </html>
  `

  return {
    to: userEmail,
    subject,
    htmlContent
  }
}

export const generatePaymentConfirmationTemplate = (
  clientName: string,
  freelancerName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  paymentMethod: string
): EmailTemplate => {
  const subject = `Payment Confirmation - Invoice ${invoiceNumber}`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 40px 30px; }
        .payment-details { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 25px; border-radius: 8px; margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #c3e6cb; }
        .detail-label { font-weight: 600; color: #155724; }
        .detail-value { color: #155724; }
        .amount { font-size: 24px; font-weight: bold; color: #28a745; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Received!</h1>
          <p>Thank you for your payment</p>
        </div>
        
        <div class="content">
          <p>Hello ${clientName},</p>
          <p>We have successfully received your payment. Here are the details:</p>
          
          <div class="payment-details">
            <h2>Payment Confirmation</h2>
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span class="detail-value">${invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Paid To:</span>
              <span class="detail-value">${freelancerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount Paid:</span>
              <span class="detail-value amount">${currency} ${amount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">${paymentMethod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          
          <p>Your payment has been processed successfully. ${freelancerName} has been notified of this payment.</p>
          <p>Thank you for your business!</p>
        </div>
        
        <div class="footer">
          <p>This confirmation was sent via BillSense</p>
        </div>
      </div>
    </body>
    </html>
  `

  return {
    to: '',
    subject,
    htmlContent
  }
}