import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Project {
    id: string
    name: string
}

interface ExpenseFormData {
    category: string
    amount: number
    currency: string
    expense_date: string
    description: string
    project_id: string
    is_billable: boolean
    receipt_url: string
}

interface ExpenseFormProps {
    expense?: any
    onSuccess: () => void
    onCancel: () => void
}

const EXPENSE_CATEGORIES = [
    'Travel',
    'Meals',
    'Office Supplies',
    'Software',
    'Hardware',
    'Utilities',
    'Rent',
    'Professional Services',
    'Advertising',
    'Other'
]

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSuccess, onCancel }) => {
    const { user } = useAuth()
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm<ExpenseFormData>({
        defaultValues: {
            category: expense?.category || '',
            amount: expense?.amount || '',
            currency: expense?.currency || 'USD',
            expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
            description: expense?.description || '',
            project_id: expense?.project_id || '',
            is_billable: expense?.is_billable || false,
            receipt_url: expense?.receipt_url || ''
        }
    })

    useEffect(() => {
        if (user) {
            loadProjects()
        }
    }, [user])

    const loadProjects = async () => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .single()

            if (!profile?.company_id) return

            const { data } = await supabase
                .from('projects')
                .select('id, name')
                .eq('company_id', profile.company_id)
                .order('name')

            setProjects(data || [])
        } catch (error) {
            console.error('Error loading projects:', error)
        }
    }

    const onSubmit = async (data: ExpenseFormData) => {
        setLoading(true)
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .single()

            if (!profile?.company_id) {
                alert('Company profile not found')
                return
            }

            const expenseData = {
                company_id: profile.company_id,
                category: data.category,
                amount: Number(data.amount),
                currency: data.currency,
                expense_date: data.expense_date,
                description: data.description || null,
                project_id: data.project_id || null,
                is_billable: data.is_billable,
                receipt_url: data.receipt_url || null
            }

            if (expense) {
                const { error } = await supabase
                    .from('expenses')
                    .update(expenseData)
                    .eq('id', expense.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert(expenseData)

                if (error) throw error
            }

            onSuccess()
        } catch (error) {
            console.error('Error saving expense:', error)
            alert('Failed to save expense')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {expense ? 'Edit Expense' : 'Add Expense'}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            {...register('category', { required: 'Category is required' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select a category</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && (
                            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount
                            </label>
                            <input
                                {...register('amount', {
                                    required: 'Amount is required',
                                    min: { value: 0.01, message: 'Amount must be positive' }
                                })}
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.amount && (
                                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date
                            </label>
                            <input
                                {...register('expense_date', { required: 'Date is required' })}
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project (Optional)
                        </label>
                        <select
                            {...register('project_id')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select a project</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            {...register('description')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            {...register('is_billable')}
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                            Billable to client
                        </label>
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
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Saving...' : (expense ? 'Update Expense' : 'Add Expense')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
