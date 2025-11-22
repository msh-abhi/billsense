import React, { useState } from 'react'
import { MoreVertical, Calendar, DollarSign, User, Edit, Trash2, Send, Eye, Copy, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Toast } from '../common/Toast'
import { ConfirmationModal } from '../common/ConfirmationModal'

interface Invoice {
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

interface InvoiceCardProps {
  invoice: Invoice
  onEdit: (invoice: Invoice) => void
  onDelete: (invoiceId: string) => void
  onStatusUpdate: () => void
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ 
  invoice, 
  onEdit, 
  onDelete, 
  onStatusUpdate 
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null)
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean, title: string, message: string } | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'sent': return 'Sent'
      case 'paid': return 'Paid'
      case 'overdue': return 'Overdue'
      default: return status
    }
  }

  const isOverdue = invoice.status === 'sent' && new Date(invoice.due_date) < new Date()

  const handleSendInvoice = async () => {
    setLoading(true)
    try {
      // Generate payment link if it doesn't exist
      let paymentLink = invoice.payment_link
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

      setConfirmationModal({
        isOpen: true,
        title: 'Invoice Sent Successfully!',
        message: `Invoice ${invoice.invoice_number} has been sent to ${invoice.client_email}`
      })
      
      onStatusUpdate()
    } catch (error) {
      console.error('Error sending invoice:', error)
      setToast({
        type: 'error',
        message: 'Failed to send invoice. Please try again.'
      })
    } finally {
      setLoading(false)
      setShowMenu(false)
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
    } catch (error) {
      console.error('Error updating invoice status:', error)
      setToast({
        type: 'error',
        message: 'Failed to update invoice status'
      })
    }
    setShowMenu(false)
  }

  const copyPaymentLink = () => {
    if (invoice.payment_link) {
      const link = `${window.location.origin}/invoice/public/${invoice.payment_link}`
      navigator.clipboard.writeText(link)
      setToast({
        type: 'success',
        message: 'Payment link copied to clipboard!'
      })
    }
    setShowMenu(false)
  }

  const viewInvoice = () => {
    if (invoice.payment_link) {
      window.open(`/invoice/public/${invoice.payment_link}`, '_blank')
    }
    setShowMenu(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              #{invoice.invoice_number}
            </h3>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <User className="h-4 w-4 mr-1" />
              {invoice.client_name}
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isOverdue ? 'bg-red-100 text-red-800' : getStatusColor(invoice.status)
            }`}>
              {isOverdue ? 'Overdue' : getStatusText(invoice.status)}
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {invoice.payment_link && (
                  <button
                    onClick={viewInvoice}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 mr-3" />
                    View Invoice
                  </button>
                )}
                {invoice.status === 'draft' && (
                  <button
                    onClick={handleSendInvoice}
                    disabled={loading}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 mr-3" />
                    {loading ? 'Sending...' : 'Send Invoice'}
                  </button>
                )}
                {invoice.status === 'sent' && (
                  <button
                    onClick={handleMarkAsPaid}
                    className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                  >
                    <DollarSign className="h-4 w-4 mr-3" />
                    Mark as Paid
                  </button>
                )}
                {invoice.payment_link && (
                  <button
                    onClick={copyPaymentLink}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4 mr-3" />
                    Copy Payment Link
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit(invoice)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-3" />
                  Edit Invoice
                </button>
                <button
                  onClick={() => {
                    onDelete(invoice.id)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete Invoice
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Due: {formatDate(invoice.due_date)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="text-xl font-bold text-gray-900">
              {invoice.currency} {invoice.total.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t pt-3">
          Created {formatDate(invoice.created_at)}
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

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title={confirmationModal.title}
          message={confirmationModal.message}
          onClose={() => setConfirmationModal(null)}
        />
      )}
    </>
  )
}