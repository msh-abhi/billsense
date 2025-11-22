import React, { useState, useEffect } from 'react'
import { Layout } from '../Layout/Layout'
import { StatsCard } from './StatsCard'
import { ActivityTimeline } from './ActivityTimeline'
import { QuickActions } from './QuickActions'
import { DollarSign, FileText, TrendingUp, Users, Briefcase } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  hoursThisWeek: number
  totalHoursThisMonth: number
  unpaidInvoices: { count: number; value: number; overdue: number }
  totalInvoices: number
  totalProjects: number
  monthlyEarnings: number
  yearlyEarnings: number
  totalClients: number
  totalExpenses: number
  netIncome: number
  billableHours: number
}

interface RevenueData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

interface InvoiceStatusData {
  name: string
  value: number
  color: string
  [key: string]: any
}

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    hoursThisWeek: 0,
    totalHoursThisMonth: 0,
    unpaidInvoices: { count: 0, value: 0, overdue: 0 },
    totalInvoices: 0,
    totalProjects: 0,
    monthlyEarnings: 0,
    yearlyEarnings: 0,
    totalClients: 0,
    totalExpenses: 0,
    netIncome: 0,
    billableHours: 0
  })
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [invoiceStatusData, setInvoiceStatusData] = useState<InvoiceStatusData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    if (user && profile !== undefined) {
      loadData()
    }
  }, [user, profile, selectedPeriod])

  const loadData = async () => {
    if (!profile?.company_id) return

    setLoading(true)
    try {
      await Promise.all([
        loadDashboardStats(),
        loadChartData()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardStats = async () => {
    try {
      const companyId = profile?.company_id
      // console.log('Dashboard loading stats. CompanyId:', companyId)

      if (!companyId) return

      const userCondition = { company_id: companyId }

      // Date ranges
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const startOfMonth = new Date(now)
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const startOfYear = new Date(now)
      startOfYear.setMonth(0, 1)
      startOfYear.setHours(0, 0, 0, 0)

      // Parallelize independent queries
      const [
        timeLogsWeek,
        timeLogsMonth,
        allInvoices,
        monthlyExpenses,
        projectCount,
        clientCount
      ] = await Promise.all([
        // Hours tracking
        supabase.from('time_entries').select('duration').eq('company_id', companyId).gte('created_at', startOfWeek.toISOString()).not('duration', 'is', null),
        supabase.from('time_entries').select('duration, task_id').eq('company_id', companyId).gte('created_at', startOfMonth.toISOString()).not('duration', 'is', null),

        // Invoice stats (fetch minimal fields)
        supabase.from('invoices').select('total, status, due_date, created_at').match(userCondition),

        // Expenses
        supabase.from('expenses').select('amount').eq('company_id', companyId).gte('expense_date', startOfMonth.toISOString()),

        // Counts
        supabase.from('projects').select('*', { count: 'exact', head: true }).match(userCondition).eq('status', 'active'),
        supabase.from('clients').select('*', { count: 'exact', head: true }).match(userCondition)
      ])

      const hoursThisWeek = (timeLogsWeek.data || []).reduce((sum, log) => sum + (log.duration || 0), 0) / 3600 || 0
      const totalHoursThisMonth = (timeLogsMonth.data || []).reduce((sum, log) => sum + (log.duration || 0), 0) / 3600 || 0
      const billableHours = (timeLogsMonth.data || []).filter(log => log.task_id).reduce((sum, log) => sum + (log.duration || 0), 0) / 3600 || 0

      const invoices = allInvoices.data || []
      const unpaidInvoices = invoices.filter(inv => ['draft', 'sent', 'partial'].includes(inv.status))
      const overdueInvoices = unpaidInvoices.filter(inv => inv.status === 'sent' && new Date(inv.due_date) < now)

      const unpaidValue = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0)
      const overdueValue = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)

      const monthlyInvoices = invoices.filter(inv => inv.status === 'paid' && new Date(inv.created_at) >= startOfMonth)
      const yearlyInvoices = invoices.filter(inv => inv.status === 'paid' && new Date(inv.created_at) >= startOfYear)

      const monthlyEarnings = monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0)
      const yearlyEarnings = yearlyInvoices.reduce((sum, inv) => sum + inv.total, 0)
      const totalExpenses = monthlyExpenses.data?.reduce((sum, exp) => sum + exp.amount, 0) || 0
      const netIncome = monthlyEarnings - totalExpenses

      setStats({
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
        unpaidInvoices: { count: unpaidInvoices.length, value: unpaidValue, overdue: overdueValue },
        totalInvoices: invoices.length,
        totalProjects: projectCount.count || 0,
        monthlyEarnings,
        yearlyEarnings,
        totalClients: clientCount.count || 0,
        totalExpenses,
        netIncome,
        billableHours: Math.round(billableHours * 10) / 10
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
  }

  const loadChartData = async () => {
    try {
      const companyId = profile?.company_id

      if (!companyId) return

      const userCondition = { company_id: companyId }

      // Calculate date range for last 12 months
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 11)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)

      // Fetch all data in parallel
      const [invoicesRes, expensesRes] = await Promise.all([
        supabase.from('invoices')
          .select('total, created_at')
          .match(userCondition)
          .eq('status', 'paid')
          .gte('created_at', startDate.toISOString()),

        supabase.from('expenses')
          .select('amount, expense_date')
          .eq('company_id', companyId)
          .gte('expense_date', startDate.toISOString())
      ])

      // Initialize 12 months buckets
      const monthsMap = new Map<string, { revenue: number; expenses: number; date: Date }>()

      for (let i = 0; i < 12; i++) {
        const d = new Date(startDate)
        d.setMonth(d.getMonth() + i)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthsMap.set(key, { revenue: 0, expenses: 0, date: d })
      }

      // Aggregate Revenue
      invoicesRes.data?.forEach(inv => {
        const d = new Date(inv.created_at)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        if (monthsMap.has(key)) {
          monthsMap.get(key)!.revenue += inv.total
        }
      })

      // Aggregate Expenses
      expensesRes.data?.forEach(exp => {
        const d = new Date(exp.expense_date)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        if (monthsMap.has(key)) {
          monthsMap.get(key)!.expenses += exp.amount
        }
      })

      // Convert to array
      const revenueData = Array.from(monthsMap.entries()).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses
      }))

      setRevenueData(revenueData)

      const { data: invoicesByStatus } = await supabase
        .from('invoices')
        .select('status')
        .match(userCondition)

      const statusCounts = {
        draft: invoicesByStatus?.filter(inv => inv.status === 'draft').length || 0,
        sent: invoicesByStatus?.filter(inv => inv.status === 'sent').length || 0,
        paid: invoicesByStatus?.filter(inv => inv.status === 'paid').length || 0,
        overdue: invoicesByStatus?.filter(inv => inv.status === 'sent' && new Date() > new Date()).length || 0
      }

      setInvoiceStatusData([
        { name: 'Paid', value: statusCounts.paid, color: '#10B981' },
        { name: 'Sent', value: statusCounts.sent, color: '#3B82F6' },
        { name: 'Draft', value: statusCounts.draft, color: '#F59E0B' },
        { name: 'Overdue', value: statusCounts.overdue, color: '#EF4444' }
      ].filter(item => item.value > 0))

    } catch (error) {
      console.error('Error loading chart data:', error)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { value: '+100%', type: 'positive' as const }
    const change = ((current - previous) / previous) * 100
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      type: change >= 0 ? 'positive' as const : 'negative' as const
    }
  }

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Overview">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-100 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm h-32"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // Calculate previous month data for comparison
  const lastMonthRevenue = revenueData[revenueData.length - 2]?.revenue || 0
  const lastMonthExpenses = revenueData[revenueData.length - 2]?.expenses || 0

  return (
    <Layout title="Dashboard" subtitle={`Welcome back, ${user?.email}`}>
      <div className="space-y-8">
        {/* Quick Actions */}
        <QuickActions />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthlyEarnings)}
            change={calculateChange(stats.monthlyEarnings, lastMonthRevenue).value}
            changeType={calculateChange(stats.monthlyEarnings, lastMonthRevenue).type}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Net Income"
            value={formatCurrency(stats.netIncome)}
            change={calculateChange(stats.netIncome, lastMonthRevenue - lastMonthExpenses).value}
            changeType={calculateChange(stats.netIncome, lastMonthRevenue - lastMonthExpenses).type}
            icon={TrendingUp}
            color="purple"
          />
          <StatsCard
            title="Outstanding"
            value={formatCurrency(stats.unpaidInvoices.value)}
            change={stats.unpaidInvoices.overdue > 0 ? `${stats.unpaidInvoices.overdue} overdue` : undefined}
            changeType={stats.unpaidInvoices.overdue > 0 ? 'negative' : 'neutral'}
            icon={FileText}
            color="orange"
          />
          <StatsCard
            title="Active Projects"
            value={stats.totalProjects.toString()}
            icon={Briefcase}
            color="blue"
          />
          <StatsCard
            title="Total Clients"
            value={stats.totalClients.toString()}
            icon={Users}
            color="indigo"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Revenue Analytics</h3>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'year')}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="month">Last 12 Months</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div className="h-80 min-h-[300px]">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Invoice Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Invoice Status</h3>
            <div className="h-64 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {invoiceStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <ActivityTimeline />
      </div>
    </Layout>
  )
}
