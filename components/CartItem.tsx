'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import { CartItem as CartItemType } from '@/types'
import { useCart } from './providers/CartProvider'
import { Button } from './ui/Button'
import { priceInclGst, gstAmount } from '@/lib/gst'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{item.name}</h4>
        <p className="text-sm text-gray-500">A${priceInclGst(item.price).toFixed(2)} each</p>
        <p className="text-xs text-gray-400 mt-0.5">GST: A${(gstAmount(item.price) * item.quantity).toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-200 rounded-md">
          <button
            className="p-1 hover:bg-gray-50 text-gray-600"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <button
            className="p-1 hover:bg-gray-50 text-gray-600"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right min-w-[80px]">
          <p className="font-medium text-gray-900">
            A${(priceInclGst(item.price) * item.quantity).toFixed(2)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
          onClick={() => removeItem(item.id)}
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

