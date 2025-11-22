import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Toast } from '../common/Toast'

interface Client {
  id: string
  name: string
  email: string
  currency: string
}

interface Project {
  id: string
  name: string
  hourly_rate: number
  fixed_price: number
  project_type: string
  status: string
}

interface PaymentGateway {
  id: string
  gateway: string
  is_enabled: boolean
}

interface InvoiceItem {
  description: string
  quantity: number
  amount: number
}

interface InvoiceFormData {
  client_id: string
  project_id: string
  payment_gateway_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  items: InvoiceItem[]
  tax_rate: number
  notes: string
}

interface InvoiceFormProps {
  invoice?: any
  onSuccess: () => void
  onCancel: () => void
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onSuccess, onCancel }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null)

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      client_id: invoice?.client_id || '',
      project_id: invoice?.project_id || '',
      payment_gateway_id: invoice?.payment_gateway_id || '',
      invoice_number: invoice?.invoice_number || '',
      issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
      due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: invoice?.invoice_items || [{ description: '', quantity: 1, amount: 0 }],
      tax_rate: invoice?.tax_rate || 0,
      notes: invoice?.notes || ''
    }
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items'
  })

  const watchedItems = watch('items')
  const watchedTaxRate = watch('tax_rate')
  const watchedClientId = watch('client_id')
  const watchedProjectId = watch('project_id')

  useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

  useEffect(() => {
    if (watchedClientId) {
      loadClientProjects(watchedClientId)
    }
  }, [watchedClientId])

  useEffect(() => {
    if (watchedProjectId && !invoice) {
      autoPopulateFromProject(watchedProjectId)
    }
  }, [watchedProjectId, invoice])

  useEffect(() => {
    // Auto-generate invoice number if creating new invoice
    if (!invoice) {
      generateInvoiceNumber()
    }
  }, [invoice])

  const loadInitialData = async () => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.company_id) {
        setClients([])
        setPaymentGateways([])
        return
      }

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, currency')
        .eq('company_id', profile.company_id)
        .order('name')

      if (clientsError) throw clientsError
      setClients(clientsData || [])

      // Load payment gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select('id, gateway, is_enabled')
        .eq('company_id', profile.company_id)
        .eq('is_enabled', true)
        .order('gateway')

      if (gatewaysError) throw gatewaysError
      setPaymentGateways(gatewaysData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      setToast({ type: 'error', message: 'Failed to load initial data.' })
    } finally {
      setLoadingData(false)
    }
  }

  const loadClientProjects = async (clientId: string) => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError || !profile?.company_id) {
        setProjects([])
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, hourly_rate, fixed_price, project_type, status')
        .eq('company_id', profile.company_id)
        .eq('client_id', clientId)
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setToast({ type: 'error', message: 'Failed to load client projects.' })
    }
  }

  const autoPopulateFromProject = async (projectId: string) => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError || !profile?.company_id) return

      const project = projects.find(p => p.id === projectId)
      if (!project) return

      if (project.project_type === 'fixed') {
        // For fixed price projects, check if completed
        if (project.status !== 'completed') {
          setToast({ type: 'warning', message: 'Fixed price projects can only be invoiced when marked as completed.' })
          setValue('project_id', '')
          return
        }

        // Auto-populate with fixed price
        const newItems = [{
          description: project.name,
          quantity: 1,
          amount: project.fixed_price
        }]
        replace(newItems)
      } else if (project.project_type === 'hourly') {
        // For hourly projects, get time entries
        const { data: timeLogs, error } = await supabase
          .from('time_entries')
          .select('duration, description')
          .eq('project_id', projectId)
          .eq('company_id', profile.company_id)
          .not('duration', 'is', null)

        if (error) throw error

        if (timeLogs && timeLogs.length > 0) {
          const totalHours = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / 3600
          const totalAmount = totalHours * project.hourly_rate
          const newItems = [{
            description: `${project.name} - Time tracking (${Math.round(totalHours * 100) / 100} hours)`,
            quantity: Math.round(totalHours * 100) / 100,
            amount: Math.round(totalAmount * 100) / 100
          }]
          replace(newItems)
        } else {
          // No time logs, create empty item
          const newItems = [{
            description: project.name,
            quantity: 0,
            amount: 0
          }]
          replace(newItems)
        }
      }
    } catch (error) {
      console.error('Error auto-populating from project:', error)
      setToast({ type: 'error', message: 'Failed to auto-populate from project.' })
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError || !profile?.company_id) return

      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('company_id', profile.company_id)

      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`
      setValue('invoice_number', invoiceNumber)
    } catch (error) {
      console.error('Error generating invoice number:', error)
      setToast({ type: 'error', message: 'Failed to generate invoice number.' })
    }
  }

  const calculateSubtotal = () => {
    if (!watchedItems) return 0
    return watchedItems.reduce((sum, item) => {
      const amount = Number(item.amount) || 0
      return sum + amount
    }, 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    const taxRate = Number(watchedTaxRate) || 0
    return (subtotal * taxRate) / 100
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true)
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      if (profileError || !profile?.company_id) {
        setToast({ type: 'error', message: 'Company profile not found. Please complete company setup first.' })
        return
      }

      const subtotal = data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      const taxAmount = (subtotal * (Number(data.tax_rate) || 0)) / 100
      const total = subtotal + taxAmount

      console.log('Saving invoice with totals:', { subtotal, taxAmount, total })

      const invoiceData = {
        company_id: profile.company_id,
        client_id: data.client_id,
        project_id: data.project_id || null,
        payment_gateway_id: data.payment_gateway_id || null,
        invoice_number: data.invoice_number,
        issue_date: data.issue_date,
        due_date: data.due_date,
        subtotal,
        tax_rate: Number(data.tax_rate) || 0,
        tax_amount: taxAmount,
        total,
        currency: clients.find(c => c.id === data.client_id)?.currency || 'USD',
        status: invoice?.status || 'draft',
        notes: data.notes || null,
        payment_link: invoice?.payment_link || null,
        user_id: user!.id
      }

      let invoiceId = invoice?.id

      if (invoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id)

        if (error) throw error
      } else {
        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (error) throw error
        invoiceId = newInvoice.id
      }

      // Delete existing items if editing
      if (invoice) {
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id)
      }

      // Insert new items
      const itemsData = data.items.map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        rate: 0, // We're not using rate anymore, just amount
        amount: Number(item.amount) || 0
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsData)

      if (itemsError) throw itemsError

      setToast({ type: 'success', message: 'Invoice saved successfully!' })
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error) {
      console.error('Error saving invoice:', error)
      setToast({ type: 'error', message: 'Failed to save invoice' })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              <select
                {...register('client_id', { required: 'Client is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {errors.client_id && (
                <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project (Optional)
              </label>
              <select
                {...register('project_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.project_type === 'fixed' ? 'Fixed' : 'Hourly'})
                    {project.project_type === 'fixed' && project.status !== 'completed' && ' - Not Completed'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Gateway
              </label>
              <select
                {...register('payment_gateway_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select payment method</option>
                {paymentGateways.map((gateway) => (
                  <option key={gateway.id} value={gateway.id}>
                    {gateway.gateway.charAt(0).toUpperCase() + gateway.gateway.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Number and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number
              </label>
              <input
                {...register('invoice_number', { required: 'Invoice number is required' })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.invoice_number && (
                <p className="mt-1 text-sm text-red-600">{errors.invoice_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date
              </label>
              <input
                {...register('issue_date', { required: 'Issue date is required' })}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.issue_date && (
                <p className="mt-1 text-sm text-red-600">{errors.issue_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                {...register('due_date', { required: 'Due date is required' })}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.due_date && (
                <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, amount: 0 })}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      {...register(`items.${index}.description`, { required: 'Description is required' })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Item description"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qty
                    </label>
                    <input
                      {...register(`items.${index}.quantity`, {
                        required: 'Quantity is required',
                        min: { value: 0.01, message: 'Quantity must be positive' },
                        valueAsNumber: true
                      })}
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      {...register(`items.${index}.amount`, {
                        required: 'Amount is required',
                        min: { value: 0, message: 'Amount must be positive' },
                        valueAsNumber: true
                      })}
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  {...register('tax_rate', {
                    min: { value: 0, message: 'Tax rate must be positive' },
                    max: { value: 100, message: 'Tax rate cannot exceed 100%' },
                    valueAsNumber: true
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {clients.find(c => c.id === watchedClientId)?.currency || '$'} {calculateSubtotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax:</span>
                  <span className="font-medium">
                    {clients.find(c => c.id === watchedClientId)?.currency || '$'} {calculateTax().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>
                    {clients.find(c => c.id === watchedClientId)?.currency || '$'} {calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes or payment terms..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                invoice ? 'Update Invoice' : 'Create Invoice'
              )}
            </button>
          </div>
        </form>
      </div>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}