import { useState } from 'react'
import { sendEmail, EmailTemplate } from '../lib/email'

export const useEmail = () => {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (emailData: EmailTemplate): Promise<boolean> => {
    setSending(true)
    setError(null)
    
    try {
      const success = await sendEmail(emailData)
      if (!success) {
        setError('Failed to send email')
        return false
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      return false
    } finally {
      setSending(false)
    }
  }

  return {
    send,
    sending,
    error,
    clearError: () => setError(null)
  }
}