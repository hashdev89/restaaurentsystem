'use client'

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
} from 'react'
import type { Notification, NotificationType, NotificationOptions } from '@/types/notification'

const STORAGE_KEY = 'restaurant-notifications'
const MAX_PERSISTED = 50
const DEFAULT_DURATION: Record<NotificationType, number> = {
  success: 5000,
  info: 5000,
  warning: 8000,
  error: 8000,
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  add: (type: NotificationType, title: string, message?: string, options?: NotificationOptions) => string
  success: (title: string, message?: string, options?: NotificationOptions) => string
  error: (title: string, message?: string, options?: NotificationOptions) => string
  warning: (title: string, message?: string, options?: NotificationOptions) => string
  info: (title: string, message?: string, options?: NotificationOptions) => string
  remove: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  /** Toasts shown in the UI (subset of notifications, auto-managed) */
  toasts: Notification[]
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

function loadPersisted(): Notification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Notification[]
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED) : []
  } catch {
    return []
  }
}

function savePersisted(notifications: Notification[]) {
  if (typeof window === 'undefined') return
  try {
    const toSave = notifications.slice(-MAX_PERSISTED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // ignore
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadPersisted)
  const [toasts, setToasts] = useState<Notification[]>([])
  const toastTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const unreadCount = notifications.filter((n) => !n.read).length

  const add = useCallback(
    (type: NotificationType, title: string, message?: string, options?: NotificationOptions): string => {
      const id = `n-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const toast = options?.toast !== false
      const persistent = options?.persistent !== false
      const duration = options?.duration ?? DEFAULT_DURATION[type]

      const notification: Notification = {
        id,
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
        actionHref: options?.actionHref,
        actionLabel: options?.actionLabel,
      }

      if (persistent) {
        setNotifications((prev) => {
          const next = [...prev, notification].slice(-MAX_PERSISTED)
          savePersisted(next)
          return next
        })
      }

      if (toast) {
        setToasts((prev) => [...prev, notification])
        const t = setTimeout(() => {
          setToasts((prev) => prev.filter((n) => n.id !== id))
          toastTimeouts.current.delete(id)
        }, duration)
        toastTimeouts.current.set(id, t)
      }

      return id
    },
    []
  )

  const dismissToast = useCallback((id: string) => {
    const t = toastTimeouts.current.get(id)
    if (t) {
      clearTimeout(t)
      toastTimeouts.current.delete(id)
    }
    setToasts((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const remove = useCallback((id: string) => {
    dismissToast(id)
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id)
      savePersisted(next)
      return next
    })
  }, [dismissToast])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      savePersisted(next)
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      savePersisted(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
    toastTimeouts.current.forEach((t) => clearTimeout(t))
    toastTimeouts.current.clear()
    setNotifications([])
    savePersisted([])
  }, [])

  const success = useCallback(
    (title: string, message?: string, options?: NotificationOptions) =>
      add('success', title, message, options),
    [add]
  )
  const error = useCallback(
    (title: string, message?: string, options?: NotificationOptions) =>
      add('error', title, message, options),
    [add]
  )
  const warning = useCallback(
    (title: string, message?: string, options?: NotificationOptions) =>
      add('warning', title, message, options),
    [add]
  )
  const info = useCallback(
    (title: string, message?: string, options?: NotificationOptions) =>
      add('info', title, message, options),
    [add]
  )

  useEffect(() => {
    const timeouts = toastTimeouts.current
    return () => {
      timeouts.forEach((t) => clearTimeout(t))
      timeouts.clear()
    }
  }, [])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    add,
    success,
    error,
    warning,
    info,
    remove,
    markAsRead,
    markAllAsRead,
    clearAll,
    toasts,
    dismissToast,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (ctx === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return ctx
}
