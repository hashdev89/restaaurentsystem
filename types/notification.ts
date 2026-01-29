export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  timestamp: number
  read?: boolean
  /** Optional link for "View order" etc */
  actionHref?: string
  actionLabel?: string
}

export interface NotificationOptions {
  /** Show as toast and add to center. Default true. */
  toast?: boolean
  /** Add to notification center. Default true. */
  persistent?: boolean
  /** Auto-dismiss toast after ms. Default 5000 for success/info, 8000 for warning/error. */
  duration?: number
  /** Optional action link */
  actionHref?: string
  actionLabel?: string
}
