import React, { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Project {
  id: string
  name: string
  client_name?: string
  project_type: string
}

interface ProjectSelectorProps {
  value: string
  onChange: (projectId: string) => void
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ value, onChange }) => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, project_type,
          clients (name)
        `)
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .eq('project_type', 'hourly') // Only show hourly projects for time tracking
        .order('name')

      if (error) throw error

      const formattedProjects = data.map(project => ({
        id: project.id,
        name: project.name,
        client_name: project.clients?.name,
        project_type: project.project_type
      }))

      setProjects(formattedProjects)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No hourly projects available for time tracking.</p>
        <p className="text-sm">Create an hourly project first.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
      >
        <option value="">Select a project...</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} {project.client_name && `(${project.client_name})`}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  )
}