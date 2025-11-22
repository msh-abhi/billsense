import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

export { stripePromise }

// Create a payment intent
export const createPaymentIntent = async (invoiceId: string, amount: number, currency: string = 'usd') => {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        invoiceId,
        amount,
        currency
      }
    })

    if (error) throw error
    return data as {
      clientSecret: string
      paymentIntentId: string
      amount: number
      currency: string
      publishableKey: string
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

// Handle successful payment
export const handlePaymentSuccess = async (paymentIntentId: string, invoiceId: string) => {
  try {
    // Record the payment in our database
    const { data: invoice } = await supabase
      .from('invoices')
      .select('company_id, total, amount_paid, amount_due, currency')
      .eq('id', invoiceId)
      .single()

    if (!invoice) throw new Error('Invoice not found')

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        company_id: invoice.company_id,
        invoice_id: invoiceId,
        amount: invoice.amount_due || invoice.total,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'stripe',
        payment_gateway_id: paymentIntentId,
        status: 'completed'
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        company_id: invoice.company_id,
        payment_id: payment.id,
        transaction_id: paymentIntentId,
        gateway: 'stripe',
        amount: payment.amount,
        currency: invoice.currency,
        status: 'completed'
      })

    if (transactionError) throw transactionError

    // Update invoice status
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: (invoice.amount_paid || 0) + payment.amount,
        amount_due: Math.max(0, (invoice.amount_due || invoice.total) - payment.amount),
        status: (invoice.amount_due || invoice.total) <= payment.amount ? 'paid' : 'partial',
        paid_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    return payment
  } catch (error) {
    console.error('Error handling payment success:', error)
    throw error
  }
}

// Get payment link for invoice
export const generatePaymentLink = async (invoiceId: string) => {
  try {
    const paymentLink = `${window.location.origin}/invoice/pay/${invoiceId}`

    // Update invoice with payment link
    const { error } = await supabase
      .from('invoices')
      .update({ payment_link: paymentLink })
      .eq('id', invoiceId)

    if (error) throw error

    return paymentLink
  } catch (error) {
    console.error('Error generating payment link:', error)
    throw error
  }
}
