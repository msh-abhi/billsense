import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, DollarSign, FileText, Clock, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generatePDF } from '../../lib/pdfGenerator'
import { BankTransferInfo } from '../Payments/BankTransferInfo'
import { StripePayment } from '../Payments/StripePayment'
import { PayPalPayment } from '../Payments/PayPalPayment'

interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: string;
  notes: string | null;
  clients: { name: string; email: string; address_line1?: string; address_line2?: string; city?: string; state_province?: string; postal_code?: string; country?: string; tin_number?: string; } | null;
  profiles: { id: string; full_name: string; company_name: string | null; email: string; address_line1?: string; address_line2?: string; city?: string; state_province?: string; postal_code?: string; country?: string; vat_number?: string; tin_number?: string; show_address_on_invoice?: boolean; show_vat_on_invoice?: boolean; show_tin_on_invoice?: boolean; } | null;
  invoice_items: Array<{ description: string; quantity: number; rate: number; amount: number; }>;
  payment_gateway?: {
    id: string;
    gateway: 'stripe' | 'paypal' | 'wise' | 'bank_transfer';
    is_active: boolean;
    config: any;
  } | null;
}

export const PublicInvoiceView: React.FC = () => {
  const { paymentLink } = useParams<{ paymentLink: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (paymentLink) {
      loadInvoice()
    } else {
      setError('No invoice link provided.')
      setLoading(false)
    }
  }, [paymentLink])

  const loadInvoice = async () => {
    setLoading(true);
    try {
      if (!paymentLink) throw new Error("Payment link is missing.");

      const { data, error: rpcError } = await supabase.rpc('get_public_invoice', {
        p_payment_link: paymentLink,
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error("Invoice not found for this link.");

      setInvoice(data as Invoice)
    } catch (err: any) {
      console.error('Error loading invoice:', err)
      setError(err.message || 'Invoice not found or no longer available')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (loading || !invoice) {
      alert("Please wait for invoice details to load before downloading.");
      return;
    }
    try {
      await generatePDF(invoice);
    } catch (pdfError: any) {
      console.error('Error generating PDF:', pdfError);
      alert('Failed to generate PDF. ' + pdfError.message);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    if (!invoice) return 'bg-gray-100 text-gray-800'
    const isOverdue = invoice.status === 'sent' && new Date(invoice.due_date) < new Date()
    if (isOverdue) return 'bg-red-100 text-red-800'
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const isOverdue = invoice.status === 'sent' && new Date(invoice.due_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Invoice</h1>
                <p className="text-blue-100 mt-1">#{invoice.invoice_number}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {isOverdue ? 'Overdue' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </div>
                <button onClick={handleGeneratePDF} className="flex items-center px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* From */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">From</h3>
                <div className="text-gray-600">
                  <p className="font-medium text-gray-900">{invoice.profiles?.full_name}</p>
                  {invoice.profiles?.company_name && <p>{invoice.profiles.company_name}</p>}
                  <p>{invoice.profiles?.email}</p>
                </div>
              </div>
              {/* To */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To</h3>
                <div className="text-gray-600">
                  <p className="font-medium text-gray-900">{invoice.clients?.name}</p>
                  <p>{invoice.clients?.email}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="flex items-center"><Calendar className="h-5 w-5 text-gray-400 mr-3" /><div><p className="text-sm text-gray-600">Issue Date</p><p className="font-medium">{formatDate(invoice.issue_date)}</p></div></div>
              <div className="flex items-center"><Clock className="h-5 w-5 text-gray-400 mr-3" /><div><p className="text-sm text-gray-600">Due Date</p><p className="font-medium">{formatDate(invoice.due_date)}</p></div></div>
              <div className="flex items-center"><DollarSign className="h-5 w-5 text-gray-400 mr-3" /><div><p className="text-sm text-gray-600">Amount</p><p className="font-medium text-lg">{invoice.currency} {invoice.total.toLocaleString()}</p></div></div>
            </div>

            {/* --- THIS IS THE RESTORED JSX --- */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.invoice_items && invoice.invoice_items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{invoice.currency} {item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-full max-w-sm">
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{invoice.currency} {invoice.subtotal.toLocaleString()}</span></div>
                  {invoice.tax_rate > 0 && (<div className="flex justify-between"><span className="text-gray-600">Tax ({invoice.tax_rate}%):</span><span className="font-medium">{invoice.currency} {invoice.tax_amount.toLocaleString()}</span></div>)}
                  <div className="border-t pt-2"><div className="flex justify-between text-lg font-bold"><span>Total:</span><span>{invoice.currency} {invoice.total.toLocaleString()}</span></div></div>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><p className="text-gray-700">{invoice.notes}</p></div>
              </div>
            )}

            {invoice.status !== 'paid' && invoice.payment_gateway && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Payment Options</h3>

                {/* Stripe Payment */}
                {invoice.payment_gateway.gateway === 'stripe' && invoice.payment_gateway.config?.publishable_key && (
                  <StripePayment
                    invoiceId={invoice.id}
                    amount={invoice.total}
                    currency={invoice.currency}
                    invoiceNumber={invoice.invoice_number}
                    publishableKey={invoice.payment_gateway.config.publishable_key}
                  />
                )}

                {/* PayPal Payment */}
                {invoice.payment_gateway.gateway === 'paypal' && invoice.payment_gateway.config?.client_id && (
                  <PayPalPayment
                    invoiceId={invoice.id}
                    amount={invoice.total}
                    currency={invoice.currency}
                    invoiceNumber={invoice.invoice_number}
                    clientId={invoice.payment_gateway.config.client_id}
                  />
                )}

                {/* Bank Transfer / Wise */}
                {(invoice.payment_gateway.gateway === 'wise' || invoice.payment_gateway.gateway === 'bank_transfer') && (
                  <BankTransferInfo
                    config={invoice.payment_gateway.config}
                    invoiceNumber={invoice.invoice_number}
                    currency={invoice.currency}
                    amount={invoice.total}
                  />
                )}
              </div>
            )}

            {invoice.status !== 'paid' && !invoice.payment_gateway && (
              <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-600">
                  Payment options are being configured. Please contact the sender for payment instructions.
                </p>
              </div>
            )}

            {invoice.status === 'paid' && (
              <div className="text-center bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">Payment Received</h3>
                <p className="text-green-700">This invoice has been paid. Thank you!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}