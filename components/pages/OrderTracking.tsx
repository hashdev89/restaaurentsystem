'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clock, CheckCircle, ChefHat, Package, Search, Store, User } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
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

export function OrderTracking() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [customerName, setCustomerName] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [receiptNo, setReceiptNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const fetchOrdersByParams = async (params: URLSearchParams) => {
    const res = await fetch(`/api/orders?${params.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    const list = (data.orders ?? []) as SupabaseOrderRow[]
    const seen = new Set<string>()
    const deduped = list.filter((o) => {
      if (seen.has(o.id)) return false
      seen.add(o.id)
      return true
    })
    return normalizeOrders(deduped)
  }

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (!orderId?.trim()) return
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams()
    params.set('orderId', orderId.trim())
    fetchOrdersByParams(params)
      .then((normalized) => {
        setOrders(normalized)
        if (normalized.length > 0 && normalized[0].customerName) {
          setCustomerName(normalized[0].customerName)
        }
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const receiptTrim = receiptNo.trim()
    const phoneTrim = phone.trim()
    if (!receiptTrim && !phoneTrim) return
    setLoading(true)
    setSearched(true)
    setOrders([])
    setCustomerName('')
    try {
      const params = new URLSearchParams()
      if (receiptTrim) {
        params.set('receiptNo', receiptTrim)
      } else {
        params.set('customerPhone', phoneTrim)
        if (email.trim()) params.set('customerEmail', email.trim().toLowerCase())
      }
      const normalized = await fetchOrdersByParams(params)
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
          Enter your Receipt No (e.g. 001-0001) or phone number to see your order summary and history.
        </p>

        {/* Lookup form – by Receipt No or phone */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-orange-600" />
            Find my orders
          </h2>
          <form onSubmit={handleLookup} className="space-y-4">
            <Input
              label="Receipt No (optional)"
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder="e.g. 001-0001 (from your receipt)"
              autoComplete="off"
            />
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0412 345 678"
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
            <p className="text-xs text-gray-500">
              Enter Receipt No from your ticket to view that order, or enter your phone number to see orders placed with that number.
            </p>
            <Button type="submit" disabled={loading || (!receiptNo.trim() && !phone.trim())} className="w-full sm:w-auto">
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
              {receiptNo.trim()
                ? 'Check the Receipt No (e.g. 001-0001) from your ticket.'
                : 'Check the phone number (and email if you used one). Orders are listed under the details you gave at checkout.'}
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
                const gstFromInclusive = (totalIncl: number) => totalIncl * (GST_RATE / (1 + GST_RATE))
                return (
                  <Card key={order.id} className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          Order #{order.receiptNo || order.id.slice(-8)}
                        </h3>
                        {order.receiptNo && (
                          <p className="text-xs text-gray-600 mt-0.5">Receipt No: {order.receiptNo}</p>
                        )}
                        {order.restaurantName && (
                          <p className="text-sm text-gray-800 mt-2 flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-orange-600 shrink-0" aria-hidden />
                            <span>
                              <span className="text-gray-500">Restaurant:</span>{' '}
                              <span className="font-medium text-gray-900">{order.restaurantName}</span>
                            </span>
                          </p>
                        )}
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
                        <p className="text-xs text-gray-500 mt-0.5">TOTAL</p>
                        <Badge
                          className="mt-2"
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
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => {
                          const lineTotalInclGst = item.price * item.quantity
                          return (
                          <li key={idx} className="text-sm">
                            <div className="flex justify-between">
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-gray-600">
                                A${lineTotalInclGst.toFixed(2)}
                              </span>
                            </div>
                            {item.customizations && item.customizations.length > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5 ml-4 space-y-0.5">
                                {item.customizations.map((g) => {
                                  const opts = (g.options || []).map((o) => o.name).filter(Boolean).join(', ')
                                  if (!opts) return null
                                  if ((g.type || '').toLowerCase() === 'remove') {
                                    return <div key={g.id}>Remove: {opts}</div>
                                  }
                                  const pricePart = (g.options || []).some((o) => Number(o?.price) > 0)
                                    ? ` (+$${(g.options || []).reduce((s, o) => s + Number(o?.price || 0), 0).toFixed(2)})`
                                    : ''
                                  return <div key={g.id}>Extras: {opts}{pricePart}</div>
                                })}
                              </div>
                            )}
                          </li>
                          )
                        })}
                      </ul>
                      <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
                        <div className="flex justify-between font-semibold text-gray-900">
                          <span>Total (Incl. GST)</span>
                          <span>A${order.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Total Includes GST of:</span>
                          <span>A${gstFromInclusive(order.total).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-500 pt-1">All prices include 10% GST</p>
                      </div>
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
