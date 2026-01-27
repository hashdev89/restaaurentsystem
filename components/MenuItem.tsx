'use client'

import { Plus } from 'lucide-react'
import { MenuItem as MenuItemType } from '@/types'
import { Button } from './ui/Button'
import { useCart } from './providers/CartProvider'

interface MenuItemProps {
  item: MenuItemType
}

export function MenuItem({ item }: MenuItemProps) {
  const { addItem } = useCart()

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
            <span className="font-medium text-gray-900">
              ${item.price.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {item.description}
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => addItem(item)}
            disabled={!item.isAvailable}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}

