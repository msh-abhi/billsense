import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Play, FileText, Users } from 'lucide-react'

export const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'Start Timer',
      icon: Play,
      href: '/time-tracker',
      color: 'bg-green-600',
      hover: 'hover:bg-green-700'
    },
    {
      title: 'New Project',
      icon: Plus,
      href: '/projects',
      color: 'bg-blue-600',
      hover: 'hover:bg-blue-700'
    },
    {
      title: 'New Invoice',
      icon: FileText,
      href: '/invoices',
      color: 'bg-purple-600',
      hover: 'hover:bg-purple-700'
    },
    {
      title: 'New Client',
      icon: Users,
      href: '/clients',
      color: 'bg-orange-600',
      hover: 'hover:bg-orange-700'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {actions.map((action) => (
        <Link
          key={action.title}
          to={action.href}
          className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
        >
          <div className={`p-2.5 rounded-lg ${action.color} text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="ml-3 font-medium text-gray-700 group-hover:text-gray-900">
            {action.title}
          </span>
        </Link>
      ))}
    </div>
  )
}