'use client'

import { useState, useEffect, useCallback } from 'react'
import { Timer } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useNotification } from '../providers/NotificationProvider'
import { Order, OrderStatus } from '@/types'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'

const KDS_RESTAURANT_ID = 'rest_1'
const KDS_POLL_MS = 5000

export function KitchenDisplaySystem() {
  const { success, info } = useNotification()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?restaurantId=${KDS_RESTAURANT_ID}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.orders || []) as SupabaseOrderRow[]
      const normalized = normalizeOrders(list)
      setOrders(normalized.filter((o) => ['accepted', 'preparing', 'ready'].includes(o.status)))
    } catch (e) {
      console.error('KDS fetch orders error:', e)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, KDS_POLL_MS)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const filteredOrders = orders.filter(
    (order) => filter === 'all' || order.status === filter
  )

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Update failed')
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
      const label = order ? `Order #${orderId.slice(-8)}` : orderId
      if (newStatus === 'ready') {
        success('Order ready', `${label} is ready for pickup / delivery.`)
      } else if (newStatus === 'completed') {
        success('Order completed', `${label} has been completed.`)
      } else {
        info('Status updated', `${label} → ${newStatus}.`)
      }
    } catch (e) {
      console.error('KDS update status error:', e)
    }
  }

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60)
    return `${elapsed} min`
  }

  const groupedByStatus = {
    accepted: filteredOrders.filter((o) => o.status === 'accepted'),
    preparing: filteredOrders.filter((o) => o.status === 'preparing'),
    ready: filteredOrders.filter((o) => o.status === 'ready')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Kitchen Display System</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md ${
                filter === 'all' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 rounded-md ${
                filter === 'accepted' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Accepted ({groupedByStatus.accepted.length})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-4 py-2 rounded-md ${
                filter === 'preparing' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Preparing ({groupedByStatus.preparing.length})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-4 py-2 rounded-md ${
                filter === 'ready' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Ready ({groupedByStatus.ready.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`bg-gray-800 border-gray-700 ${
                order.status === 'ready' ? 'ring-4 ring-green-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">#{order.id.slice(-3)}</h2>
                  <p className="text-gray-400 text-sm mt-1">{order.customerName}</p>
                  {order.tableNumber && (
                    <Badge variant="info" className="mt-2">
                      Table {order.tableNumber}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <Timer className="w-5 h-5" />
                    <span className="font-bold">{getElapsedTime(order.createdAt)}</span>
                  </div>
                  <Badge
                    variant={
                      order.status === 'ready'
                        ? 'success'
                        : order.status === 'preparing'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-700 rounded-md p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {item.quantity}x {item.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {order.status === 'accepted' && (
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                  >
                    Start Preparing
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                  >
                    Mark Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                  >
                    Complete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card className="bg-gray-800 p-12 text-center">
            <p className="text-gray-400 text-lg">No orders in this status</p>
          </Card>
        )}
      </div>
    </div>
  )
}

