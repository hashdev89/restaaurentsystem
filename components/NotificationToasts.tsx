'use client'

import { useNotification } from './providers/NotificationProvider'
import { Toast } from './ui/Toast'

export function NotificationToasts() {
  const { toasts, dismissToast } = useNotification()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            type={t.type}
            title={t.title}
            message={t.message}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </div>
  )
}
