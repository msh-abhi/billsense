import React from 'react'
import { MoreVertical, Mail, DollarSign, FolderOpen, Edit, Trash2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Client {
  id: string
  name: string
  email: string
  currency: string
  created_at: string
  project_count?: number
  total_invoiced?: number
}

interface ClientCardProps {
  client: Client
  onEdit: (client: Client) => void
  onDelete: (clientId: string) => void
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = React.useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Mail className="h-4 w-4 mr-1" />
            <a 
              href={`mailto:${client.email}`}
              className="hover:text-blue-600 transition-colors"
            >
              {client.email}
            </a>
          </div>
          <div className="text-xs text-gray-500">
            Client since {formatDate(client.created_at)}
          </div>
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
                to="/projects"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <Plus className="h-4 w-4 mr-3" />
                New Project
              </Link>
              <Link
                to="/invoices"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <Plus className="h-4 w-4 mr-3" />
                New Invoice
              </Link>
              <button
                onClick={() => {
                  onEdit(client)
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-3" />
                Edit Client
              </button>
              <button
                onClick={() => {
                  onDelete(client.id)
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Client
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <FolderOpen className="h-4 w-4 text-gray-500 mr-1" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{client.project_count || 0}</div>
          <div className="text-xs text-gray-500">Projects</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {client.currency} {client.total_invoiced?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-gray-500">Invoiced</div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Link
          to="/projects"
          className="flex-1 text-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
        >
          View Projects
        </Link>
        <Link
          to="/invoices"
          className="flex-1 text-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
        >
          Create Invoice
        </Link>
      </div>
    </div>
  )
}