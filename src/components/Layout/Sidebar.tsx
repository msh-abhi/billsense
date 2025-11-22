import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Clock,
  FolderOpen,
  Receipt,
  Users,
  Settings,
  LogOut,
  FileText,
  CreditCard,
  BarChart3
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Time Tracker', href: '/time-tracker', icon: Clock },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Expenses', href: '/expenses', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white border-r border-slate-800">
      <div className="flex h-16 items-center px-6 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center">
          <div className="bg-blue-600 p-1.5 rounded-lg mr-3">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">BillSense</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
          Menu
        </div>
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 transition-colors
                  ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}
                `}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800 bg-slate-900">
        <button
          onClick={handleSignOut}
          className="group flex w-full items-center px-3 py-2.5 text-sm font-medium text-slate-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-500 group-hover:text-red-400" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
