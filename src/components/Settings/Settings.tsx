import React, { useState } from 'react'
import { Layout } from '../Layout/Layout'
import { ProfileSettings } from './ProfileSettings'
import { CompanySettings } from './CompanySettings'
import { NotificationSettings } from './NotificationSettings'
import { BillingSettings } from './BillingSettings'
import { PaymentSettings } from './PaymentSettings'
import { EmailSettings } from './EmailSettings'
import { PDFSettings } from './PDFSettings'
import { User, Building2, Bell, CreditCard, Shield, DollarSign, Mail, FileText } from 'lucide-react'

type SettingsTab = 'company' | 'profile' | 'payments' | 'email' | 'pdf' | 'notifications' | 'billing' | 'security'

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company')

  const tabs = [
    { id: 'company' as SettingsTab, name: 'Company', icon: Building2 },
    { id: 'profile' as SettingsTab, name: 'Profile', icon: User },
    { id: 'payments' as SettingsTab, name: 'Payment Gateways', icon: DollarSign },
    { id: 'email' as SettingsTab, name: 'Email Templates', icon: Mail },
    { id: 'pdf' as SettingsTab, name: 'PDF Design', icon: FileText },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: Bell },
    { id: 'billing' as SettingsTab, name: 'Billing', icon: CreditCard },
    { id: 'security' as SettingsTab, name: 'Security', icon: Shield },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanySettings />
      case 'profile':
        return <ProfileSettings />
      case 'payments':
        return <PaymentSettings />
      case 'email':
        return <EmailSettings />
      case 'pdf':
        return <PDFSettings />
      case 'notifications':
        return <NotificationSettings />
      case 'billing':
        return <BillingSettings />
      case 'security':
        return <div>Security settings coming soon...</div>
      default:
        return <CompanySettings />
    }
  }

  return (
    <Layout title="Settings" subtitle="Manage your account preferences">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200">
              <nav className="p-4 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        console.log('Switching to tab:', tab.id)
                        setActiveTab(tab.id)
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                      {tab.name}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
