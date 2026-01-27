'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, History, LogOut, Utensils, Plus, Edit, Trash2 } from 'lucide-react'
import { Order, MenuItem } from '@/types'
import { OrderCard } from '../OrderCard'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { MenuItemForm } from '../MenuItemForm'

// Mock Orders Data
const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_12345',
    restaurantId: 'rest_1',
    customerName: 'Alice Johnson',
    customerEmail: 'alice@example.com',
    customerPhone: '(02) 9123 4567',
    items: [
      { menuItemId: '1', name: 'Aussie Beef Pie', quantity: 2, price: 12.99 },
      { menuItemId: '4', name: 'Pavlova', quantity: 1, price: 9.5 }
    ],
    total: 35.48,
    status: 'pending',
    orderType: 'dine-in',
    tableNumber: '5',
    createdAt: new Date().toISOString(),
    paymentStatus: 'authorized'
  },
  {
    id: 'ord_67890',
    restaurantId: 'rest_1',
    customerName: 'Bob Smith',
    customerEmail: 'bob@example.com',
    customerPhone: '(02) 9876 5432',
    items: [{ menuItemId: '2', name: 'Fish & Chips', quantity: 1, price: 18.5 }],
    total: 20.35,
    status: 'pending',
    orderType: 'pickup',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    paymentStatus: 'authorized'
  },
  {
    id: 'ord_54321',
    restaurantId: 'rest_1',
    customerName: 'Charlie Brown',
    customerEmail: 'charlie@example.com',
    customerPhone: '(02) 9456 7890',
    items: [
      { menuItemId: '3', name: 'Aussie Burger', quantity: 1, price: 16.99 },
      { menuItemId: '4', name: 'Pavlova', quantity: 1, price: 9.5 }
    ],
    total: 29.14,
    status: 'accepted',
    orderType: 'dine-in',
    tableNumber: '12',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    paymentStatus: 'captured'
  }
]

// Mock Menu Data for this restaurant
const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    restaurantId: 'rest_1',
    name: 'Aussie Beef Pie',
    description: 'Traditional Australian meat pie with premium beef, gravy, and flaky pastry.',
    price: 12.99,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    isAvailable: true
  },
  {
    id: '2',
    restaurantId: 'rest_1',
    name: 'Fish & Chips',
    description: 'Beer-battered barramundi with hand-cut chips, lemon, and tartar sauce.',
    price: 18.5,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    isAvailable: true
  },
  {
    id: '3',
    restaurantId: 'rest_1',
    name: 'Aussie Burger',
    description: 'Beef patty, beetroot, egg, bacon, cheese, lettuce, tomato, and onion.',
    price: 16.99,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    isAvailable: true
  }
]

const CURRENT_RESTAURANT_ID = 'rest_1'

export function RestaurantDashboard() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MOCK_MENU_ITEMS)
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'menu'>('pending')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: 'accepted', paymentStatus: 'captured' }
          : order
      )
    )
  }

  const handleRejectOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: 'rejected', paymentStatus: 'cancelled' }
          : order
      )
    )
  }

  const handleAddMenuItem = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDeleteMenuItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setMenuItems((prev) => prev.filter((i) => i.id !== id))
    }
  }

  const handleMenuItemSubmit = (data: Partial<MenuItem>) => {
    if (editingItem) {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, ...data } as MenuItem : i))
      )
    } else {
      const newItem: MenuItem = {
        ...(data as MenuItem),
        id: Math.random().toString(36).substr(2, 9),
        restaurantId: CURRENT_RESTAURANT_ID
      }
      setMenuItems((prev) => [...prev, newItem])
    }
    setIsModalOpen(false)
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const historyOrders = orders
    .filter((o) => o.status !== 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Dashboard Navigation */}
      <nav className="bg-white shadow-sm border-b border-orange-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Restaurant Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/kitchen">
                <Button variant="secondary" size="sm">
                  Kitchen View
                </Button>
              </Link>
              <Link href="/restaurant/login">
                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Pending Orders
            {pendingOrders.length > 0 && (
              <span className="ml-2 bg-white text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History className="w-4 h-4 mr-2" />
            Order History
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Utensils className="w-4 h-4 mr-2" />
            Menu Items
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'menu' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Manage Menu</h2>
              <Button onClick={handleAddMenuItem} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menuItems.length > 0 ? (
                      menuItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  className="h-10 w-10 rounded-md object-cover"
                                  src={item.image}
                                  alt=""
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            A${item.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                item.isAvailable
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditMenuItem(item)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenuItem(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No menu items yet. Add your first item!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {(activeTab === 'pending' ? pendingOrders : historyOrders).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'pending' ? pendingOrders : historyOrders).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={handleAcceptOrder}
                    onReject={handleRejectOrder}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">
                  {activeTab === 'pending' ? 'No pending orders.' : 'No order history yet.'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Menu Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
      >
        <MenuItemForm
          initialData={editingItem || undefined}
          onSubmit={handleMenuItemSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

