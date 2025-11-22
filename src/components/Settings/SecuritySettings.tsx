import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Save, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const SecuritySettings: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PasswordFormData>()
  const newPassword = watch('newPassword')

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (error) throw error

      alert('Password updated successfully!')
      reset()
    } catch (error) {
      console.error('Error updating password:', error)
      alert('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const securityFeatures = [
    {
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      enabled: false,
      action: 'Enable'
    },
    {
      title: 'Login Notifications',
      description: 'Get notified when someone logs into your account',
      enabled: true,
      action: 'Disable'
    },
    {
      title: 'Session Management',
      description: 'View and manage your active sessions',
      enabled: true,
      action: 'Manage'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account security and privacy settings.
        </p>
      </div>

      {/* Change Password */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                {...register('currentPassword', { required: 'Current password is required' })}
                type={showCurrentPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                {...register('newPassword', { 
                  required: 'New password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                type={showNewPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword', { 
                  required: 'Please confirm your new password',
                  validate: value => value === newPassword || 'Passwords do not match'
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>

      {/* Security Features */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Security Features</h4>
        <div className="space-y-4">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <h5 className="font-medium text-gray-900">{feature.title}</h5>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
              <button
                className={`px-4 py-2 rounded-lg transition-colors ${
                  feature.enabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {feature.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-red-900 mb-2">Danger Zone</h4>
        <p className="text-sm text-red-700 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  )
}