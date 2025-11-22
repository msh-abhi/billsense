import React from 'react'
import { MoreVertical, Clock, DollarSign, User, Edit, Trash2, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Project {
  id: string
  name: string
  description: string | null
  hourly_rate: number
  currency: string
  status: string
  created_at: string
  client_name?: string
  total_hours?: number
  total_earnings?: number
}

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = React.useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'completed': return 'Completed'
      case 'on_hold': return 'On Hold'
      default: return status
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
          {project.client_name && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <User className="h-4 w-4 mr-1" />
              {project.client_name}
            </div>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <Link
                to="/time-tracker"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <Play className="h-4 w-4 mr-3" />
                Start Timer
              </Link>
              <button
                onClick={() => {
                  onEdit(project)
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-3" />
                Edit Project
              </button>
              <button
                onClick={() => {
                  onDelete(project.id)
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Project
              </button>
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Clock className="h-4 w-4 text-gray-500 mr-1" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{project.total_hours || 0}h</div>
          <div className="text-xs text-gray-500">Total Hours</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {project.currency} {project.total_earnings?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-gray-500">Earned</div>
        </div>
      </div>

      <div className="text-sm text-gray-500 border-t pt-3">
        <div className="flex justify-between">
          <span>Rate:</span>
          <span className="font-medium">{project.currency} {project.hourly_rate}/hour</span>
        </div>
      </div>
    </div>
  )
}