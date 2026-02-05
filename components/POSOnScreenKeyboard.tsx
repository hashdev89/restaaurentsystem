'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type KeyboardType = 'number' | 'text'

interface POSKeyboardContextValue {
  isOpen: boolean
  inputType: KeyboardType
  openKeyboard: (type: KeyboardType, getValue: () => string, setValue: (v: string) => void) => void
  closeKeyboard: () => void
  getValue: () => string
  setValue: (v: string) => void
}

const POSKeyboardContext = createContext<POSKeyboardContextValue | null>(null)

export function usePOSKeyboard() {
  const ctx = useContext(POSKeyboardContext)
  return ctx
}

const NUMBERS = [7, 8, 9, 4, 5, 6, 1, 2, 3] as const
const ROW1 = 'qwertyuiop'.split('')
const ROW2 = 'asdfghjkl'.split('')
const ROW3 = 'zxcvbnm'.split('')

export function POSKeyboardProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputType, setInputType] = useState<KeyboardType>('text')
  const [workingValue, setWorkingValue] = useState('')
  const getValueRef = useRef<() => string>(() => '')
  const setValueRef = useRef<(v: string) => void>(() => { /* set by openKeyboard */ })
  const activeElementRef = useRef<HTMLElement | null>(null)

  const openKeyboard = useCallback((type: KeyboardType, getValue: () => string, setValue: (v: string) => void) => {
    getValueRef.current = getValue
    setValueRef.current = setValue
    setInputType(type)
    setWorkingValue(getValueRef.current?.() ?? '')
    activeElementRef.current = document.activeElement as HTMLElement | null
    setIsOpen(true)
  }, [])

  const closeKeyboard = useCallback(() => {
    setIsOpen(false)
    setWorkingValue('')
    activeElementRef.current?.blur()
    activeElementRef.current = null
  }, [])

  const getValue = useCallback(() => getValueRef.current?.() ?? '', [])
  const setValue = useCallback((v: string) => {
    setWorkingValue(v)
    setValueRef.current?.(v)
  }, [])

  const value: POSKeyboardContextValue = {
    isOpen,
    inputType,
    openKeyboard,
    closeKeyboard,
    getValue,
    setValue,
  }

  return (
    <POSKeyboardContext.Provider value={value}>
      {children}
      <POSKeyboardDrawer
        isOpen={isOpen}
        type={inputType}
        displayValue={workingValue}
        setValue={setValue}
        onClose={closeKeyboard}
      />
    </POSKeyboardContext.Provider>
  )
}

interface DrawerProps {
  isOpen: boolean
  type: KeyboardType
  displayValue: string
  setValue: (v: string) => void
  onClose: () => void
}

function POSKeyboardDrawer({ isOpen, type, displayValue, setValue, onClose }: DrawerProps) {
  const [shift, setShift] = useState(false)

  const handleKey = useCallback(
    (key: string) => {
      setValue(displayValue + key)
    },
    [displayValue, setValue]
  )

  const handleBackspace = useCallback(() => {
    setValue(displayValue.slice(0, -1))
  }, [displayValue, setValue])

  const handleClear = useCallback(() => setValue(''), [setValue])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 h-1/2 min-h-[400px] flex flex-col bg-gray-100 border-t-2 border-gray-300 shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-white border-b-2 border-gray-200 shrink-0">
          <div className="min-h-14 flex-1 rounded-xl bg-gray-100 px-4 py-2.5 sm:px-5 sm:py-3 text-right flex items-center justify-end">
            <p className="text-xl sm:text-2xl md:text-3xl font-semibold tabular-nums text-gray-900 truncate">
              {displayValue || ' '}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-95 touch-manipulation"
            aria-label="Close keyboard"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {type === 'number' ? (
          <div className="flex-1 flex flex-col justify-center p-3 sm:p-4 pb-safe min-h-0">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-lg mx-auto w-full h-full max-h-full content-center [grid-auto-rows:minmax(4rem,1fr)]">
              {NUMBERS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKey(String(n))}
                  className="min-h-[4rem] sm:min-h-[4.5rem] rounded-2xl bg-white border-2 border-gray-300 text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (!displayValue.includes('.')) setValue(displayValue ? displayValue + '.' : '0.')
                }}
                className="min-h-[4rem] sm:min-h-[4.5rem] rounded-2xl bg-white border-2 border-gray-300 text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleKey('0')}
                className="min-h-[4rem] sm:min-h-[4.5rem] rounded-2xl bg-white border-2 border-gray-300 text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="min-h-[4rem] sm:min-h-[4.5rem] rounded-2xl bg-gray-200 border-2 border-gray-400 text-lg sm:text-xl font-bold text-gray-700 shadow-md hover:bg-gray-300 active:scale-95 touch-manipulation select-none"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="min-h-[4rem] sm:min-h-[4.5rem] rounded-2xl bg-red-100 border-2 border-red-300 text-lg sm:text-xl font-bold text-red-700 col-span-2 shadow-md hover:bg-red-200 active:scale-95 touch-manipulation select-none"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[4rem] sm:min-h-[4.5rem] rounded-2xl bg-green-600 border-2 border-green-700 text-lg sm:text-xl font-bold text-white shadow-md hover:bg-green-500 active:scale-95 touch-manipulation select-none"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center p-3 sm:p-4 pb-safe gap-2 sm:gap-3 max-w-4xl mx-auto w-full min-h-0">
            <div className="flex justify-center gap-1.5 sm:gap-2 [&>button]:min-h-[3.25rem] [&>button]:sm:min-h-[3.5rem]">
              {ROW1.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleKey(shift ? c.toUpperCase() : c)}
                  className="min-w-[2.25rem] sm:min-w-[2.5rem] flex-1 max-w-[3.5rem] rounded-xl bg-white border-2 border-gray-300 text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-800 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
                >
                  {shift ? c.toUpperCase() : c}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-1.5 sm:gap-2 [&>button]:min-h-[3.25rem] [&>button]:sm:min-h-[3.5rem]">
              {ROW2.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleKey(shift ? c.toUpperCase() : c)}
                  className="min-w-[2.25rem] sm:min-w-[2.5rem] flex-1 max-w-[3.5rem] rounded-xl bg-white border-2 border-gray-300 text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-800 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
                >
                  {shift ? c.toUpperCase() : c}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-1.5 sm:gap-2 [&>button]:min-h-[3.25rem] [&>button]:sm:min-h-[3.5rem]">
              <button
                type="button"
                onClick={() => setShift((s) => !s)}
                className={cn(
                  'min-w-[2.75rem] sm:min-w-[3rem] rounded-xl border-2 text-lg font-bold shadow-md active:scale-95 touch-manipulation select-none',
                  shift ? 'bg-amber-200 border-amber-400 text-amber-900' : 'bg-gray-200 border-gray-400 text-gray-700'
                )}
              >
                ⇧
              </button>
              {ROW3.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleKey(shift ? c.toUpperCase() : c)}
                  className="min-w-[2.25rem] sm:min-w-[2.5rem] flex-1 max-w-[3.5rem] rounded-xl bg-white border-2 border-gray-300 text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-800 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
                >
                  {shift ? c.toUpperCase() : c}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                className="min-w-[2.75rem] sm:min-w-[3rem] rounded-xl bg-gray-200 border-2 border-gray-400 text-xl sm:text-2xl font-bold text-gray-700 shadow-md hover:bg-gray-300 active:scale-95 touch-manipulation select-none"
              >
                ⌫
              </button>
            </div>
            <div className="flex justify-center gap-2 sm:gap-3 [&>button]:min-h-[3.25rem] [&>button]:sm:min-h-[3.5rem]">
              <button
                type="button"
                onClick={() => handleKey(' ')}
                className="flex-1 max-w-sm rounded-xl bg-white border-2 border-gray-300 text-lg sm:text-xl font-medium text-gray-600 shadow-md hover:bg-gray-50 active:scale-95 touch-manipulation select-none"
              >
                Space
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 sm:px-8 rounded-xl bg-green-600 border-2 border-green-700 text-lg sm:text-xl font-bold text-white shadow-md hover:bg-green-500 active:scale-95 touch-manipulation select-none"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/** Wrapper for Input that opens the on-screen keyboard on focus (use inside POSKeyboardProvider) */
interface POSInputProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'onChange'> {
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  keyboardType?: KeyboardType
  label?: string
  error?: string
}

export const POSInput = React.forwardRef<HTMLInputElement, POSInputProps>(
  ({ value = '', onChange, onFocus, type: inputType, keyboardType, label, error, className = '', id, name, ...props }, ref) => {
    const ctx = usePOSKeyboard()
    const inputId = id ?? name

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(e)
      if (ctx) {
        const kType = keyboardType ?? (inputType === 'number' ? 'number' : 'text')
        ctx.openKeyboard(kType, () => String(value ?? ''), (v) => onChange?.({ target: { value: v } }))
      }
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange?.({ target: { value: e.target.value } })}
          onFocus={handleFocus}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
POSInput.displayName = 'POSInput'
