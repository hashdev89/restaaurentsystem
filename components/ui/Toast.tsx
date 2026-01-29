'use client'

import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types/notification'

const icons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<NotificationType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 [&>svg]:text-emerald-600',
  error: 'bg-red-50 border-red-200 text-red-800 [&>svg]:text-red-600',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600',
  info: 'bg-sky-50 border-sky-200 text-sky-800 [&>svg]:text-sky-600',
}

interface ToastProps {
  id: string
  type: NotificationType
  title: string
  message?: string
  onDismiss: (id: string) => void
  className?: string
}

export function Toast({ id, type, title, message, onDismiss, className }: ToastProps) {
  const Icon = icons[type]

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] max-w-[380px] transition-all duration-200',
        styles[type],
        className
      )}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
