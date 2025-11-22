import React, { useEffect, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Notification {
    id: string
    title: string
    message: string
    is_read: boolean
    created_at: string
    type: string
}

interface NotificationsPopoverProps {
    isOpen: boolean
    onClose: () => void
    onCountChange: (count: number) => void
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ isOpen, onClose, onCountChange }) => {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchNotifications()

            // Subscribe to new notifications
            const subscription = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        setNotifications((prev) => [payload.new as Notification, ...prev])
                        onCountChange(notifications.filter(n => !n.is_read).length + 1)
                    }
                )
                .subscribe()

            return () => {
                subscription.unsubscribe()
            }
        }
    }, [user])

    useEffect(() => {
        const unreadCount = notifications.filter(n => !n.is_read).length
        onCountChange(unreadCount)
    }, [notifications, onCountChange])

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error
            setNotifications(data || [])
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)

            if (error) throw error

            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
            )
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
            if (unreadIds.length === 0) return

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds)

            if (error) throw error

            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            )
        } catch (error) {
            console.error('Error marking all as read:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Mark all as read
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium text-gray-900 ${!notification.is_read ? 'font-semibold' : ''}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(notification.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="ml-3 text-gray-400 hover:text-blue-600"
                                            title="Mark as read"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
