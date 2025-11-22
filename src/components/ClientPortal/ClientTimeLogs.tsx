import React, { useState, useEffect } from 'react'
import { Clock, Calendar, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ClientLayout } from './ClientLayout'

interface TimeLog {
    id: string
    project_name: string
    description: string | null
    start_time: string
    end_time: string | null
    duration: number | null
    is_running: boolean
}

export const ClientTimeLogs: React.FC = () => {
    const { user } = useAuth()
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
    const [loading, setLoading] = useState(true)
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        if (user) {
            loadData()
        }
    }, [user, weekStart, selectedProject])

    const loadData = async () => {
        try {
            setLoading(true)
            // 1. Get client_id
            const { data: clientUser } = await supabase
                .from('client_users')
                .select('client_id')
                .eq('id', user!.id)
                .single()

            if (!clientUser) return

            // 2. Get projects for filter
            const { data: projectList } = await supabase
                .from('projects')
                .select('id, name')
                .eq('client_id', clientUser.client_id)
                .order('name')

            if (projectList) {
                setProjects(projectList)
            }

            // 3. Get time entries
            const weekEnd = endOfWeek(weekStart)

            let query = supabase
                .from('time_entries')
                .select(`
          id, description, start_time, end_time, duration, is_running,
          projects!inner (id, name, client_id)
        `)
                .eq('projects.client_id', clientUser.client_id)
                .gte('start_time', weekStart.toISOString())
                .lte('start_time', weekEnd.toISOString())
                .order('start_time', { ascending: false })

            if (selectedProject !== 'all') {
                query = query.eq('project_id', selectedProject)
            }

            const { data, error } = await query

            if (error) throw error

            const formattedLogs = data?.map(log => ({
                id: log.id,
                project_name: (log.projects as any)?.name || 'Unknown Project',
                description: log.description,
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

    return (
        <ClientLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Time Logs</h1>
                        <p className="text-sm text-gray-600 mt-1">View time tracked for your projects</p>
                    </div>

                    <div className="flex items-center space-x-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
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
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-500">
                            <Filter className="h-5 w-5 mr-2" />
                            <span className="text-sm font-medium">Filter by Project:</span>
                        </div>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="text-sm font-medium text-gray-900">
                        Total Hours: <span className="text-blue-600 text-lg ml-1">{getTotalHours().toFixed(1)}h</span>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="animate-pulse space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {timeLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-lg">No time logs found for this period</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {timeLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3">
                                                <div className="font-medium text-gray-900 truncate">{log.project_name}</div>
                                                {log.is_running && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Running
                                                    </span>
                                                )}
                                            </div>
                                            {log.description && (
                                                <div className="text-sm text-gray-600 mt-1 truncate">{log.description}</div>
                                            )}
                                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {format(new Date(log.start_time), 'MMM d, h:mm a')}
                                                {log.end_time && (
                                                    <span> - {format(new Date(log.end_time), 'h:mm a')}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ml-4 flex-shrink-0">
                                            <div className="text-lg font-mono font-semibold text-gray-900">
                                                {formatDuration(log.duration)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ClientLayout>
    )
}
