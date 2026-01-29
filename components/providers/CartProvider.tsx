'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { CartItem, MenuItem } from '@/types'

interface CartContextType {
  items: CartItem[]
  addItem: (item: MenuItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
  /** Table number when customer scans QR (dine-in); used at checkout */
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

  const addItem = (item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(itemId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
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

