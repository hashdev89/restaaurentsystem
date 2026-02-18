'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** When true and type="password", show an eye icon to toggle password visibility */
  showPasswordToggle?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, type, showPasswordToggle, ...props }, ref) => {
    const inputId = id || props.name
    const isPassword = type === 'password'
    const [visible, setVisible] = React.useState(false)
    const effectiveType = isPassword && showPasswordToggle ? (visible ? 'text' : 'password') : type

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={`
              flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${isPassword && showPasswordToggle ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

