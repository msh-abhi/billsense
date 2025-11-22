import React, { useState, useEffect } from 'react'
import { Layout } from '../Layout/Layout'
import { Plus, Search, Filter, Download, List, Grid, Trash2, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { QuotationForm } from './QuotationForm'

interface Quotation {
  id: string
  quote_number: string
  client_name: string
  client_email: string
  issue_date: string
  expiry_date: string | null
  total: number
  currency: string
  status: string
  created_at: string
}

interface QuotationsProps {
  openForm?: boolean
}

export const Quotations: React.FC<QuotationsProps> = ({ openForm = false }) => {
  const { user } = useAuth()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([])
  const [showForm, setShowForm] = useState(openForm)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)

  useEffect(() => {
    if (user) {
      loadQuotations()
    }
  }, [user])

  useEffect(() => {
    if (openForm) {
      setShowForm(true)
    }
  }, [openForm])

  const loadQuotations = async () => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.company_id) {
        setQuotations([])
        return
      }

      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients (name, email)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedQuotations = data?.map(quotation => ({
        id: quotation.id,
        quote_number: quotation.quote_number,
        client_name: quotation.clients?.name || 'Unknown Client',
        client_email: quotation.clients?.email || '',
        issue_date: quotation.issue_date,
        expiry_date: quotation.expiry_date,
        total: quotation.total,
        currency: quotation.currency || 'USD',
        status: quotation.status,
        created_at: quotation.created_at
      })) || []

      setQuotations(formattedQuotations)
    } catch (error) {
      console.error('Error loading quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuotation = () => {
    setEditingQuotation(null)
    setShowForm(true)
  }

  const handleEditQuotation = async (quotation: Quotation) => {
    try {
      // Fetch full quotation details including items
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('id', quotation.id)
        .single()

      if (error) throw error

      setEditingQuotation(data)
      setShowForm(true)
    } catch (error) {
      console.error('Error fetching quotation details:', error)
      alert('Failed to load quotation details')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingQuotation(null)
    loadQuotations()
  }

  const handleConvertToInvoice = async (quotation: Quotation) => {
    // TODO: Implement convert to invoice functionality
    console.log('Convert to invoice:', quotation.id)
  }

  const handleDeleteQuotation = async (quotationId: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId)

      if (error) throw error

      setQuotations(quotations.filter(q => q.id !== quotationId))
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('Failed to delete quotation')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedQuotations.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedQuotations.length} quotations?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .in('id', selectedQuotations)

      if (error) throw error

      setQuotations(quotations.filter(q => !selectedQuotations.includes(q.id)))
      setSelectedQuotations([])
    } catch (error) {
      console.error('Error deleting quotations:', error)
      alert('Failed to delete quotations')
    }
  }

  const handleSelectQuotation = (quotationId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuotations([...selectedQuotations, quotationId])
    } else {
      setSelectedQuotations(selectedQuotations.filter(id => id !== quotationId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotations(filteredQuotations.map(q => q.id))
    } else {
      setSelectedQuotations([])
    }
  }

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = quotation.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    return {
      all: quotations.length,
      draft: quotations.filter(q => q.status === 'draft').length,
      sent: quotations.filter(q => q.status === 'sent').length,
      accepted: quotations.filter(q => q.status === 'accepted').length,
      rejected: quotations.filter(q => q.status === 'rejected').length
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout title="Quotations" subtitle="Manage your client quotations and estimates">
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
    <Layout title="Quotations" subtitle="Manage your client quotations and estimates">
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
            <div className="text-2xl font-bold text-green-600">{statusCounts.accepted}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotations..."
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
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {selectedQuotations.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedQuotations.length})
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
              onClick={handleCreateQuotation}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Quotation
            </button>
          </div>
        </div>

        {/* Quotations Display */}
        {filteredQuotations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first quotation'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleCreateQuotation}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuotations.map((quotation) => (
              <div key={quotation.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">#{quotation.quote_number}</h3>
                    <p className="text-sm text-gray-600">{quotation.client_name}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                    {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{quotation.currency} {quotation.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Issue Date:</span>
                    <span>{formatDate(quotation.issue_date)}</span>
                  </div>
                  {quotation.expiry_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expiry:</span>
                      <span>{formatDate(quotation.expiry_date)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConvertToInvoice(quotation)}
                    disabled={quotation.status !== 'accepted'}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${quotation.status === 'accepted'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Convert to Invoice
                  </button>
                  <button
                    onClick={() => handleEditQuotation(quotation)}
                    className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
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
                        checked={selectedQuotations.length === filteredQuotations.length && filteredQuotations.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quotation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Date
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
                  {filteredQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedQuotations.includes(quotation.id)}
                          onChange={(e) => handleSelectQuotation(quotation.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-blue-600 font-medium">
                          #{quotation.quote_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quotation.currency} {quotation.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.expiry_date ? formatDate(quotation.expiry_date) : 'No expiry'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditQuotation(quotation)}
                            className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditQuotation(quotation)}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          {quotation.status === 'accepted' && (
                            <button
                              onClick={() => handleConvertToInvoice(quotation)}
                              className="text-green-600 hover:text-green-800 px-2 py-1 rounded text-sm"
                            >
                              Convert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <QuotationForm
            quotation={editingQuotation}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingQuotation(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
