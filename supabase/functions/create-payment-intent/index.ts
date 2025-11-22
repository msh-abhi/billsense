import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  invoiceId: string
  amount: number
  currency?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { invoiceId, amount, currency = 'usd' }: PaymentRequest = await req.json()

    // Get invoice details to find company_id
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        clients (name, email)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    // Get payment gateway configuration for the company
    const { data: gateway, error: gatewayError } = await supabaseClient
      .from('payment_gateways')
      .select('config')
      .eq('company_id', invoice.company_id)
      .eq('gateway', 'stripe')
      .eq('is_enabled', true)
      .single()

    if (gatewayError || !gateway || !gateway.config?.secret_key) {
      throw new Error('Stripe payment gateway not configured for this company')
    }

    const stripeSecretKey = gateway.config.secret_key
    const stripePublishableKey = gateway.config.publishable_key

    // Initialize Stripe with dynamic key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        client_name: invoice.clients?.name,
        client_email: invoice.clients?.email
      },
      description: `Payment for Invoice ${invoice.invoice_number}`,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        publishableKey: stripePublishableKey // Return PK to frontend
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
