import React, { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface StripePaymentProps {
    invoiceId: string
    amount: number
    currency: string
    invoiceNumber: string
    publishableKey: string
}

export const StripePayment: React.FC<StripePaymentProps> = ({
    invoiceId,
    amount,
    currency,
    invoiceNumber,
    publishableKey
}) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handlePayment = async () => {
        setLoading(true)
        setError(null)

        try {
            // Call edge function to create Stripe Checkout Session
            const { data, error: functionError } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    invoiceId,
                    amount,
                    currency,
                    invoiceNumber
                }
            })

            if (functionError) throw functionError

            if (data?.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url
            } else {
                throw new Error('No checkout URL received')
            }
        } catch (err: any) {
            console.error('Payment error:', err)
            setError(err.message || 'Failed to initiate payment. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <CreditCard className="h-6 w-6 text-blue-600 mr-3" />
                    <h3 className="text-xl font-semibold text-gray-900">Pay with Card</h3>
                </div>

                <p className="text-gray-700 text-sm mb-6">
                    You'll be redirected to Stripe's secure payment page to complete your payment.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Amount to Pay</span>
                        <span className="text-2xl font-bold text-blue-600">
                            {currency} {amount.toLocaleString()}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Pay {currency} {amount.toLocaleString()} with Stripe
                        </>
                    )}
                </button>

                <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Secured by Stripe
                </div>
            </div>

            <div className="text-center text-sm text-gray-500">
                <p>Your payment information is encrypted and secure</p>
            </div>
        </div>
    )
}
