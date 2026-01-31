'use client'

import { useState } from 'react'
import { Clock, CheckCircle, ChefHat, Package, Search, User } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Order, OrderStatus } from '@/types'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'

const statusSteps: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'pending', label: 'Order Placed', icon: <Clock className="w-5 h-5" /> },
  { status: 'accepted', label: 'Accepted', icon: <CheckCircle className="w-5 h-5" /> },
  { status: 'preparing', label: 'Preparing', icon: <ChefHat className="w-5 h-5" /> },
  { status: 'ready', label: 'Ready', icon: <Package className="w-5 h-5" /> },
  { status: 'completed', label: 'Completed', icon: <CheckCircle className="w-5 h-5" /> }
]

export function OrderTracking() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customerName, setCustomerName] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const phoneTrim = phone.trim()
    if (!phoneTrim) return
    setLoading(true)
    setSearched(true)
    setOrders([])
    setCustomerName('')
    try {
      const params = new URLSearchParams()
      params.set('customerPhone', phoneTrim)
      if (email.trim()) params.set('customerEmail', email.trim().toLowerCase())
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.orders ?? []) as SupabaseOrderRow[]
      const seen = new Set<string>()
      const deduped = list.filter((o) => {
        if (seen.has(o.id)) return false
        seen.add(o.id)
        return true
      })
      const normalized = normalizeOrders(deduped)
      setOrders(normalized)
      if (normalized.length > 0 && normalized[0].customerName) {
        setCustomerName(normalized[0].customerName)
      }
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIndex = (status: OrderStatus) => {
    return statusSteps.findIndex((step) => step.status === status)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
        <p className="text-gray-600 mb-8">
          Enter the phone number you used when placing your order to see only your orders.
        </p>

        {/* Lookup form – required to see orders */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-orange-600" />
            Find my orders
          </h2>
          <form onSubmit={handleLookup} className="space-y-4">
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0412 345 678"
              required
              autoComplete="tel"
            />
            <Input
              label="Email (optional – helps match your orders)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Searching…' : 'Find my orders'}
            </Button>
          </form>
        </Card>

        {/* Results – only this customer's orders */}
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 text-lg">Loading your orders…</p>
          </Card>
        ) : searched && orders.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600 font-medium">No orders found</p>
            <p className="text-sm text-gray-500 mt-1">
              Check the phone number (and email if you used one). Orders are listed under the details you gave at checkout.
            </p>
          </Card>
        ) : orders.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-6 px-1">
              <User className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Orders for {customerName || 'you'}
              </h2>
            </div>
            <div className="space-y-6">
              {orders.map((order) => {
                const currentStepIndex = getStatusIndex(order.status)
                return (
                  <Card key={order.id} className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Placed at {formatTime(order.createdAt)}
                        </p>
                        {order.orderType === 'dine-in' && order.tableNumber && (
                          <p className="text-sm text-gray-600 mt-1">Table {order.tableNumber}</p>
                        )}
                        {order.orderType !== 'dine-in' && (
                          <p className="text-sm text-gray-600 mt-1 capitalize">{order.orderType}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">A${order.total.toFixed(2)}</p>
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'success'
                              : order.status === 'rejected'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        {statusSteps.map((step, index) => {
                          const isActive = index <= currentStepIndex
                          const isCurrent = index === currentStepIndex
                          return (
                            <div key={step.status} className="flex items-center flex-1">
                              <div className="flex flex-col items-center flex-1">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    isActive
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-gray-200 text-gray-400'
                                  } ${isCurrent ? 'ring-4 ring-orange-200' : ''}`}
                                >
                                  {step.icon}
                                </div>
                                <p
                                  className={`text-xs mt-2 text-center ${
                                    isActive ? 'text-gray-900 font-medium' : 'text-gray-400'
                                  }`}
                                >
                                  {step.label}
                                </p>
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div
                                  className={`h-1 flex-1 mx-2 ${
                                    index < currentStepIndex ? 'bg-orange-600' : 'bg-gray-200'
                                  }`}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Order Items</h3>
                      <ul className="space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-gray-600">
                              A${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.estimatedReadyTime && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <strong>Estimated ready time:</strong>{' '}
                          {formatTime(order.estimatedReadyTime)}
                        </p>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
