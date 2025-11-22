import React, { useState, useEffect } from 'react'
import { Clock, Calendar, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, startOfWeek, endOfWeek } from 'date-fns'

interface TimeLog {
  id: string
  project_name: string
  task_description: string | null
  start_time: string
  end_time: string | null
  duration: number | null
  is_running: boolean
}

export const TimeLogsList: React.FC = () => {
  const { user } = useAuth()
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))

  useEffect(() => {
    if (user) {
      loadTimeLogs()
    }
  }, [user, weekStart])

  const loadTimeLogs = async () => {
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.company_id) {
        setTimeLogs([])
        return
      }

      const weekEnd = endOfWeek(weekStart)

      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id, description, start_time, end_time, duration, is_running,
          projects (name)
        `)
        .eq('company_id', profile.company_id)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: false })

      if (error) throw error

      const formattedLogs = data?.map(log => ({
        id: log.id,
        project_name: (log.projects as any)?.name || 'Unknown Project',
        task_description: log.description,
        start_time: log.start_time,
        end_time: log.end_time,
        duration: log.duration,
        is_running: log.is_running
      })) || []

      setTimeLogs(formattedLogs)
    } catch (error) {
      console.error('Error loading time logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTimeLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time log?')) return

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTimeLogs(logs => logs.filter(log => log.id !== id))
    } catch (error) {
      console.error('Error deleting time log:', error)
      alert('Failed to delete time log')
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalHours = () => {
    return timeLogs.reduce((total, log) => {
      return total + (log.duration || 0)
    }, 0) / 3600
  }

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(newWeekStart.getDate() - 7)
    setWeekStart(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(newWeekStart.getDate() + 7)
    setWeekStart(newWeekStart)
  }

  const goToCurrentWeek = () => {
    setWeekStart(startOfWeek(new Date()))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Time Logs</h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ←
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart), 'MMM d, yyyy')}
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              →
            </button>
          </div>
          
          <div className="text-sm font-medium text-gray-900">
            Total: {getTotalHours().toFixed(1)}h
          </div>
        </div>
      </div>

      {timeLogs.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No time logs for this week</p>
          <p className="text-sm text-gray-400 mt-1">Start tracking time to see logs here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="font-medium text-gray-900">{log.project_name}</div>
                  {log.is_running && (
                    <div className="flex items-center text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                      Running
                    </div>
                  )}
                </div>
                {log.task_description && (
                  <div className="text-sm text-gray-600 mt-1">{log.task_description}</div>
                )}
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {format(new Date(log.start_time), 'MMM d, h:mm a')}
                  {log.end_time && (
                    <span> - {format(new Date(log.end_time), 'h:mm a')}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-lg font-mono font-semibold text-gray-900">
                  {formatDuration(log.duration)}
                </div>
                {!log.is_running && (
                  <button
                    onClick={() => deleteTimeLog(log.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}