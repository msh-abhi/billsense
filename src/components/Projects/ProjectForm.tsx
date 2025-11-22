import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Client {
  id: string
  name: string
}

interface ProjectFormData {
  name: string
  description: string
  client_id: string
  project_type: 'hourly' | 'fixed'
  hourly_rate: number
  fixed_price: number
  currency: string
  status: string
}

interface ProjectFormProps {
  project?: any
  onSuccess: () => void
  onCancel: () => void
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSuccess, onCancel }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<ProjectFormData>({
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      client_id: project?.client_id || '',
      project_type: project?.project_type || 'hourly',
      hourly_rate: project?.hourly_rate || 50,
      fixed_price: project?.fixed_price || 0,
      currency: project?.currency || 'USD',
      status: project?.status || 'active'
    }
  })

  const projectType = watch('project_type')

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        client_id: project.client_id || '',
        project_type: project.project_type || 'hourly',
        hourly_rate: project.hourly_rate || 50,
        fixed_price: project.fixed_price || 0,
        currency: project.currency,
        status: project.status
      })
    }
  }, [project, reset])

  const loadClients = async () => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError || !profile?.company_id) {
        setClients([])
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true)
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      if (profileError || !profile?.company_id) {
        alert('Company profile not found. Please complete company setup first.')
        return
      }

      const projectData = {
        ...data,
        company_id: profile.company_id,
        user_id: user!.id,
        client_id: data.client_id || null,
        description: data.description || null,
        // Set appropriate rate based on project type
        hourly_rate: data.project_type === 'hourly' ? data.hourly_rate : 0,
        fixed_price: data.project_type === 'fixed' ? data.fixed_price : 0
      }

      if (project) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', project.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projects')
          .insert(projectData)

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              {...register('name', { required: 'Project name is required' })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            {loadingClients ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
            ) : (
              <select
                {...register('client_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a client (optional)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Type
            </label>
            <select
              {...register('project_type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="hourly">Hourly Rate</option>
              <option value="fixed">Fixed Price</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Project description (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {projectType === 'hourly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate
                </label>
                <input
                  {...register('hourly_rate', { 
                    required: projectType === 'hourly' ? 'Hourly rate is required' : false,
                    min: { value: 0, message: 'Rate must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50.00"
                />
                {errors.hourly_rate && (
                  <p className="mt-1 text-sm text-red-600">{errors.hourly_rate.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fixed Price
                </label>
                <input
                  {...register('fixed_price', { 
                    required: projectType === 'fixed' ? 'Fixed price is required' : false,
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1000.00"
                />
                {errors.fixed_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.fixed_price.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                {...register('currency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

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
                project ? 'Update Project' : 'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}