import React from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface EmailStatusProps {
  status: 'success' | 'error' | 'warning'
  message: string
  onClose?: () => void
}

export const EmailStatus: React.FC<EmailStatusProps> = ({ status, message, onClose }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-800'
        }
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-800'
        }
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-800'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 mb-4`}>
      <div className="flex items-center">
        <Icon className={`h-5 w-5 ${config.iconColor} mr-3`} />
        <p className={`text-sm font-medium ${config.textColor}`}>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-auto ${config.textColor} hover:opacity-75 transition-opacity`}
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}