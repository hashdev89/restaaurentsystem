'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  Trash2,
} from 'lucide-react'
import { useNotification } from './providers/NotificationProvider'
import { Button } from './ui/Button'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notification'

const icons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString()
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, remove } = useNotification()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const list = [...notifications].reverse()

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        aria-label={open ? 'Close notifications' : 'Open notifications'}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        <span className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold min-w-[1rem] ${mounted && unreadCount > 0 ? 'bg-orange-600 text-white' : 'bg-transparent text-transparent pointer-events-none'}`}>
          {mounted ? (unreadCount > 99 ? '99+' : unreadCount) : 0}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[360px] max-h-[420px] flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-700"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {list.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No notifications yet</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {list.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markAsRead(n.id)}
                    onRemove={() => remove(n.id)}
                    onClosePanel={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
  onClosePanel,
}: {
  notification: Notification
  onMarkRead: () => void
  onRemove: () => void
  onClosePanel: () => void
}) {
  const Icon = icons[notification.type]
  const isUnread = !notification.read

  const content = (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 text-left transition-colors',
        isUnread ? 'bg-orange-50/50' : 'bg-white hover:bg-gray-50'
      )}
    >
      <div className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center', {
        'bg-emerald-100': notification.type === 'success',
        'bg-red-100': notification.type === 'error',
        'bg-amber-100': notification.type === 'warning',
        'bg-sky-100': notification.type === 'info',
      })}>
        <Icon className={cn('w-4 h-4', {
          'text-emerald-600': notification.type === 'success',
          'text-red-600': notification.type === 'error',
          'text-amber-600': notification.type === 'warning',
          'text-sky-600': notification.type === 'info',
        })} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', isUnread ? 'text-gray-900' : 'text-gray-700')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatTime(notification.timestamp)}</p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {isUnread && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onMarkRead() }}
            className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onRemove() }}
          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const wrappy = notification.actionHref ? (
    <Link
      href={notification.actionHref}
      onClick={onClosePanel}
      className="block focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded"
    >
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  )

  return <li className="list-none">{wrappy}</li>
}
