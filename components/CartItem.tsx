'use client'

import { useCallback } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { CartItem as CartItemType } from '@/types'
import { useCart, getCartLineKey } from './providers/CartProvider'
import { Button } from './ui/Button'
import { priceInclGst, gstAmount } from '@/lib/gst'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart()
  const lineKey = item.selectedSize ?? ''
  const optionsKey = getCartLineKey(item)

  const hasOptions =
    (item.selectedRemoves?.length ?? 0) > 0 ||
    (item.selectedExtras?.length ?? 0) > 0 ||
    !!item.spiceLevel ||
    !!item.specialRequest

  const handleDecrease = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      updateQuantity(item.id, item.quantity - 1, lineKey)
    },
    [item.id, item.quantity, lineKey, updateQuantity]
  )

  const handleIncrease = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      updateQuantity(item.id, item.quantity + 1, lineKey)
    },
    [item.id, item.quantity, lineKey, updateQuantity]
  )

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900">
          {item.name}
          {item.selectedSize && <span className="text-gray-600 font-normal"> ({item.selectedSize})</span>}
        </h4>
        {hasOptions && (
          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
            {item.selectedRemoves?.length ? (
              <p>Remove: {item.selectedRemoves.join(', ')}</p>
            ) : null}
            {item.selectedExtras?.length ? (
              <p>Extras: {item.selectedExtras.map((e) => e.name).join(', ')}</p>
            ) : null}
            {item.spiceLevel ? <p>Spice: {item.spiceLevel}</p> : null}
            {item.specialRequest ? <p>Note: {item.specialRequest}</p> : null}
          </div>
        )}
        <p className="text-sm text-gray-500 mt-1">A${priceInclGst(item.price ?? 0).toFixed(2)} each</p>
        <p className="text-xs text-gray-400 mt-0.5">GST: A${(gstAmount(item.price ?? 0) * item.quantity).toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="inline-flex items-center border border-gray-200 rounded-md bg-white"
          style={{ touchAction: 'manipulation' }}
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            onClick={handleDecrease}
            className="shrink-0 w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-l-md border-0 cursor-pointer select-none"
            style={{ touchAction: 'manipulation' }}
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4 pointer-events-none" />
          </button>
          <span className="w-8 text-center text-sm font-medium select-none tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={handleIncrease}
            className="shrink-0 w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-r-md border-0 cursor-pointer select-none"
            style={{ touchAction: 'manipulation' }}
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4 pointer-events-none" />
          </button>
        </div>

        <div className="text-right min-w-[80px]">
          <p className="font-medium text-gray-900">
            A${(priceInclGst(item.price ?? 0) * item.quantity).toFixed(2)}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(item.id, lineKey, optionsKey); }}
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

