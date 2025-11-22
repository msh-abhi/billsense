import React, { useState, useEffect } from 'react'
import { Layout } from '../Layout/Layout'
import { Receipt, Plus, Search, Filter, Download, Receipt as ExpenseIcon, Calendar, DollarSign, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ExpenseForm } from './ExpenseForm'

interface Expense {
  id: string
  category: string
  amount: number
  currency: string
  expense_date: string
  description: string | null
  receipt_url: string | null
  is_billable: boolean
  is_invoiced: boolean
  project_id: string | null
  project_name?: string
  created_at: string
}

interface ExpensesProps {
  openForm?: boolean
}

export const Expenses: React.FC<ExpensesProps> = ({ openForm = false }) => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showForm, setShowForm] = useState(openForm)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  useEffect(() => {
    if (user) {
      loadExpenses()
    }
  }, [user])

  useEffect(() => {
    if (openForm) {
      setShowForm(true)
    }
  }, [openForm])

  const loadExpenses = async () => {
    try {
      // First get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      if (!profile?.company_id) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          projects (name)
        `)
        .eq('company_id', profile.company_id)
        .order('expense_date', { ascending: false })

      if (error) throw error

      const formattedExpenses = data?.map(expense => ({
        ...expense,
        project_name: expense.projects?.name || null
      })) || []

      setExpenses(formattedExpenses)
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExpense = () => {
    setEditingExpense(null)
    setShowForm(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingExpense(null)
    loadExpenses()
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      setExpenses(expenses.filter(e => e.id !== expenseId))
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense')
    }
  }

  const handleToggleBillable = async (expenseId: string, isBillable: boolean) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ is_billable: isBillable })
        .eq('id', expenseId)

      if (error) throw error

      setExpenses(expenses.map(expense =>
        expense.id === expenseId
          ? { ...expense, is_billable: isBillable }
          : expense
      ))
    } catch (error) {
      console.error('Error updating expense:', error)
      alert('Failed to update expense')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getCategories = () => {
    return ['all', ...Array.from(new Set(expenses.map(e => e.category)))]
  }

  const getTotalAmount = () => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Layout title="Expenses" subtitle="Track your business expenses">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm h-48"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Expenses" subtitle="Track your business expenses">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  USD {getTotalAmount().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Billable</p>
                <p className="text-2xl font-bold text-gray-900">
                  {expenses.filter(e => e.is_billable).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                {getCategories().map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >
                <Receipt className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >
                <Receipt className="h-4 w-4" />
              </button>
            </div>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={handleCreateExpense}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Expenses Display */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExpenseIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first expense'
              }
            </p>
            {!searchTerm && categoryFilter === 'all' && (
              <button
                onClick={handleCreateExpense}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{expense.category}</h3>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {expense.currency} {expense.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(expense.expense_date)}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {expense.project_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Tag className="h-4 w-4 mr-2" />
                      {expense.project_name}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Billable:</span>
                    <button
                      onClick={() => handleToggleBillable(expense.id, !expense.is_billable)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${expense.is_billable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {expense.is_billable ? 'Yes' : 'No'}
                    </button>
                  </div>

                  {expense.is_invoiced && (
                    <div className="text-sm text-blue-600 font-medium">✓ Invoiced</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditExpense(expense)}
                    className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billable
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {expense.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {expense.currency} {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.project_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleBillable(expense.id, !expense.is_billable)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.is_billable
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {expense.is_billable ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800 px-2 py-1 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <ExpenseForm
            expense={editingExpense}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingExpense(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
