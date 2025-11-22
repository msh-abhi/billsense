import React, { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createPaymentIntent, handlePaymentSuccess } from '../../lib/stripe'
import { X, CreditCard, Loader } from 'lucide-react'

interface StripePaymentModalProps {
  invoiceId: string
  amount: number
  currency: string
  invoiceNumber: string
  clientName: string
  onSuccess: () => void
  onClose: () => void
}

interface CheckoutFormProps {
  amount: number
  currency: string
  invoiceId: string
  invoiceNumber: string
  clientName: string
  onSuccess: () => void
  onClose: () => void
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  amount,
  currency,
  invoiceId,
  invoiceNumber,
  clientName,
  onSuccess,
  onClose
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required'
      })

      if (error) {
        setMessage(error.message || 'Payment failed')
        setIsLoading(false)
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Handle successful payment
        await handlePaymentSuccess(paymentIntent.id, invoiceId)
        setMessage('Payment successful!')
        onSuccess()
        setTimeout(() => onClose(), 2000)
      }
    } catch (error) {
      setMessage('Payment processing failed')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Invoice:</span>
          <span className="font-medium">{invoiceNumber}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Client:</span>
          <span className="font-medium">{clientName}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-xl font-bold text-green-600">
            {currency.toUpperCase()} {amount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <PaymentElement
          options={{
            layout: 'tabs'
          }}
        />

        {message && (
          <div className={`p-3 rounded-md text-sm ${message.includes('successful')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            {message}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {currency.toUpperCase()} {amount.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  invoiceId,
  amount,
  currency,
  invoiceNumber,
  clientName,
  onSuccess,
  onClose
}) => {
  const [clientSecret, setClientSecret] = useState('')
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const response = await createPaymentIntent(invoiceId, amount, currency)
        setClientSecret(response.clientSecret)

        if (response.publishableKey) {
          setStripePromise(loadStripe(response.publishableKey))
        } else {
          throw new Error('No publishable key returned from server')
        }
      } catch (error: any) {
        console.error('Error initializing payment:', error)
        setError(error.message || 'Failed to initialize payment')
      } finally {
        setLoading(false)
      }
    }

    initializePayment()
  }, [invoiceId, amount, currency])

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Preparing payment...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Error</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm
              amount={amount}
              currency={currency}
              invoiceId={invoiceId}
              invoiceNumber={invoiceNumber}
              clientName={clientName}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  )
}
