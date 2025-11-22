import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Save, Mail, Eye, X, Copy, Info, Server } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface EmailTemplate {
  id?: string
  template_type: 'invoice_sent' | 'invoice_reminder' | 'payment_received'
  subject: string
  html_content: string
  is_enabled: boolean
}

interface EmailTemplateFormData {
  template_type: 'invoice_sent' | 'invoice_reminder' | 'payment_received'
  subject: string
  html_content: string
  is_enabled: boolean
}

interface EmailProviderSettings {
  provider: 'system' | 'brevo' | 'resend'
  brevo_config?: {
    api_key: string
    sender_name: string
    sender_email: string
  }
  resend_config?: {
    api_key: string
    sender_name: string
    sender_email: string
  }
}

export const EmailSettings: React.FC = () => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [providerSettings, setProviderSettings] = useState<EmailProviderSettings>({
    provider: 'system',
    brevo_config: { api_key: '', sender_name: '', sender_email: '' },
    resend_config: { api_key: '', sender_name: '', sender_email: '' }
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EmailTemplateFormData>()
  const watchedContent = watch('html_content')
  const watchedSubject = watch('subject')

  const templateTypes = [
    { value: 'invoice_sent', label: 'Invoice Sent', description: 'Sent when an invoice is emailed to a client' },
    { value: 'invoice_reminder', label: 'Invoice Reminder', description: 'Sent as a reminder for overdue invoices' },
    { value: 'payment_received', label: 'Payment Received', description: 'Sent when payment is received for an invoice' }
  ]

  const availableVariables = [
    { variable: '{{client_name}}', description: 'Client\'s name' },
    { variable: '{{freelancer_name}}', description: 'Your name' },
    { variable: '{{company_name}}', description: 'Your company name' },
    { variable: '{{invoice_number}}', description: 'Invoice number' },
    { variable: '{{invoice_amount}}', description: 'Invoice total amount' },
    { variable: '{{currency}}', description: 'Invoice currency' },
    { variable: '{{due_date}}', description: 'Invoice due date' },
    { variable: '{{issue_date}}', description: 'Invoice issue date' },
    { variable: '{{payment_link}}', description: 'Link to view/pay invoice' },
    { variable: '{{notes}}', description: 'Invoice notes' },
    { variable: '{{days_overdue}}', description: 'Days overdue (for reminders)' },
    { variable: '{{payment_method}}', description: 'Payment method used (for payment received)' },
    { variable: '{{payment_date}}', description: 'Date payment was received' }
  ]

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      await Promise.all([loadEmailTemplates(), loadProviderSettings()])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProviderSettings = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      if (profile?.company_id) {
        const { data: settings, error } = await supabase
          .from('settings')
          .select('email_settings')
          .eq('company_id', profile.company_id)
          .maybeSingle()

        if (error) {
          console.error('Error fetching settings:', error)
        }

        if (settings?.email_settings) {
          // Merge with default structure to ensure all fields exist
          setProviderSettings({
            provider: settings.email_settings.provider || 'system',
            brevo_config: {
              api_key: settings.email_settings.brevo_config?.api_key || '',
              sender_name: settings.email_settings.brevo_config?.sender_name || '',
              sender_email: settings.email_settings.brevo_config?.sender_email || ''
            },
            resend_config: {
              api_key: settings.email_settings.resend_config?.api_key || '',
              sender_name: settings.email_settings.resend_config?.sender_name || '',
              sender_email: settings.email_settings.resend_config?.sender_email || ''
            }
          })
        }
      }
    } catch (error) {
      console.error('Error loading provider settings:', error)
    }
  }

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user!.id)
        .order('template_type')

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading email templates:', error)
    }
  }

  const saveProviderSettings = async () => {
    setSaving(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      if (!profile?.company_id) throw new Error('No company found')

      // Use upsert to handle case where settings row doesn't exist
      const { error } = await supabase
        .from('settings')
        .upsert({
          company_id: profile.company_id,
          email_settings: providerSettings
        }, {
          onConflict: 'company_id'
        })

      if (error) throw error
      alert('Email provider settings saved successfully')
    } catch (error) {
      console.error('Error saving provider settings:', error)
      alert('Failed to save provider settings')
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (data: EmailTemplateFormData) => {
    setSaving(true)
    try {
      const templateData = {
        user_id: user!.id,
        template_type: data.template_type,
        subject: data.subject,
        html_content: data.html_content,
        is_enabled: data.is_enabled
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert(templateData)

        if (error) throw error
      }

      await loadEmailTemplates()
      setShowForm(false)
      setEditingTemplate(null)
      reset()
    } catch (error) {
      console.error('Error saving email template:', error)
      alert('Failed to save email template')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    reset({
      template_type: template.template_type,
      subject: template.subject,
      html_content: template.html_content,
      is_enabled: template.is_enabled
    })
    setShowForm(true)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this email template?')) return

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      await loadEmailTemplates()
    } catch (error) {
      console.error('Error deleting email template:', error)
      alert('Failed to delete email template')
    }
  }

  const toggleTemplate = async (templateId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_enabled: enabled })
        .eq('id', templateId)

      if (error) throw error
      await loadEmailTemplates()
    } catch (error) {
      console.error('Error updating template status:', error)
      alert('Failed to update template status')
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[name="html_content"]') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = watchedContent || ''
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end)
      setValue('html_content', newValue)

      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const generatePreview = () => {
    let content = watchedContent || ''
    let subject = watchedSubject || ''

    // Replace variables with sample data
    const sampleData = {
      '{{client_name}}': 'John Smith',
      '{{freelancer_name}}': 'Jane Doe',
      '{{company_name}}': 'Freelance Studio',
      '{{invoice_number}}': 'INV-0001',
      '{{invoice_amount}}': '1,250.00',
      '{{currency}}': 'USD',
      '{{due_date}}': 'January 15, 2024',
      '{{issue_date}}': 'December 15, 2023',
      '{{payment_link}}': 'https://example.com/invoice/pay/abc123',
      '{{notes}}': 'Thank you for your business!',
      '{{days_overdue}}': '5',
      '{{payment_method}}': 'Credit Card',
      '{{payment_date}}': 'January 10, 2024'
    }

    Object.entries(sampleData).forEach(([variable, value]) => {
      content = content.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value)
      subject = subject.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value)
    })

    setPreviewContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .preview-header { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .preview-subject { font-weight: bold; color: #495057; }
        </style>
      </head>
      <body>
        <div class="preview-header">
          <div class="preview-subject">Subject: ${subject}</div>
        </div>
        ${content}
      </body>
      </html>
    `)
    setShowPreview(true)
  }

  const getDefaultTemplate = (type: string) => {
    switch (type) {
      case 'invoice_sent':
        return {
          subject: 'Invoice {{invoice_number}} from {{freelancer_name}}',
          content: `<p>Hello {{client_name}},</p>

<p>You have received a new invoice from {{freelancer_name}}.</p>

<p><strong>Invoice Details:</strong></p>
<ul>
  <li>Invoice Number: {{invoice_number}}</li>
  <li>Amount: {{currency}} {{invoice_amount}}</li>
  <li>Due Date: {{due_date}}</li>
</ul>

<p><a href="{{payment_link}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View & Pay Invoice</a></p>

<p>{{notes}}</p>

<p>Thank you for your business!</p>

<p>Best regards,<br>{{freelancer_name}}</p>`
        }
      case 'invoice_reminder':
        return {
          subject: 'Reminder: Invoice {{invoice_number}} is {{days_overdue}} days overdue',
          content: `<p>Hello {{client_name}},</p>

<p>This is a friendly reminder that invoice {{invoice_number}} is now {{days_overdue}} days overdue.</p>

<p><strong>Invoice Details:</strong></p>
<ul>
  <li>Invoice Number: {{invoice_number}}</li>
  <li>Amount: {{currency}} {{invoice_amount}}</li>
  <li>Original Due Date: {{due_date}}</li>
  <li>Days Overdue: {{days_overdue}}</li>
</ul>

<p><a href="{{payment_link}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a></p>

<p>Please process this payment at your earliest convenience. If you have any questions, please don't hesitate to contact me.</p>

<p>Best regards,<br>{{freelancer_name}}</p>`
        }
      case 'payment_received':
        return {
          subject: 'Payment Received - Invoice {{invoice_number}}',
          content: `<p>Hello {{client_name}},</p>

<p>Thank you! We have successfully received your payment for invoice {{invoice_number}}.</p>

<p><strong>Payment Details:</strong></p>
<ul>
  <li>Invoice Number: {{invoice_number}}</li>
  <li>Amount Paid: {{currency}} {{invoice_amount}}</li>
  <li>Payment Date: {{payment_date}}</li>
  <li>Payment Method: {{payment_method}}</li>
</ul>

<p>Your payment has been processed and this invoice is now marked as paid.</p>

<p>Thank you for your business!</p>

<p>Best regards,<br>{{freelancer_name}}</p>`
        }
      default:
        return { subject: '', content: '' }
    }
  }

  const useDefaultTemplate = () => {
    const templateType = watch('template_type')
    if (templateType) {
      const defaultTemplate = getDefaultTemplate(templateType)
      setValue('subject', defaultTemplate.subject)
      setValue('html_content', defaultTemplate.content)
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
    <div className="space-y-8">
      {/* Provider Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Server className="h-6 w-6 mr-2 text-blue-600" />
          Email Provider Settings
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Provider
            </label>
            <select
              value={providerSettings.provider}
              onChange={(e) => setProviderSettings(prev => ({ ...prev, provider: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="system">System Default (No-Reply)</option>
              <option value="brevo">Brevo (Sendinblue)</option>
              <option value="resend">Resend</option>
            </select>
          </div>

          {providerSettings.provider === 'brevo' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900">Brevo Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={providerSettings.brevo_config?.api_key || ''}
                  onChange={(e) => setProviderSettings(prev => ({
                    ...prev,
                    brevo_config: { ...prev.brevo_config!, api_key: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="xkeysib-..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your Brevo API v3 key
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={providerSettings.brevo_config?.sender_name || ''}
                    onChange={(e) => setProviderSettings(prev => ({
                      ...prev,
                      brevo_config: { ...prev.brevo_config!, sender_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My Company"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={providerSettings.brevo_config?.sender_email || ''}
                    onChange={(e) => setProviderSettings(prev => ({
                      ...prev,
                      brevo_config: { ...prev.brevo_config!, sender_email: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@mycompany.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be a verified sender in Brevo
                  </p>
                </div>
              </div>
            </div>
          )}

          {providerSettings.provider === 'resend' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900">Resend Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={providerSettings.resend_config?.api_key || ''}
                  onChange={(e) => setProviderSettings(prev => ({
                    ...prev,
                    resend_config: { ...prev.resend_config!, api_key: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="re_..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your Resend API key
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={providerSettings.resend_config?.sender_name || ''}
                    onChange={(e) => setProviderSettings(prev => ({
                      ...prev,
                      resend_config: { ...prev.resend_config!, sender_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My Company"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={providerSettings.resend_config?.sender_email || ''}
                    onChange={(e) => setProviderSettings(prev => ({
                      ...prev,
                      resend_config: { ...prev.resend_config!, sender_email: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="onboarding@resend.dev"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be a verified domain in Resend
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={saveProviderSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Provider Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Email Templates</h3>
          <p className="mt-1 text-sm text-gray-600">
            Customize email templates for invoice notifications
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null)
            reset()
            setShowForm(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Mail className="h-4 w-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {templateTypes.map((type) => {
          const template = templates.find(t => t.template_type === type.value)
          return (
            <div key={type.value} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{type.label}</h4>
                  <p className="text-sm text-gray-600">{type.description}</p>
                  {template && (
                    <p className="text-xs text-gray-500 mt-1">
                      Subject: {template.subject}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {template ? (
                    <>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template.is_enabled}
                          onChange={(e) => toggleTemplate(template.id!, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <button
                        onClick={() => handleEdit(template)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id!)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingTemplate(null)
                        reset({ template_type: type.value as any, is_enabled: true })
                        setShowForm(true)
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Create
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingTemplate(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex">
              {/* Form */}
              <div className="flex-1 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Type
                      </label>
                      <select
                        {...register('template_type', { required: 'Template type is required' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select template type</option>
                        {templateTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors.template_type && (
                        <p className="mt-1 text-sm text-red-600">{errors.template_type.message}</p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={useDefaultTemplate}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Use Default Template
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      {...register('subject', { required: 'Subject is required' })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Invoice {{invoice_number}} from {{freelancer_name}}"
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Content (HTML)
                    </label>
                    <textarea
                      {...register('html_content', { required: 'Content is required' })}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder="Enter your email template content here..."
                    />
                    {errors.html_content && (
                      <p className="mt-1 text-sm text-red-600">{errors.html_content.message}</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('is_enabled')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable this email template
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={generatePreview}
                      className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </button>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false)
                          setEditingTemplate(null)
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
                            {editingTemplate ? 'Update Template' : 'Create Template'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Variables Sidebar */}
              <div className="w-80 bg-gray-50 p-6 border-l border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Variables</h3>
                <div className="space-y-2">
                  {availableVariables.map((variable) => (
                    <div key={variable.variable} className="group">
                      <button
                        type="button"
                        onClick={() => insertVariable(variable.variable)}
                        className="w-full text-left p-2 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono text-blue-600">{variable.variable}</code>
                          <Copy className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Tips</h4>
                      <ul className="text-xs text-blue-700 mt-1 space-y-1">
                        <li>• Click variables to insert them</li>
                        <li>• Use HTML for formatting</li>
                        <li>• Preview before saving</li>
                        <li>• Variables are case-sensitive</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <iframe
                srcDoc={previewContent}
                className="w-full h-96 border border-gray-200 rounded-lg"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}