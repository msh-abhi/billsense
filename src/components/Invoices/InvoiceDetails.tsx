import React, { useState, useEffect } from 'react'
import { X, Edit, Send, Copy, Eye, Download, Mail, Clock, DollarSign, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Toast } from '../common/Toast'
import { generatePDF } from '../../lib/pdfGenerator'

interface InvoiceDetailsProps {
  invoice: {
    id: string
    invoice_number: string
    client_name: string
    client_email: string
    issue_date: string
    due_date: string
    total: number
    currency: string
    status: string
    payment_link: string | null
    created_at: string
  }
  onClose: () => void
  onEdit: (invoice: any) => void
  onStatusUpdate: () => void
}

interface InvoiceData {
  id: string
  user_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  status: string
  notes: string | null
  payment_link: string | null
  created_at: string
  updated_at: string
  clients: {
    name: string
    email: string
  }
  profiles: {
    id: string
    full_name: string
    company_name: string | null
    email: string
  }
  invoice_items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
  payment_gateways: {
    gateway: string
    config: any
  } | null
}

interface EmailLog {
  id: string
  sent_at: string
  recipient_email: string
  subject: string
  status: 'sent' | 'delivered' | 'opened' | 'failed'
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  onClose,
  onEdit,
  onStatusUpdate
}) => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null)

  useEffect(() => {
    loadInvoiceDetails()
    loadEmailLogs()
  }, [invoice.id])

  const loadInvoiceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, email),
          profiles (id, full_name, company_name, email),
          invoice_items (description, quantity, rate, amount),
          payment_gateways (gateway, config)
        `)
        .eq('id', invoice.id)
        .single()

      if (error) throw error
      setInvoiceData(data)
    } catch (error) {
      console.error('Error loading invoice details:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmailLogs = async () => {
    // Mock email logs for now - in a real app, you'd store these in the database
    const mockLogs: EmailLog[] = [
      {
        id: '1',
        sent_at: new Date().toISOString(),
        recipient_email: invoice.client_email,
        subject: `Invoice ${invoice.invoice_number} from BillSense`,
        status: 'sent'
      }
    ]
    setEmailLogs(mockLogs)
  }

  const handleSendInvoice = async () => {
    setSending(true)
    try {
      // Generate payment link if it doesn't exist
      let paymentLink = invoiceData?.payment_link
      if (!paymentLink) {
        paymentLink = `invoice-${invoice.id}-${Date.now()}`

        const { error: updateError } = await supabase
          .from('invoices')
          .update({ payment_link: paymentLink })
          .eq('id', invoice.id)

        if (updateError) throw updateError
      }

      // Call edge function to send email
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          recipientEmail: invoice.client_email,
          recipientName: invoice.client_name
        }
      })

      if (error) throw error

      setToast({
        type: 'success',
        message: `Invoice sent successfully to ${invoice.client_email}!`
      })

      onStatusUpdate()
      loadEmailLogs() // Refresh email logs
    } catch (error) {
      console.error('Error sending invoice:', error)
      setToast({
        type: 'error',
        message: 'Failed to send invoice. Please try again.'
      })
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoice.id)

      if (error) throw error

      setToast({
        type: 'success',
        message: `Invoice ${invoice.invoice_number} marked as paid!`
      })

      onStatusUpdate()
      loadInvoiceDetails()
    } catch (error) {
      console.error('Error updating invoice status:', error)
      setToast({
        type: 'error',
        message: 'Failed to update invoice status'
      })
    }
  }

  const copyPaymentLink = () => {
    if (invoiceData?.payment_link) {
      const link = `${window.location.origin}/invoice/public/${invoiceData.payment_link}`
      navigator.clipboard.writeText(link)
      setToast({
        type: 'success',
        message: 'Payment link copied to clipboard!'
      })
    }
  }

  const viewInvoice = () => {
    if (invoiceData?.payment_link) {
      window.open(`/invoice/public/${invoiceData.payment_link}`, '_blank')
    }
  }

  const handleGeneratePDF = async () => {
    if (!invoiceData) return

    try {
      await generatePDF(invoiceData)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setToast({
        type: 'error',
        message: 'Failed to generate PDF'
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = invoiceData?.status === 'sent' && new Date(invoiceData.due_date) < new Date()

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    )
  }

  if (!invoiceData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Failed to load invoice details</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Invoice #{invoiceData.invoice_number}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Created {formatDateTime(invoiceData.created_at)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Invoice Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Client</span>
                </div>
                <p className="font-semibold text-gray-900">{invoiceData.clients.name}</p>
                <p className="text-sm text-gray-600">{invoiceData.clients.email}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Due Date</span>
                </div>
                <p className="font-semibold text-gray-900">{formatDate(invoiceData.due_date)}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${isOverdue ? 'bg-red-100 text-red-800' : getStatusColor(invoiceData.status)
                  }`}>
                  {isOverdue ? 'Overdue' : invoiceData.status.charAt(0).toUpperCase() + invoiceData.status.slice(1)}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Amount</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {invoiceData.currency} {invoiceData.total.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Action Buttons - Modern, Clean Design */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onEdit(invoiceData)}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Invoice
              </button>

              {invoiceData.status === 'draft' && (
                <button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Invoice'}
                </button>
              )}

              {(invoiceData.status === 'sent' || invoiceData.status === 'paid') && (
                <button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="flex items-center px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 transition-colors"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Again'}
                </button>
              )}

              {invoiceData.status === 'sent' && (
                <button
                  onClick={handleMarkAsPaid}
                  className="flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Mark as Paid
                </button>
              )}

              {invoiceData.payment_link && (
                <>
                  <button
                    onClick={viewInvoice}
                    className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Invoice
                  </button>

                  <button
                    onClick={copyPaymentLink}
                    className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </button>
                </>
              )}

              <button
                onClick={handleGeneratePDF}
                className="flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            </div>

            {/* Invoice Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoiceData.invoice_items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {invoiceData.currency} {item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{invoiceData.currency} {invoiceData.subtotal.toLocaleString()}</span>
                  </div>
                  {invoiceData.tax_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({invoiceData.tax_rate}%):</span>
                      <span className="font-medium">{invoiceData.currency} {invoiceData.tax_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{invoiceData.currency} {invoiceData.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-700">{invoiceData.notes}</p>
                </div>
              </div>
            )}

            {/* Email History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email History</h3>
              {emailLogs.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No emails sent yet</p>
                  <p className="text-sm text-gray-400 mt-1">Send the invoice to start tracking email activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{log.subject}</p>
                          <p className="text-sm text-gray-600">To: {log.recipient_email}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            log.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              log.status === 'opened' ? 'bg-purple-100 text-purple-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{formatDateTime(log.sent_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Details */}
            {invoiceData.payment_gateways && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Details</h3>
                <div className="text-sm text-gray-600">
                  <p className="font-medium capitalize mb-1">{invoiceData.payment_gateways.gateway}</p>
                  {invoiceData.payment_gateways.gateway === 'wise' && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      {invoiceData.payment_gateways.config.bank_name && (
                        <>
                          <span className="text-gray-500">Bank:</span>
                          <span>{invoiceData.payment_gateways.config.bank_name}</span>
                        </>
                      )}
                      {invoiceData.payment_gateways.config.account_number && (
                        <>
                          <span className="text-gray-500">Account:</span>
                          <span>{invoiceData.payment_gateways.config.account_number}</span>
                        </>
                      )}
                      {invoiceData.payment_gateways.config.routing_number && (
                        <>
                          <span className="text-gray-500">Routing:</span>
                          <span>{invoiceData.payment_gateways.config.routing_number}</span>
                        </>
                      )}
                      {invoiceData.payment_gateways.config.iban && (
                        <>
                          <span className="text-gray-500">IBAN:</span>
                          <span>{invoiceData.payment_gateways.config.iban}</span>
                        </>
                      )}
                      {invoiceData.payment_gateways.config.swift_code && (
                        <>
                          <span className="text-gray-500">SWIFT:</span>
                          <span>{invoiceData.payment_gateways.config.swift_code}</span>
                        </>
                      )}
                    </div>
                  )}
                  {invoiceData.payment_gateways.gateway === 'stripe' && (
                    <p>Credit Card payments accepted via secure link.</p>
                  )}
                  {invoiceData.payment_gateways.gateway === 'paypal' && (
                    <p>PayPal payments accepted.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}