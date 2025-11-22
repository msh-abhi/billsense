import React, { useState } from 'react'
import { CreditCard, Download, ExternalLink } from 'lucide-react'

export const BillingSettings: React.FC = () => {
  const [currentPlan] = useState('free')

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        'Up to 3 clients',
        'Basic time tracking',
        'Simple invoicing',
        'Email support'
      ]
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 19,
      features: [
        'Unlimited clients',
        'Advanced time tracking',
        'Professional invoicing',
        'Payment processing',
        'Priority support',
        'Custom branding'
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: 49,
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Advanced reporting',
        'API access',
        'White-label solution',
        'Dedicated support'
      ]
    }
  ]

  const billingHistory = [
    {
      id: '1',
      date: '2024-01-01',
      description: 'Professional Plan - Monthly',
      amount: 19.00,
      status: 'paid'
    },
    {
      id: '2',
      date: '2023-12-01',
      description: 'Professional Plan - Monthly',
      amount: 19.00,
      status: 'paid'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Billing & Subscription</h3>
        <p className="mt-1 text-sm text-gray-600">
          Manage your subscription and billing information.
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium text-blue-900">
              Current Plan: {plans.find(p => p.id === currentPlan)?.name}
            </h4>
            <p className="text-blue-700">
              {currentPlan === 'free' ? 'Free forever' : `$${plans.find(p => p.id === currentPlan)?.price}/month`}
            </p>
          </div>
          {currentPlan !== 'free' && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Available Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 ${
                plan.id === currentPlan
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-center mb-4">
                <h5 className="text-lg font-medium text-gray-900">{plan.name}</h5>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  {plan.price > 0 && <span className="text-gray-600">/month</span>}
                </div>
              </div>
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <span className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2 text-xs">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button
                className={`w-full py-2 px-4 rounded-lg transition-colors ${
                  plan.id === currentPlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={plan.id === currentPlan}
              >
                {plan.id === currentPlan ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      {currentPlan !== 'free' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">Payment Method</h4>
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-600">Expires 12/25</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 transition-colors">
              Update
            </button>
          </div>
        </div>
      )}

      {/* Billing History */}
      {currentPlan !== 'free' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Billing History</h4>
            <button className="flex items-center text-blue-600 hover:text-blue-700 transition-colors">
              <Download className="h-4 w-4 mr-1" />
              Download All
            </button>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button className="text-blue-600 hover:text-blue-700 transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}