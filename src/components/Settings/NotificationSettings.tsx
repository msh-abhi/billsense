import React, { useState } from 'react'
import { Save } from 'lucide-react'

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    invoiceReminders: true,
    paymentNotifications: true,
    weeklyReports: false,
    marketingEmails: false,
    pushNotifications: true,
    timeTrackingReminders: true,
    overdueInvoices: true
  })
  const [saving, setSaving] = useState(false)

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    alert('Notification settings saved!')
  }

  const ToggleSwitch: React.FC<{ 
    enabled: boolean
    onChange: () => void
    label: string
    description: string
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-600">
          Choose how you want to be notified about important events.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">Email Notifications</h4>
          <div className="space-y-1">
            <ToggleSwitch
              enabled={settings.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
              label="Email Notifications"
              description="Receive email notifications for important events"
            />
            <ToggleSwitch
              enabled={settings.invoiceReminders}
              onChange={() => handleToggle('invoiceReminders')}
              label="Invoice Reminders"
              description="Get reminded about upcoming invoice due dates"
            />
            <ToggleSwitch
              enabled={settings.paymentNotifications}
              onChange={() => handleToggle('paymentNotifications')}
              label="Payment Notifications"
              description="Receive notifications when invoices are paid"
            />
            <ToggleSwitch
              enabled={settings.overdueInvoices}
              onChange={() => handleToggle('overdueInvoices')}
              label="Overdue Invoice Alerts"
              description="Get notified when invoices become overdue"
            />
            <ToggleSwitch
              enabled={settings.weeklyReports}
              onChange={() => handleToggle('weeklyReports')}
              label="Weekly Reports"
              description="Receive weekly summaries of your activity"
            />
            <ToggleSwitch
              enabled={settings.marketingEmails}
              onChange={() => handleToggle('marketingEmails')}
              label="Marketing Emails"
              description="Receive updates about new features and tips"
            />
          </div>
        </div>

        {/* App Notifications */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">App Notifications</h4>
          <div className="space-y-1">
            <ToggleSwitch
              enabled={settings.pushNotifications}
              onChange={() => handleToggle('pushNotifications')}
              label="Push Notifications"
              description="Receive push notifications in your browser"
            />
            <ToggleSwitch
              enabled={settings.timeTrackingReminders}
              onChange={() => handleToggle('timeTrackingReminders')}
              label="Time Tracking Reminders"
              description="Get reminded to start/stop time tracking"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  )
}