'use client'

import { Check, X, Clock } from 'lucide-react'
import { Order, MenuItemCustomizationGroup, OrderItem } from '@/types'
import { priceInclGst, GST_RATE } from '@/lib/gst'

function ItemCustomizations({ customizations }: { customizations?: MenuItemCustomizationGroup[] }) {
  if (!customizations?.length) return null
  return (
    <div className="text-xs text-gray-500 mt-0.5 space-y-0.5 ml-4">
      {customizations.map((g) => {
        const opts = (g.options || []).map((o) => o.name).filter(Boolean).join(', ')
        if (!opts) return null
        if ((g.type || '').toLowerCase() === 'remove') {
          return <div key={g.id}>Remove: {opts}</div>
        }
        const pricePart = (g.options || []).some((o) => Number(o?.price) > 0)
          ? ` (+${(g.options || []).reduce((s, o) => s + Number(o?.price || 0), 0).toFixed(2)} each)`
          : ''
        return <div key={g.id}>Extras: {opts}{pricePart}</div>
      })}
    </div>
  )
}

function ItemCustomerOptions({ item }: { item: OrderItem }) {
  const has =
    (item.selectedRemoves?.length ?? 0) > 0 ||
    (item.selectedExtras?.length ?? 0) > 0 ||
    !!item.spiceLevel ||
    !!item.specialRequest
  if (!has) return null
  return (
    <div className="text-xs text-gray-600 mt-0.5 space-y-0.5 ml-4">
      {item.selectedRemoves?.length ? (
        <div>Remove: {item.selectedRemoves.join(', ')}</div>
      ) : null}
      {item.selectedExtras?.length ? (
        <div>Extras: {item.selectedExtras.map((e) => e.name).join(', ')}</div>
      ) : null}
      {item.spiceLevel ? <div>Spice: {item.spiceLevel}</div> : null}
      {item.specialRequest ? <div>Note: {item.specialRequest}</div> : null}
    </div>
  )
}
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface OrderCardProps {
  order: Order
  onAccept?: (orderId: string) => void
  onReject?: (orderId: string) => void
  onProceedToBilling?: (orderId: string) => void
  /** When false, hide Subtotal, GST, Service fee, TOTAL. Default true. */
  showOrderSummary?: boolean
}

export function OrderCard({ order, onAccept, onReject, onProceedToBilling, showOrderSummary = true }: OrderCardProps) {
  const subtotalInclGst = Math.max(0, order.total - 1)
  const gstIncluded = subtotalInclGst * (GST_RATE / (1 + GST_RATE))
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
        {order.specialRequests && (
          <p className="text-sm text-amber-800 bg-amber-50 mt-2 px-2 py-1 rounded">Seating: {order.specialRequests}</p>
        )}
      </div>

      <div className="flex-1 mb-6">
        <ul className="space-y-2">
          {order.items.map((item, idx) => (
            <li key={idx} className="text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">
                  <span className="font-medium text-gray-900">
                    {item.quantity}x
                  </span>{' '}
                  {item.name}
                </span>
                <span className="text-gray-500">
                  A${priceInclGst(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
              <ItemCustomizations customizations={item.customizations} />
              <ItemCustomerOptions item={item} />
            </li>
          ))}
        </ul>
        {showOrderSummary && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (incl. GST)</span>
              <span>A${subtotalInclGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST included (10%)</span>
              <span>A${gstIncluded.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Service fee</span>
              <span>A$1.00</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 pt-1">
              <span>TOTAL</span>
              <span>A${order.total.toFixed(2)}</span>
            </div>
          </div>
        )}
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

