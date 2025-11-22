import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface OnboardingStep {
  id: string
  title: string
  description: string
  component: React.ReactNode
  isCompleted: boolean
}

export const CompanyOnboarding: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const steps: Omit<OnboardingStep, 'isCompleted'>[] = [
    {
      id: 'welcome',
      title: 'Welcome to Your Invoice Workspace',
      description: 'Let\'s set up your business profile to get started',
      component: (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Your Professional Invoice Workspace</h2>
          <p className="text-gray-600 mb-8">Take a few minutes to set up your business profile and start managing your invoices like a pro.</p>
          <button
            onClick={() => setCurrentStep(1)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      )
    },
    {
      id: 'company-info',
      title: 'Business Information',
      description: 'Tell us about your company',
      component: (
        <div className="space-y-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Company Name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="hello@company.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Business Phone (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(0)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!companyName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )
    },
    {
      id: ' Completing Setup',
      title: 'Finishing Setup',
      description: 'Creating your workspace...',
      component: (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Setting up your workspace...</h3>
          <p className="text-gray-600">This will just take a moment</p>
        </div>
      )
    }
  ]

  const handleComplete = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email: email || null,
          phone: phone || null,
          currency: 'USD',
          timezone: 'UTC',
          invoice_prefix: 'INV'
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Update user profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Success - redirect to dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('Failed to complete setup. Please try again.')
      setCurrentStep(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentStep === 2 && companyName) {
      handleComplete()
    }
  }, [currentStep, companyName])

  const currentStepData = steps[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-1 mx-2 ${
                        index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              {currentStepData.description}
            </p>

            {currentStepData.component}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Setting up your professional invoice management workspace</p>
          <p className="mt-1">Secure • Scalable • Simple</p>
        </div>
      </div>
    </div>
  )
}
