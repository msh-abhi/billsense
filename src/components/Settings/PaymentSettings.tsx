import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Save, Plus, Edit, Trash2, CreditCard, DollarSign, Building, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface PaymentGateway {
  id: string
  company_id: string
  gateway: 'stripe' | 'paypal' | 'wise'
  is_enabled: boolean
  config: any
}

interface PaymentGatewayFormData {
  gateway: 'stripe' | 'paypal' | 'wise'
  is_enabled: boolean
  // Stripe fields
  stripe_publishable_key?: string
  stripe_secret_key?: string
  stripe_webhook_secret?: string
  // PayPal fields
  paypal_client_id?: string
  paypal_client_secret?: string
  paypal_mode?: 'sandbox' | 'live'
  // Wise/Bank fields
  bank_name?: string
  account_holder?: string
  account_number?: string
  routing_number?: string
  swift_code?: string
  iban?: string
}

export const PaymentSettings: React.FC = () => {
  const { profile } = useAuth()
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PaymentGatewayFormData>()
  const gatewayType = watch('gateway')

  useEffect(() => {
    console.log('PaymentSettings mounted. Profile:', profile)
    if (profile?.company_id) {
      console.log('Loading payment gateways for company:', profile.company_id)
      loadPaymentGateways()
    } else {
      console.warn('No company_id found in profile')
      setLoading(false)
    }
  }, [profile])

  const loadPaymentGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGateways(data || [])
    } catch (error) {
      console.error('Error loading payment gateways:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: PaymentGatewayFormData) => {
    setSaving(true)
    try {
      const config: any = {}

      // Build configuration based on gateway type
      if (data.gateway === 'stripe') {
        config.publishable_key = data.stripe_publishable_key
        config.secret_key = data.stripe_secret_key
        config.webhook_secret = data.stripe_webhook_secret
      } else if (data.gateway === 'paypal') {
        config.client_id = data.paypal_client_id
        config.client_secret = data.paypal_client_secret
        config.mode = data.paypal_mode
      } else if (data.gateway === 'wise') { // Using 'wise' for bank transfer as per schema check constraint
        config.bank_name = data.bank_name
        config.account_holder = data.account_holder
        config.account_number = data.account_number
        config.routing_number = data.routing_number
        config.swift_code = data.swift_code
        config.iban = data.iban
      }

      const gatewayData = {
        company_id: profile!.company_id,
        gateway: data.gateway,
        is_enabled: data.is_enabled,
        config
      }

      if (editingGateway) {
        const { error } = await supabase
          .from('payment_gateways')
          .update(gatewayData)
          .eq('id', editingGateway.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payment_gateways')
          .insert(gatewayData)

        if (error) throw error
      }

      await loadPaymentGateways()
      setShowForm(false)
      setEditingGateway(null)
      reset()
      alert('Payment gateway saved successfully!')
    } catch (error) {
      console.error('Error saving payment gateway:', error)
      alert('Failed to save payment gateway')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (gateway: PaymentGateway) => {
    setEditingGateway(gateway)
    reset({
      gateway: gateway.gateway,
      is_enabled: gateway.is_enabled,
      // Stripe fields
      stripe_publishable_key: gateway.config?.publishable_key || '',
      stripe_secret_key: gateway.config?.secret_key || '',
      stripe_webhook_secret: gateway.config?.webhook_secret || '',
      // PayPal fields
      paypal_client_id: gateway.config?.client_id || '',
      paypal_client_secret: gateway.config?.client_secret || '',
      paypal_mode: gateway.config?.mode || 'sandbox',
      // Bank transfer fields
      bank_name: gateway.config?.bank_name || '',
      account_holder: gateway.config?.account_holder || '',
      account_number: gateway.config?.account_number || '',
      routing_number: gateway.config?.routing_number || '',
      swift_code: gateway.config?.swift_code || '',
      iban: gateway.config?.iban || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (gatewayId: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) return

    try {
      const { error } = await supabase
        .from('payment_gateways')
        .delete()
        .eq('id', gatewayId)

      if (error) throw error
      await loadPaymentGateways()
    } catch (error) {
      console.error('Error deleting payment gateway:', error)
      alert('Failed to delete payment gateway')
    }
  }

  const toggleGateway = async (gatewayId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_enabled: enabled })
        .eq('id', gatewayId)

      if (error) throw error
      await loadPaymentGateways()
    } catch (error) {
      console.error('Error updating gateway status:', error)
      alert('Failed to update gateway status')
    }
  }

  const getGatewayIcon = (type: string) => {
    switch (type) {
      case 'stripe': return <CreditCard className="h-5 w-5" />
      case 'paypal': return <DollarSign className="h-5 w-5" />
      case 'wise': return <Building className="h-5 w-5" />
      default: return <CreditCard className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payment Gateways</h3>
          <p className="mt-1 text-sm text-gray-600">
            Configure payment methods for your invoices
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGateway(null)
            reset()
            setShowForm(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Gateway
        </button>
      </div>

      {/* Payment Gateways List */}
      <div className="space-y-4">
        {gateways.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No payment gateways configured</p>
            <p className="text-sm text-gray-400 mt-1">Add a payment gateway to start accepting payments</p>
          </div>
        ) : (
          gateways.map((gateway) => (
            <div key={gateway.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${gateway.is_enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {getGatewayIcon(gateway.gateway)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">{gateway.gateway}</h4>
                    <p className="text-sm text-gray-600">
                      {gateway.is_enabled ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gateway.is_enabled}
                      onChange={(e) => toggleGateway(gateway.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <button
                    onClick={() => handleEdit(gateway)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(gateway.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Gateway Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingGateway(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gateway Type
                </label>
                <select
                  {...register('gateway', { required: 'Gateway type is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select gateway type</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="wise">Wise / Bank Transfer</option>
                </select>
                {errors.gateway && (
                  <p className="mt-1 text-sm text-red-600">{errors.gateway.message}</p>
                )}
              </div>

              {/* Gateway-specific fields */}
              {gatewayType === 'stripe' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Stripe Configuration</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publishable Key
                      </label>
                      <input
                        {...register('stripe_publishable_key')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secret Key
                      </label>
                      <input
                        {...register('stripe_secret_key')}
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="sk_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook Secret (Optional)
                      </label>
                      <input
                        {...register('stripe_webhook_secret')}
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="whsec_..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {gatewayType === 'paypal' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">PayPal Configuration</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client ID
                      </label>
                      <input
                        {...register('paypal_client_id')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Secret
                      </label>
                      <input
                        {...register('paypal_client_secret')}
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode
                      </label>
                      <select
                        {...register('paypal_mode')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="sandbox">Sandbox</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {gatewayType === 'wise' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Bank Transfer Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <input
                        {...register('bank_name')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Holder
                      </label>
                      <input
                        {...register('account_holder')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        {...register('account_number')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Routing Number
                      </label>
                      <input
                        {...register('routing_number')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SWIFT Code (Optional)
                      </label>
                      <input
                        {...register('swift_code')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IBAN (Optional)
                      </label>
                      <input
                        {...register('iban')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Enable Gateway */}
              <div className="flex items-center">
                <input
                  {...register('is_enabled')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable this payment gateway
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingGateway(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingGateway ? 'Update Gateway' : 'Add Gateway'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}