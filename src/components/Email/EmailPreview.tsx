import React from 'react'
import { X } from 'lucide-react'

interface EmailPreviewProps {
  subject: string
  htmlContent: string
  recipientEmail: string
  onClose: () => void
  onSend: () => void
  sending: boolean
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  subject,
  htmlContent,
  recipientEmail,
  onClose,
  onSend,
  sending
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Email Preview</h2>
            <p className="text-sm text-gray-600 mt-1">To: {recipientEmail}</p>
            <p className="text-sm text-gray-600">Subject: {subject}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <iframe
              srcDoc={htmlContent}
              className="w-full h-96 border-0"
              title="Email Preview"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              'Send Email'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}