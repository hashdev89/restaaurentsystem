'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, ChefHat, Package } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Order, OrderStatus } from '@/types'

// Mock orders for tracking
const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-ABC123',
    restaurantId: 'rest_1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '0412 345 678',
    items: [
      { menuItemId: '1', name: 'Aussie Beef Pie', quantity: 2, price: 12.99 },
      { menuItemId: '4', name: 'Pavlova', quantity: 1, price: 9.5 }
    ],
    total: 35.48,
    status: 'preparing',
    orderType: 'dine-in',
    tableNumber: '12',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    paymentStatus: 'captured',
    estimatedReadyTime: new Date(Date.now() + 1000 * 60 * 20).toISOString()
  },
  {
    id: 'ORD-XYZ789',
    restaurantId: 'rest_2',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '0412 987 654',
    items: [{ menuItemId: '5', name: 'Margherita Pizza', quantity: 1, price: 22.0 }],
    total: 24.2,
    status: 'ready',
    orderType: 'pickup',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    paymentStatus: 'captured'
  }
]

const statusSteps: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'pending', label: 'Order Placed', icon: <Clock className="w-5 h-5" /> },
  { status: 'accepted', label: 'Accepted', icon: <CheckCircle className="w-5 h-5" /> },
  { status: 'preparing', label: 'Preparing', icon: <ChefHat className="w-5 h-5" /> },
  { status: 'ready', label: 'Ready', icon: <Package className="w-5 h-5" /> },
  { status: 'completed', label: 'Completed', icon: <CheckCircle className="w-5 h-5" /> }
]

export function OrderTracking() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Track Your Orders</h1>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by order ID or name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const currentStepIndex = getStatusIndex(order.status)
            return (
              <Card key={order.id} className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Order #{order.id}</h2>
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

        {filteredOrders.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-gray-500 text-lg">No orders found</p>
          </Card>
        )}
      </div>
    </div>
  )
}

