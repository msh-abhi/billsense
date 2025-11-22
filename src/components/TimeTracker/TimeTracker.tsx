import React, { useState, useEffect } from 'react'
import { Layout } from '../Layout/Layout'
import { ActiveTimer } from './ActiveTimer'
import { TimeLogsList } from './TimeLogsList'
import { ProjectSelector } from './ProjectSelector'
import { Play } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface ActiveSession {
  id: string
  project_id: string
  task_description: string
  start_time: string
  project_name: string
}

export const TimeTracker: React.FC = () => {
  const { user } = useAuth()
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [taskDescription, setTaskDescription] = useState('')
  const [isBillable, setIsBillable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (user) {
      checkActiveSession()
    }
  }, [user])

  const checkActiveSession = async () => {
    try {
      const { data } = await supabase
        .from('time_entries')
        .select(`
          id, project_id, description, start_time,
          projects (name)
        `)
        .eq('user_id', user!.id)
        .eq('is_running', true)
        .maybeSingle()

      if (data) {
        setActiveSession({
          id: data.id,
          project_id: data.project_id,
          task_description: data.description || '',
          start_time: data.start_time,
          project_name: (data.projects as any)?.name || 'Unknown Project'
        })
      }
    } catch (error) {
      // No active session found
      console.log('No active session')
    }
  }

  const startTimer = async () => {
    if (!selectedProjectId) {
      alert('Please select a project first')
      return
    }

    setLoading(true)
    try {
      // Get company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single()

      if (!profile?.company_id) throw new Error('No company found')

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user!.id,
          company_id: profile.company_id,
          project_id: selectedProjectId,
          description: taskDescription || null,
          is_billable: isBillable,
          start_time: new Date().toISOString(),
          is_running: true
        })
        .select(`
          id, project_id, description, start_time,
          projects (name)
        `)
        .single()

      if (error) throw error

      setActiveSession({
        id: data.id,
        project_id: data.project_id,
        task_description: data.description || '',
        start_time: data.start_time,
        project_name: (data.projects as any)?.name || 'Unknown Project'
      })

      setTaskDescription('')
    } catch (error) {
      console.error('Error starting timer:', error)
      alert('Failed to start timer')
    } finally {
      setLoading(false)
    }
  }

  const stopTimer = async () => {
    if (!activeSession) return

    setLoading(true)
    try {
      const endTime = new Date()
      const startTime = new Date(activeSession.start_time)
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration,
          is_running: false
        })
        .eq('id', activeSession.id)

      if (error) throw error

      setActiveSession(null)
      // Trigger refresh of time logs list
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error stopping timer:', error)
      alert('Failed to stop timer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Time Tracker" subtitle="Track your project time with precision">
      <div className="space-y-6">
        {/* Timer Control */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeSession ? (
            <ActiveTimer
              session={activeSession}
              onStop={stopTimer}
              loading={loading}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Start New Session</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Project
                  </label>
                  <ProjectSelector
                    value={selectedProjectId}
                    onChange={setSelectedProjectId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Description <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="What are you working on?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-3 flex items-center">
                    <input
                      type="checkbox"
                      id="isBillable"
                      checked={isBillable}
                      onChange={(e) => setIsBillable(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isBillable" className="ml-2 block text-sm text-gray-900">
                      Billable
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={startTimer}
                  disabled={loading || !selectedProjectId}
                  className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  ) : (
                    <Play className="h-5 w-5 mr-3" />
                  )}
                  Start Timer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Time Logs */}
        <TimeLogsList key={refreshTrigger} />
      </div>
    </Layout>
  )
}