import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Camera, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface ProfileFormData {
  full_name: string
  email: string
  company_name: string
  avatar_url: string
  // Address fields
  address_line1: string
  address_line2: string
  city: string
  state_province: string
  postal_code: string
  country: string
  // Business info
  vat_number: string
  tin_number: string
  // Invoice display preferences
  show_address_on_invoice: boolean
  show_vat_on_invoice: boolean
  show_tin_on_invoice: boolean
}

export const ProfileSettings: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [profileExists, setProfileExists] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>()

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setProfile(data)
        setProfileExists(true)
        // Set all form values
        Object.keys(data).forEach(key => {
          setValue(key as keyof ProfileFormData, data[key] || '')
        })
      } else {
        // No profile exists, set default values
        setProfile(null)
        setProfileExists(false)
        setValue('email', user!.email || '')
        setValue('show_address_on_invoice', true)
        setValue('show_vat_on_invoice', true)
        setValue('show_tin_on_invoice', true)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true)
    try {
      const profileData = {
        id: user!.id,
        email: data.email,
        full_name: data.full_name,
        company_name: data.company_name || null,
        avatar_url: data.avatar_url || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state_province: data.state_province || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        vat_number: data.vat_number || null,
        tin_number: data.tin_number || null,
        show_address_on_invoice: data.show_address_on_invoice,
        show_vat_on_invoice: data.show_vat_on_invoice,
        show_tin_on_invoice: data.show_tin_on_invoice
      }

      if (profileExists) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user!.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData)

        if (error) throw error
      }

      // Update email in auth if changed
      if (data.email !== (profile?.email || user!.email)) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email
        })
        if (emailError) throw emailError
      }

      alert('Profile updated successfully!')
      loadProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-600">
          {profileExists 
            ? 'Update your personal information and profile settings.'
            : 'Create your profile by filling out the information below.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-medium text-gray-600">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Profile Photo</h4>
            <p className="text-sm text-gray-600">
              Upload a new profile photo or update your existing one.
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                {...register('full_name', { required: 'Full name is required' })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Please enter a valid email address'
                  }
                })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                {...register('company_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your company or business name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar URL
              </label>
              <input
                {...register('avatar_url')}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Address Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                {...register('address_line1')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Street address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                {...register('address_line2')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                {...register('city')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                {...register('state_province')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                {...register('postal_code')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <select
                {...register('country', { required: 'Country is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="NL">Netherlands</option>
                <option value="SE">Sweden</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="CH">Switzerland</option>
                <option value="AT">Austria</option>
                <option value="BE">Belgium</option>
                <option value="IE">Ireland</option>
                <option value="PT">Portugal</option>
                <option value="PL">Poland</option>
                <option value="CZ">Czech Republic</option>
                <option value="HU">Hungary</option>
                <option value="SK">Slovakia</option>
                <option value="SI">Slovenia</option>
                <option value="HR">Croatia</option>
                <option value="BG">Bulgaria</option>
                <option value="RO">Romania</option>
                <option value="GR">Greece</option>
                <option value="CY">Cyprus</option>
                <option value="MT">Malta</option>
                <option value="LU">Luxembourg</option>
                <option value="EE">Estonia</option>
                <option value="LV">Latvia</option>
                <option value="LT">Lithuania</option>
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Business Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VAT Number
              </label>
              <input
                {...register('vat_number')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VAT123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TIN Number
              </label>
              <input
                {...register('tin_number')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tax Identification Number"
              />
            </div>
          </div>
        </div>

        {/* Invoice Display Preferences */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Invoice Display Preferences</h4>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                {...register('show_address_on_invoice')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Show address on invoices
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...register('show_vat_on_invoice')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Show VAT number on invoices
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...register('show_tin_on_invoice')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Show TIN number on invoices
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {profileExists ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {profileExists ? 'Save Changes' : 'Create Profile'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}