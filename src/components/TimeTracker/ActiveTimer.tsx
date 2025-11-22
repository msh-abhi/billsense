import React, { useState, useEffect } from 'react'
import { Square } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActiveTimerProps {
  session: {
    id: string
    project_name: string
    task_description: string
    start_time: string
  }
  onStop: () => void
  loading: boolean
}

export const ActiveTimer: React.FC<ActiveTimerProps> = ({ session, onStop, loading }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startTime = new Date(session.start_time).getTime()
    
    const updateElapsed = () => {
      const now = Date.now()
      setElapsed(Math.floor((now - startTime) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [session.start_time])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(elapsed)}
        </div>
        <div className="text-sm text-gray-500">
          Started {formatDistanceToNow(new Date(session.start_time), { addSuffix: true })}
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-1">{session.project_name}</h3>
        {session.task_description && (
          <p className="text-gray-600">{session.task_description}</p>
        )}
      </div>

      <button
        onClick={onStop}
        disabled={loading}
        className="flex items-center justify-center px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium mx-auto"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
        ) : (
          <Square className="h-5 w-5 mr-3" />
        )}
        Stop Timer
      </button>

      <div className="mt-4 flex justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Recording time...</span>
        </div>
      </div>
    </div>
  )
}