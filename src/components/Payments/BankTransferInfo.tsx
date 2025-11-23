import React, { useState } from 'react'
import { Copy, Check, Building2, CreditCard } from 'lucide-react'

interface BankTransferInfoProps {
    config: {
        bank_name?: string
        account_holder?: string
        account_number?: string
        routing_number?: string
        iban?: string
        swift_code?: string
        sort_code?: string
        bsb_code?: string
    }
    invoiceNumber: string
    currency: string
    amount: number
    onMarkAsPaid?: () => void
}

export const BankTransferInfo: React.FC<BankTransferInfoProps> = ({
    config,
    invoiceNumber,
    currency,
    amount,
    onMarkAsPaid
}) => {
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const CopyButton: React.FC<{ text: string; field: string }> = ({ text, field }) => (
        <button
            onClick={() => copyToClipboard(text, field)}
            className="ml-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Copy to clipboard"
        >
            {copiedField === field ? (
                <Check className="h-4 w-4 text-green-600" />
            ) : (
                <Copy className="h-4 w-4" />
            )}
        </button>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <Building2 className="h-6 w-6 text-blue-600 mr-3" />
                    <h3 className="text-xl font-semibold text-gray-900">Bank Transfer Details</h3>
                </div>
                <p className="text-gray-700 text-sm">
                    Please use the following bank details to complete your payment. Make sure to include the invoice number in your transfer reference.
                </p>
            </div>

            {/* Bank Details Card */}
            <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">Payment Information</h4>
                </div>

                <div className="p-6 space-y-4">
                    {/* Amount */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Amount to Transfer</span>
                            <span className="text-2xl font-bold text-blue-600">
                                {currency} {amount.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Bank Name */}
                    {config.bank_name && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Bank Name</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.bank_name}</span>
                                <CopyButton text={config.bank_name} field="bank_name" />
                            </div>
                        </div>
                    )}

                    {/* Account Holder */}
                    {config.account_holder && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Account Holder</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.account_holder}</span>
                                <CopyButton text={config.account_holder} field="account_holder" />
                            </div>
                        </div>
                    )}

                    {/* Account Number */}
                    {config.account_number && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Account Number</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.account_number}</span>
                                <CopyButton text={config.account_number} field="account_number" />
                            </div>
                        </div>
                    )}

                    {/* Routing Number */}
                    {config.routing_number && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Routing Number</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.routing_number}</span>
                                <CopyButton text={config.routing_number} field="routing_number" />
                            </div>
                        </div>
                    )}

                    {/* IBAN */}
                    {config.iban && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">IBAN</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.iban}</span>
                                <CopyButton text={config.iban} field="iban" />
                            </div>
                        </div>
                    )}

                    {/* SWIFT Code */}
                    {config.swift_code && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">SWIFT/BIC Code</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.swift_code}</span>
                                <CopyButton text={config.swift_code} field="swift_code" />
                            </div>
                        </div>
                    )}

                    {/* Sort Code (UK) */}
                    {config.sort_code && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Sort Code</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.sort_code}</span>
                                <CopyButton text={config.sort_code} field="sort_code" />
                            </div>
                        </div>
                    )}

                    {/* BSB Code (Australia) */}
                    {config.bsb_code && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-600">BSB Code</span>
                            <div className="flex items-center">
                                <span className="font-mono text-gray-900">{config.bsb_code}</span>
                                <CopyButton text={config.bsb_code} field="bsb_code" />
                            </div>
                        </div>
                    )}

                    {/* Reference */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                        <div className="flex items-start">
                            <CreditCard className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-900 mb-1">
                                    Important: Include this reference
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-lg font-bold text-yellow-900">
                                        Invoice #{invoiceNumber}
                                    </span>
                                    <CopyButton text={`Invoice ${invoiceNumber}`} field="reference" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Payment Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Log in to your online banking or visit your bank</li>
                    <li>Set up a new payment using the bank details above</li>
                    <li>Enter the exact amount: <strong>{currency} {amount.toLocaleString()}</strong></li>
                    <li>Include the reference: <strong>Invoice #{invoiceNumber}</strong></li>
                    <li>Complete the transfer</li>
                </ol>
                <p className="text-sm text-gray-600 mt-4">
                    💡 <strong>Tip:</strong> Use the copy buttons to avoid typing errors
                </p>
            </div>

            {/* Mark as Paid Button (Optional) */}
            {onMarkAsPaid && (
                <button
                    onClick={onMarkAsPaid}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                    <Check className="h-5 w-5 mr-2" />
                    I've Completed the Transfer
                </button>
            )}

            {/* Footer Note */}
            <div className="text-center text-sm text-gray-500">
                <p>Payments typically take 1-3 business days to process</p>
                <p className="mt-1">Your invoice will be marked as paid once the payment is received</p>
            </div>
        </div>
    )
}
