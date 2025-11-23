import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PayPalPaymentProps {
    invoiceId: string
    amount: number
    currency: string
    invoiceNumber: string
    clientId: string
}

export const PayPalPayment: React.FC<PayPalPaymentProps> = ({
    invoiceId,
    amount,
    currency,
    invoiceNumber,
    clientId
}) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handlePayment = async () => {
        setLoading(true)
        setError(null)

        try {
            // Call edge function to create PayPal order
            const { data, error: functionError } = await supabase.functions.invoke('create-paypal-order', {
                body: {
                    invoiceId,
                    amount,
                    currency,
                    invoiceNumber
                }
            })

            if (functionError) throw functionError

            if (data?.approvalUrl) {
                // Redirect to PayPal
                window.location.href = data.approvalUrl
            } else {
                throw new Error('No PayPal approval URL received')
            }
        } catch (err: any) {
            console.error('Payment error:', err)
            setError(err.message || 'Failed to initiate PayPal payment. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <svg className="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="#003087">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.721-4.459z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900">Pay with PayPal</h3>
                </div>

                <p className="text-gray-700 text-sm mb-6">
                    You'll be redirected to PayPal to complete your payment securely.
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
                    className="w-full bg-[#0070BA] hover:bg-[#003087] disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            Pay {currency} {amount.toLocaleString()} with PayPal
                        </>
                    )}
                </button>

                <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Secured by PayPal
                </div>
            </div>

            <div className="text-center text-sm text-gray-500">
                <p>Your payment information is encrypted and secure</p>
            </div>
        </div>
    )
}
