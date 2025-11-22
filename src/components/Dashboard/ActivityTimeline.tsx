import React, { useState, useEffect } from 'react'
import { Clock, FileText, DollarSign, Play, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'time_start' | 'time_stop' | 'invoice_created' | 'invoice_sent' | 'invoice_paid'
  description: string
  time: string
  metadata?: any
}

export const ActivityTimeline: React.FC = () => {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadRecentActivity()
    }
  }, [user])

  const loadRecentActivity = async () => {
    try {
      // Get recent time logs
      const { data: timeLogs } = await supabase
        .from('time_entries')
        .select(`
          id, created_at, start_time, end_time, description,
          projects (name)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Get recent invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id, created_at, updated_at, status, invoice_number, total,
          clients (name)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const recentActivities: Activity[] = []

      // Process time logs
      timeLogs?.forEach(log => {
        const project = log.projects as any
        if (log.end_time) {
          recentActivities.push({
            id: `time_stop_${log.id}`,
            type: 'time_stop',
            description: `Stopped tracking time for ${project?.name || 'Unknown Project'}`,
            time: log.end_time,
            metadata: { task: log.description }
          })
        }
        recentActivities.push({
          id: `time_start_${log.id}`,
          type: 'time_start',
          description: `Started tracking time for ${project?.name || 'Unknown Project'}`,
          time: log.start_time,
          metadata: { task: log.description }
        })
      })

      // Process invoices
      invoices?.forEach(invoice => {
        const client = invoice.clients as any
        recentActivities.push({
          id: `invoice_${invoice.id}`,
          type: invoice.status === 'paid' ? 'invoice_paid' :
            invoice.status === 'sent' ? 'invoice_sent' : 'invoice_created',
          description: `Invoice ${invoice.invoice_number} ${invoice.status === 'paid' ? 'was paid' :
            invoice.status === 'sent' ? 'was sent' : 'was created'
            } for ${client?.name || 'Unknown Client'} - $${invoice.total}`,
          time: invoice.status === 'paid' ? invoice.updated_at : invoice.created_at,
          metadata: { amount: invoice.total }
        })
      })

      // Sort by time and take top 8
      recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setActivities(recentActivities.slice(0, 8))
    } catch (error) {
      console.error('Error loading recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'time_start': return Play
      case 'time_stop': return Pause
      case 'invoice_created': return FileText
      case 'invoice_sent': return FileText
      case 'invoice_paid': return DollarSign
      default: return Clock
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'time_start': return 'bg-green-100 text-green-600'
      case 'time_stop': return 'bg-gray-100 text-gray-600'
      case 'invoice_created': return 'bg-blue-100 text-blue-600'
      case 'invoice_sent': return 'bg-purple-100 text-purple-600'
      case 'invoice_paid': return 'bg-green-100 text-green-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No recent activity</p>
          <p className="text-sm text-gray-400 mt-1">Start tracking time or create an invoice to see activity here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type)
            const colorClass = getActivityColor(activity.type)

            return (
              <div key={activity.id} className="relative flex items-start space-x-4">
                {index !== activities.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-gray-100"></div>
                )}
                <div className={`relative z-10 p-2 rounded-lg ${colorClass} shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}