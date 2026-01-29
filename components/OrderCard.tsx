'use client'

import { Check, X, Clock } from 'lucide-react'
import { Order } from '@/types'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface OrderCardProps {
  order: Order
  onAccept?: (orderId: string) => void
  onReject?: (orderId: string) => void
  onProceedToBilling?: (orderId: string) => void
}

export function OrderCard({ order, onAccept, onReject, onProceedToBilling }: OrderCardProps) {
  const statusVariant = {
    pending: 'warning',
    accepted: 'success',
    preparing: 'info',
    ready: 'success',
    rejected: 'danger',
    completed: 'info'
  } as const

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg">Order #{order.id.slice(-4)}</h3>
            <Badge variant={statusVariant[order.status]}>
              {order.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(order.createdAt)}
          </p>
          {order.orderType && (
            <p className="text-xs text-gray-500 mt-1">
              {order.orderType === 'dine-in' && order.tableNumber
                ? `Table ${order.tableNumber}`
                : order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">A${order.total.toFixed(2)}</p>
          <p className="text-xs text-gray-500">{order.items.length} items</p>
        </div>
      </div>

      <div className="mb-4 bg-gray-50 p-3 rounded-md">
        <p className="font-medium text-sm text-gray-900">
          {order.customerName}
        </p>
        <p className="text-sm text-gray-600">{order.customerPhone}</p>
        <p className="text-sm text-gray-600">{order.customerEmail}</p>
      </div>

      <div className="flex-1 mb-6">
        <ul className="space-y-2">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">
                <span className="font-medium text-gray-900">
                  {item.quantity}x
                </span>{' '}
                {item.name}
              </span>
              <span className="text-gray-500">
                A${(item.price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {order.status === 'pending' && onAccept && onReject && (
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <Button variant="danger" onClick={() => onReject(order.id)}>
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="primary"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onAccept(order.id)}
          >
            <Check className="w-4 h-4 mr-2" />
            Accept
          </Button>
        </div>
      )}
      {order.status === 'ready' && onProceedToBilling && (
        <div className="mt-auto">
          <Button
            variant="primary"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onProceedToBilling(order.id)}
          >
            <Check className="w-4 h-4 mr-2" />
            Proceed to billing
          </Button>
        </div>
      )}
    </Card>
  )
}

