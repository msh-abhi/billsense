import React, { useState, useEffect } from 'react'
import { Building2, Mail, Phone, Globe, Upload, Save, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface CompanySettings {
  name: string
  email: string
  phone: string
  address: any
  logo_url: string
  vat_tin: string
  currency: string
  timezone: string
  invoice_prefix: string
  next_invoice_number: number
}

export const CompanySettings: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    logo_url: '',
    vat_tin: '',
    currency: 'USD',
    timezone: 'UTC',
    invoice_prefix: 'INV',
    next_invoice_number: 1
  })

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single()

        if (company) {
          setSettings({
            name: company.name || '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || {
              street: '',
              city: '',
              state: '',
              zip: '',
              country: ''
            },
            logo_url: company.logo_url || '',
            vat_tin: company.vat_tin || '',
            currency: company.currency || 'USD',
            timezone: company.timezone || 'UTC',
            invoice_prefix: company.invoice_prefix || 'INV',
            next_invoice_number: company.invoice_next_number || 1
          })
        }
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Get or create profile first
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw profileError
      }

      // If no profile exists, create it
      if (!profile) {
        console.log('Creating profile for user...')
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user!.id,
            email: user!.email!,
            full_name: user!.user_metadata?.full_name || '',
            company_name: settings.name || null
          })

        if (createProfileError) {
          console.error('Profile creation error:', createProfileError)
          throw createProfileError
        }

        console.log('Profile created')
        profile = { company_id: null }
      }

      console.log('Current profile company_id:', profile.company_id)

      let companyId = profile.company_id

      if (!companyId) {
        console.log('Creating new company...')
        // Create new company
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: settings.name,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            logo_url: settings.logo_url,
            vat_tin: settings.vat_tin,
            currency: settings.currency,
            timezone: settings.timezone,
            invoice_prefix: settings.invoice_prefix,
            invoice_next_number: settings.next_invoice_number
          })
          .select()
          .single()

        if (createError) {
          console.error('Company creation error:', createError)
          throw createError
        }

        companyId = newCompany.id
        console.log('Created company with ID:', companyId)

        // Update user profile with company_id
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('id', user!.id)

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError)
          throw profileUpdateError
        }

        console.log('Updated profile with company_id')
      } else {
        console.log('Updating existing company:', companyId)
        // Update existing company
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            name: settings.name,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            logo_url: settings.logo_url,
            vat_tin: settings.vat_tin,
            currency: settings.currency,
            timezone: settings.timezone,
            invoice_prefix: settings.invoice_prefix,
            invoice_next_number: settings.next_invoice_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', companyId)

        if (updateError) {
          console.error('Company update error:', updateError)
          throw updateError
        }

        console.log('Updated company successfully')
      }

      alert('Company settings saved successfully!')
    } catch (error) {
      console.error('Error saving company settings:', error)
      alert('Failed to save company settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `company-logo-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setSettings(prev => ({ ...prev, logo_url: publicUrl }))
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo')
    }
  }

  const handleAddressChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
  }

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CHF', name: 'Swiss Franc' }
  ]

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Australia/Sydney', label: 'Sydney' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Building2 className="h-6 w-6 mr-2 text-blue-600" />
          Company Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Logo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="Company logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              id="name"
              value={settings.name}
              onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Company Name"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                id="email"
                value={settings.email}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="company@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* VAT/TIN */}
          <div>
            <label htmlFor="vat_tin" className="block text-sm font-medium text-gray-700 mb-1">
              VAT/TIN Number
            </label>
            <input
              type="text"
              id="vat_tin"
              value={settings.vat_tin}
              onChange={(e) => setSettings(prev => ({ ...prev, vat_tin: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="GB123456789"
            />
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Address</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              id="street"
              value={settings.address?.street || ''}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Business Street"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              id="city"
              value={settings.address?.city || ''}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="New York"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State/Province
            </label>
            <input
              type="text"
              id="state"
              value={settings.address?.state || ''}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="NY"
            />
          </div>

          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              id="zip"
              value={settings.address?.zip || ''}
              onChange={(e) => handleAddressChange('zip', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10001"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              id="country"
              value={settings.address?.country || ''}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="United States"
            />
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Globe className="h-6 w-6 mr-2 text-green-600" />
          Business Preferences
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Default Currency
            </label>
            <select
              id="currency"
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invoice_prefix" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Prefix
            </label>
            <input
              type="text"
              id="invoice_prefix"
              value={settings.invoice_prefix}
              onChange={(e) => setSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="INV"
              maxLength={5}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !settings.name.trim()}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Company Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}
