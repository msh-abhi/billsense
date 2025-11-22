import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  color: 'blue' | 'green' | 'orange' | 'purple' | 'indigo'
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600'
}

const changeStyles = {
  positive: 'text-green-600 bg-green-50',
  negative: 'text-red-600 bg-red-50',
  neutral: 'text-gray-500 bg-gray-50'
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color
}) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${colorStyles[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${changeStyles[changeType]}`}>
            {changeType === 'positive' && <TrendingUp className="h-3 w-3 mr-1" />}
            {changeType === 'negative' && <TrendingDown className="h-3 w-3 mr-1" />}
            {changeType === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
            {change}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
      </div>
    </div>
  )
}