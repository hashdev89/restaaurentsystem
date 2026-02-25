'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle, ChefHat, Package } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Order, OrderStatus } from '@/types'
import { GST_RATE } from '@/lib/gst'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'

const statusSteps: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'pending', label: 'Order Placed', icon: <Clock className="w-5 h-5" /> },
  { status: 'accepted', label: 'Accepted', icon: <CheckCircle className="w-5 h-5" /> },
  { status: 'preparing', label: 'Preparing', icon: <ChefHat className="w-5 h-5" /> },
  { status: 'ready', label: 'Ready', icon: <Package className="w-5 h-5" /> },
  { status: 'completed', label: 'Completed', icon: <CheckCircle className="w-5 h-5" /> }
]

export default function OrderViewPage() {
  const params = useParams()
  const orderId = typeof params?.orderId === 'string' ? params.orderId : ''
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setNotFound(true)
      return
    }
    let cancelled = false
    fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const list = (data?.orders ?? []) as SupabaseOrderRow[]
        const normalized = normalizeOrders(list)
        const o = normalized.find((x) => x.id === orderId) ?? normalized[0] ?? null
        setOrder(o ?? null)
        setNotFound(!o)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading order…</p>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Order not found</h1>
          <p className="text-gray-600 mb-6">This order may have been removed or the link is invalid.</p>
          <Link href="/orders" className="text-orange-600 font-medium hover:underline">Track your orders</Link>
        </div>
      </div>
    )
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.status === order.status)
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your order</h1>
        <p className="text-gray-600 mb-6">Scan this page from your receipt to view order status.</p>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h2>
              <p className="text-sm text-gray-500 mt-1">Placed at {formatTime(order.createdAt)}</p>
              {order.orderType === 'dine-in' && order.tableNumber && (
                <p className="text-sm text-gray-600 mt-1">Table {order.tableNumber}</p>
              )}
            </div>
            <Badge
              variant={
                order.status === 'completed' ? 'success' : order.status === 'rejected' ? 'danger' : 'info'
              }
            >
              {order.status.toUpperCase()}
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex
                return (
                  <div key={step.status} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <p className={`text-xs mt-2 text-center ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Items</h3>
            <ul className="space-y-2">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span>A${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="text-right font-semibold mt-2 text-gray-900">
              Total (incl. GST): A${(order.total * (1 + GST_RATE)).toFixed(2)}
            </p>
          </div>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/" className="text-orange-600 hover:underline">Back to EasyMenu</Link>
        </p>
      </div>
    </div>
  )
}
