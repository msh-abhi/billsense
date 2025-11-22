import React, { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, DollarSign, PieChart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

import { Layout } from '../Layout/Layout'

export const Reports: React.FC = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalRevenue: 0,
        outstandingAmount: 0,
        totalExpenses: 0,
        netIncome: 0
    })

    useEffect(() => {
        if (user) {
            fetchReportData()
        }
    }, [user])

    const fetchReportData = async () => {
        try {
            // Get company_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user!.id)
                .single()

            const companyId = profile?.company_id

            // Fetch Invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('total, amount_paid, status')
                .eq('company_id', companyId)

            // Fetch Expenses
            const { data: expenses } = await supabase
                .from('expenses')
                .select('amount')
                .eq('company_id', companyId)

            const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0
            const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
            const outstandingAmount = totalInvoiced - totalRevenue
            const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

            setStats({
                totalRevenue,
                outstandingAmount,
                totalExpenses,
                netIncome: totalRevenue - totalExpenses
            })
        } catch (error) {
            console.error('Error fetching report data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Layout title="Reports" subtitle="Financial Overview">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Reports" subtitle="Financial Overview">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
                    <div className="flex space-x-2">
                        <select className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm">
                            <option>This Month</option>
                            <option>Last Month</option>
                            <option>This Year</option>
                            <option>All Time</option>
                        </select>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
                        <p className="text-sm text-green-600 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +12.5% from last month
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Net Income</h3>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${stats.netIncome.toFixed(2)}</p>
                        <p className="text-sm text-blue-600 mt-1">
                            Profit Margin: {stats.totalRevenue ? ((stats.netIncome / stats.totalRevenue) * 100).toFixed(1) : 0}%
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Expenses</h3>
                            <div className="p-2 bg-red-50 rounded-lg">
                                <PieChart className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${stats.totalExpenses.toFixed(2)}</p>
                        <p className="text-sm text-red-600 mt-1">
                            {stats.totalRevenue ? ((stats.totalExpenses / stats.totalRevenue) * 100).toFixed(1) : 0}% of revenue
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
                            <div className="p-2 bg-yellow-50 rounded-lg">
                                <DollarSign className="h-5 w-5 text-yellow-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${stats.outstandingAmount.toFixed(2)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Unpaid Invoices
                        </p>
                    </div>
                </div>

                {/* Placeholder for Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">Chart Visualization Placeholder</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">Chart Visualization Placeholder</p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    )
}
