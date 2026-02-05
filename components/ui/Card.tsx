'use client'

interface CardProps {
  children: React.ReactNode
  className?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
}

export function Card({
  children,
  className = '',
  header,
  footer,
  onClick
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}
      {...(onClick && { onClick })}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  )
}

