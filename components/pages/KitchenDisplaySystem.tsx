'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Timer } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useNotification } from '../providers/NotificationProvider'
import { Order, OrderStatus } from '@/types'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'

const KDS_POLL_MS = 5000

function getDefaultRestaurantId(): string {
  if (typeof process === 'undefined' || !process.env) return ''
  return process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID || ''
}

export function KitchenDisplaySystem() {
  const { success, info } = useNotification()
  const [defaultRestaurantId, setDefaultRestaurantId] = useState(getDefaultRestaurantId())
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  useEffect(() => {
    if (getDefaultRestaurantId()) return
    let cancelled = false
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.restaurants?.length) return
        setDefaultRestaurantId(data.restaurants[0].id)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [])

  const fetchOrders = useCallback(async () => {
    if (!defaultRestaurantId) return
    try {
      const res = await fetch(`/api/orders?restaurantId=${encodeURIComponent(defaultRestaurantId)}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.orders || []) as SupabaseOrderRow[]
      const normalized = normalizeOrders(list)
      // Normalize status to lowercase so badge counts and filter stay in sync (API/DB may return mixed case)
      const kdsStatuses: OrderStatus[] = ['accepted', 'preparing', 'ready', 'completed']
      const withNormalizedStatus = normalized.map((o) => ({
        ...o,
        status: (typeof o.status === 'string' ? o.status.toLowerCase().trim() : '') as OrderStatus
      }))
      setOrders(withNormalizedStatus.filter((o) => kdsStatuses.includes(o.status)))
    } catch (e) {
      console.error('KDS fetch orders error:', e)
    }
  }, [defaultRestaurantId])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, KDS_POLL_MS)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // Normalize status for comparison (API/DB may return mixed case or spaces)
  const norm = (s: string) => String(s ?? '').toLowerCase().trim()

  const filteredOrders = useMemo(() => {
    const list = orders.filter(
      (order) => filter === 'all' || norm(order.status) === filter
    )
    // Completed tab: show as summary, newest first
    if (filter === 'completed') {
      return [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
    return list
  }, [orders, filter])

  // Badge counts: always from full orders list, memoized so they only change when orders change (not when filter changes)
  const statusCounts = useMemo(() => ({
    accepted: orders.filter((o) => norm(o.status) === 'accepted').length,
    preparing: orders.filter((o) => norm(o.status) === 'preparing').length,
    ready: orders.filter((o) => norm(o.status) === 'ready').length,
    completed: orders.filter((o) => norm(o.status) === 'completed').length
  }), [orders])

  const acceptedCount = statusCounts.accepted
  const preparingCount = statusCounts.preparing
  const readyCount = statusCounts.ready
  const completedCount = statusCounts.completed

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
        success('Order ready', `${label} — proceed to billing in POS to complete.`)
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
              Accepted (<span data-kds-count="accepted">{acceptedCount}</span>)
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-4 py-2 rounded-md ${
                filter === 'preparing' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Preparing (<span data-kds-count="preparing">{preparingCount}</span>)
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-4 py-2 rounded-md ${
                filter === 'ready' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Ready (<span data-kds-count="ready">{readyCount}</span>)
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md ${
                filter === 'completed' ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Completed (<span data-kds-count="completed">{completedCount}</span>)
            </button>
          </div>
        </div>

        {filter === 'completed' && (
          <p className="mb-4 text-gray-400 text-lg">
            Summary of orders completed via POS (Proceed to billing → checkout). Newest first.
          </p>
        )}

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
                  <h2 className="text-2xl font-bold text-white">#{order.id.slice(-8)}</h2>
                  <p className="text-gray-400 text-sm mt-1">{order.customerName}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="info" className="capitalize">
                      {order.orderType || 'dine-in'}
                    </Badge>
                    {order.orderType === 'dine-in' && order.tableNumber && (
                      <Badge variant="info">Table {order.tableNumber}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <Timer className="w-5 h-5" />
                    <span className="font-bold">{getElapsedTime(order.createdAt)}</span>
                  </div>
                  <Badge
                    variant={
                      order.status === 'completed'
                        ? 'default'
                        : order.status === 'ready'
                        ? 'success'
                        : order.status === 'preparing'
                        ? 'warning'
                        : 'info'
                    }
                    className={order.status === 'completed' ? 'bg-gray-600 text-gray-200' : ''}
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

              {/* KDS only: accepted → preparing → ready. Completion is done in POS (Proceed to billing). */}
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
              </div>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card className="bg-gray-800 p-12 text-center">
            <p className="text-gray-400 text-lg">
              {filter === 'completed'
                ? 'No completed orders yet. Complete an order in POS (Proceed to billing → checkout) to see it here.'
                : 'No orders in this status'}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

