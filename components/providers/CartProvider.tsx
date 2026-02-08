'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { CartItem, MenuItem, SelectedExtra } from '@/types'

/** Stable key for matching cart lines with same customizations (removes, extras, spice, request). */
export function getCartLineKey(item: CartItem): string {
  const r = (item.selectedRemoves ?? []).slice().sort().join(',')
  const e = (item.selectedExtras ?? []).map((x) => x.id).sort().join(',')
  const s = item.spiceLevel ?? ''
  const t = item.specialRequest ?? ''
  return [r, e, s, t].join('|')
}

export type AddItemOptions = {
  selectedSize?: string
  sizePrice?: number
  selectedRemoves?: string[]
  selectedExtras?: SelectedExtra[]
  spiceLevel?: string
  specialRequest?: string
}

interface CartContextType {
  items: CartItem[]
  /** When item has sizes/customizations, pass options for price and line matching. */
  addItem: (item: MenuItem, options?: AddItemOptions) => void
  removeItem: (itemId: string, selectedSize?: string, optionsKey?: string) => void
  updateQuantity: (itemId: string, quantity: number, selectedSize?: string, optionsKey?: string) => void
  clearCart: () => void
  total: number
  itemCount: number
  tableNumber: string | null
  setTableNumber: (table: string | null) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_TABLE_KEY = 'restaurant-cart-table'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [tableNumber, setTableNumberState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CART_TABLE_KEY)
  })

  const setTableNumber = (table: string | null) => {
    setTableNumberState(table)
    if (typeof window !== 'undefined') {
      if (table) localStorage.setItem(CART_TABLE_KEY, table)
      else localStorage.removeItem(CART_TABLE_KEY)
    }
  }

  // Load cart and table from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('restaurant-cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse cart from local storage')
      }
    }
    const savedTable = localStorage.getItem(CART_TABLE_KEY)
    if (savedTable) setTableNumberState(savedTable)
  }, [])

  // Save cart to local storage on change
  useEffect(() => {
    localStorage.setItem('restaurant-cart', JSON.stringify(items))
  }, [items])

  const addItem = (item: MenuItem, options?: AddItemOptions) => {
    const sizeLabel = options?.selectedSize ?? ''
    const basePrice = options?.sizePrice != null ? options.sizePrice : item.price
    const extrasTotal = (options?.selectedExtras ?? []).reduce((sum, e) => sum + (e.price ?? 0), 0)
    const effectivePrice = basePrice + extrasTotal
    const incomingKey = [
      (options?.selectedRemoves ?? []).slice().sort().join(','),
      (options?.selectedExtras ?? []).map((x) => x.id).sort().join(','),
      options?.spiceLevel ?? '',
      options?.specialRequest ?? ''
    ].join('|')
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.id === item.id &&
          (i.selectedSize ?? '') === sizeLabel &&
          getCartLineKey(i) === incomingKey
      )
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && (i.selectedSize ?? '') === sizeLabel && getCartLineKey(i) === incomingKey
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      const newItem: CartItem = {
        ...item,
        price: effectivePrice,
        quantity: 1,
        ...(sizeLabel ? { selectedSize: sizeLabel } : {}),
        ...(options?.selectedRemoves?.length ? { selectedRemoves: options.selectedRemoves } : {}),
        ...(options?.selectedExtras?.length ? { selectedExtras: options.selectedExtras } : {}),
        ...(options?.spiceLevel ? { spiceLevel: options.spiceLevel } : {}),
        ...(options?.specialRequest ? { specialRequest: options.specialRequest } : {})
      }
      return [...prev, newItem]
    })
  }

  const removeItem = (itemId: string, selectedSize?: string, optionsKey?: string) => {
    const key = optionsKey ?? ''
    setItems((prev) =>
      prev.filter(
        (i) =>
          !(
            i.id === itemId &&
            (i.selectedSize ?? '') === (selectedSize ?? '') &&
            getCartLineKey(i) === key
          )
      )
    )
  }

  const updateQuantity = (itemId: string, quantity: number, selectedSize?: string, optionsKey?: string) => {
    if (quantity < 1) {
      removeItem(itemId, selectedSize, optionsKey)
      return
    }
    const key = optionsKey ?? ''
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId && (i.selectedSize ?? '') === (selectedSize ?? '') && getCartLineKey(i) === key
          ? { ...i, quantity }
          : i
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        tableNumber,
        setTableNumber
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

