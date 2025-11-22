import React, { useState, useEffect } from 'react'
import { Layout } from '../Layout/Layout'
import { InvoiceCard } from './InvoiceCard'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceDetails } from './InvoiceDetails'
import { Plus, Search, Filter, Download, List, Grid, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

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

interface InvoicesProps {
  openForm?: boolean
}

export const Invoices: React.FC<InvoicesProps> = ({ openForm = false }) => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(openForm)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    if (user) {
      loadInvoices()
    }
  }, [user])

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, email)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedInvoices = data.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.clients?.name || 'Unknown Client',
        client_email: invoice.clients?.email || '',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        payment_link: invoice.payment_link,
        created_at: invoice.created_at
      }))

      setInvoices(formattedInvoices)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setShowForm(true)
  }

  // --- THIS IS THE ONLY CHANGE ---
  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(null) // This new line closes the details modal first
    setEditingInvoice(invoice)
    setShowForm(true)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (error) throw error

      setInvoices(invoices.filter(i => i.id !== invoiceId))
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedInvoices.length} invoices?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', selectedInvoices)

      if (error) throw error

      setInvoices(invoices.filter(i => !selectedInvoices.includes(i.id)))
      setSelectedInvoices([])
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error deleting invoices:', error)
      alert('Failed to delete invoices')
    }
  }

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices([...selectedInvoices, invoiceId])
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(filteredInvoices.map(i => i.id))
    } else {
      setSelectedInvoices([])
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingInvoice(null)
    loadInvoices()
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    return {
      all: invoices.length,
      draft: invoices.filter(i => i.status === 'draft').length,
      sent: invoices.filter(i => i.status === 'sent').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      overdue: invoices.filter(i => i.status === 'sent' && new Date(i.due_date) < new Date()).length
    }
  }

  const statusCounts = getStatusCounts()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) return 'bg-red-100 text-red-800'
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    setShowBulkActions(selectedInvoices.length > 0)
  }, [selectedInvoices])

  if (loading) {
    return (
      <Layout title="Invoices" subtitle="Manage your client invoices">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm h-48"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Invoices" subtitle="Manage your client invoices">
      <div className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.draft}</div>
            <div className="text-sm text-gray-600">Draft</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.sent}</div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.paid}</div>
            <div className="text-sm text-gray-600">Paid</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            {showBulkActions && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedInvoices.length})
              </button>
            )}

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={handleCreateInvoice}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </button>
          </div>
        </div>

        {/* Invoices Display */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first invoice'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleCreateInvoice}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onStatusUpdate={loadInvoices}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => {
                    const isOverdue = invoice.status === 'sent' && new Date(invoice.due_date) < new Date()
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            #{invoice.invoice_number}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.client_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.currency} {invoice.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusColor(invoice.status, isOverdue)
                          }`}>
                            {isOverdue ? 'Overdue' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewInvoice(invoice)}
                              className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded text-sm"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingInvoice(null)
            }}
          />
        )}

        {selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onEdit={handleEditInvoice}
            onStatusUpdate={loadInvoices}
          />
        )}
      </div>
    </Layout>
  )
}