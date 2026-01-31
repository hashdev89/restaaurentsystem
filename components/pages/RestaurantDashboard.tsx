'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LayoutDashboard, History, LogOut, Utensils, Plus, Edit, Trash2, Shield, Hash, Package, Printer } from 'lucide-react'
import { Order, MenuItem } from '@/types'
import { OrderCard } from '../OrderCard'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { MenuItemForm } from '../MenuItemForm'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'
import { useNotification } from '../providers/NotificationProvider'

const ORDERS_POLL_MS = 8000

function getDefaultRestaurantId(): string {
  if (typeof process === 'undefined' || !process.env) return ''
  return process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID || ''
}

export function RestaurantDashboard({ restaurantId: restaurantIdProp }: { restaurantId?: string } = {}) {
  const envOrPropId = restaurantIdProp ?? getDefaultRestaurantId()
  const [resolvedFirstRestaurantId, setResolvedFirstRestaurantId] = useState<string>('')
  const [loadingFirstRestaurant, setLoadingFirstRestaurant] = useState(!envOrPropId)
  const currentRestaurantId = envOrPropId || resolvedFirstRestaurantId
  const { success, error, info } = useNotification()
  const [orders, setOrders] = useState<Order[]>([])

  // When no restaurant in URL/env, use first restaurant from API
  useEffect(() => {
    if (envOrPropId) {
      setLoadingFirstRestaurant(false)
      return
    }
    let cancelled = false
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const id = data?.restaurants?.[0]?.id
        if (id) setResolvedFirstRestaurantId(id)
      })
      .finally(() => {
        if (!cancelled) setLoadingFirstRestaurant(false)
      })
    return () => { cancelled = true }
  }, [envOrPropId])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'ready' | 'history' | 'menu' | 'tables' | 'stock'>('pending')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [tables, setTables] = useState<{ id: string; table_number: string; capacity: number; status: string; location?: string }[]>([])
  const [inventory, setInventory] = useState<{ id: string; barcode: string; name: string; quantity: number; price: number }[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [menuItemsLoading, setMenuItemsLoading] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState(4)
  const [newStockBarcode, setNewStockBarcode] = useState('')
  const [newStockName, setNewStockName] = useState('')
  const [newStockQty, setNewStockQty] = useState(0)
  const [newStockPrice, setNewStockPrice] = useState(0)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?restaurantId=${currentRestaurantId}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.orders || []) as SupabaseOrderRow[]
      setOrders(normalizeOrders(list))
    } catch (e) {
      console.error('Fetch orders error:', e)
    } finally {
      setOrdersLoading(false)
    }
  }, [currentRestaurantId])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, ORDERS_POLL_MS)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order['status']) => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
        if (!res.ok) throw new Error('Update failed')
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        )
        if (status === 'accepted') {
          success('Order accepted', 'Order sent to kitchen.')
        } else if (status === 'rejected') {
          info('Order rejected', 'Order has been rejected.')
        } else if (status === 'completed') {
          success('Order completed', 'Billing done.')
        }
      } catch (e) {
        error('Update failed', e instanceof Error ? e.message : 'Could not update order')
      }
    },
    [success, error, info]
  )

  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'accepted')
  }

  const handleRejectOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'rejected')
  }

  const handleProceedToBilling = (orderId: string) => {
    updateOrderStatus(orderId, 'completed')
  }

  const fetchTables = useCallback(async () => {
    if (!currentRestaurantId) return
    setTablesLoading(true)
    try {
      const res = await fetch(`/api/tables?restaurantId=${currentRestaurantId}`)
      if (!res.ok) return
      const data = await res.json()
      setTables(data.tables ?? [])
    } catch (e) {
      console.error('Fetch tables error:', e)
    } finally {
      setTablesLoading(false)
    }
  }, [currentRestaurantId])

  const fetchInventory = useCallback(async () => {
    if (!currentRestaurantId) return
    setInventoryLoading(true)
    try {
      const res = await fetch(`/api/inventory?restaurantId=${currentRestaurantId}`)
      if (!res.ok) return
      const data = await res.json()
      setInventory(data.items ?? [])
    } catch (e) {
      console.error('Fetch inventory error:', e)
    } finally {
      setInventoryLoading(false)
    }
  }, [currentRestaurantId])

  const fetchMenuItems = useCallback(async () => {
    if (!currentRestaurantId) return
    setMenuItemsLoading(true)
    try {
      const res = await fetch(`/api/menu-items?restaurantId=${encodeURIComponent(currentRestaurantId)}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.items ?? []).map((row: { id: string; restaurant_id: string; name: string; description: string | null; price: number; category: string | null; image: string | null; is_available: boolean }) => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        name: row.name,
        description: row.description ?? '',
        price: Number(row.price),
        category: row.category ?? '',
        image: row.image ?? '',
        isAvailable: row.is_available ?? true
      }))
      setMenuItems(list)
    } catch (e) {
      console.error('Fetch menu items error:', e)
    } finally {
      setMenuItemsLoading(false)
    }
  }, [currentRestaurantId])

  useEffect(() => {
    if (activeTab === 'tables') fetchTables()
  }, [activeTab, fetchTables])

  useEffect(() => {
    if (activeTab === 'stock') fetchInventory()
  }, [activeTab, fetchInventory])

  useEffect(() => {
    if (activeTab === 'menu') fetchMenuItems()
  }, [activeTab, fetchMenuItems])

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableNumber.trim()) return
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: currentRestaurantId,
          tableNumber: newTableNumber.trim(),
          capacity: newTableCapacity
        })
      })
      if (!res.ok) throw new Error('Failed to add table')
      success('Table added', `Table ${newTableNumber} created.`)
      setNewTableNumber('')
      setNewTableCapacity(4)
      fetchTables()
    } catch (e) {
      error('Failed', e instanceof Error ? e.message : 'Could not add table')
    }
  }

  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStockBarcode.trim() || !newStockName.trim()) return
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: currentRestaurantId,
          barcode: newStockBarcode.trim(),
          name: newStockName.trim(),
          quantity: newStockQty,
          price: newStockPrice
        })
      })
      if (!res.ok) throw new Error('Failed to add item')
      success('Item added', `${newStockName} added to inventory.`)
      setNewStockBarcode('')
      setNewStockName('')
      setNewStockQty(0)
      setNewStockPrice(0)
      fetchInventory()
    } catch (e) {
      error('Failed', e instanceof Error ? e.message : 'Could not add item')
    }
  }

  const handleUpdateStockQuantity = async (id: string, quantity: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })
      if (!res.ok) throw new Error('Update failed')
      setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)))
      success('Stock updated', 'Quantity saved.')
    } catch (e) {
      error('Update failed', e instanceof Error ? e.message : 'Could not update')
    }
  }

  const getTableQrUrl = (tableNumber: string) => {
    if (typeof window === 'undefined') return ''
    const base = window.location.origin
    const url = `${base}/restaurant/${currentRestaurantId}?table=${encodeURIComponent(tableNumber)}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }

  /** Barcode image URL for printing (Code128) */
  const getBarcodeImageUrl = (code: string) => {
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&dpi=96&dataseparator=`
  }

  const printBarcodeLabel = (item: { barcode: string; name: string; price: number }) => {
    const printWin = window.open('', '_blank', 'width=400,height=320')
    if (!printWin) return
    const barcodeImg = getBarcodeImageUrl(item.barcode)
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Barcode - ${item.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; margin: 0; text-align: center; }
            .label { border: 1px solid #ccc; padding: 16px; display: inline-block; min-width: 280px; }
            .label h3 { margin: 0 0 8px 0; font-size: 16px; }
            .label .price { font-size: 18px; font-weight: bold; color: #ea580c; margin: 8px 0; }
            .label img { max-width: 100%; height: 60px; image-rendering: pixelated; }
            .label .code { font-size: 11px; font-family: monospace; color: #666; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="label">
            <h3>${item.name}</h3>
            <div class="price">A$${Number(item.price).toFixed(2)}</div>
            <img src="${barcodeImg}" alt="Barcode" />
            <div class="code">${item.barcode}</div>
          </div>
        </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => { printWin.print(); printWin.close() }, 300)
  }

  const handleAddMenuItem = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDeleteMenuItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    try {
      const res = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      setMenuItems((prev) => prev.filter((i) => i.id !== id))
      success('Item deleted', 'Menu item removed.')
    } catch (e) {
      error('Could not delete', e instanceof Error ? e.message : 'Failed to delete menu item')
    }
  }

  const handleMenuItemSubmit = async (data: Partial<MenuItem>) => {
    try {
      if (editingItem) {
        const res = await fetch(`/api/menu-items/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            price: data.price,
            category: data.category,
            image: data.image,
            isAvailable: data.isAvailable
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Update failed')
        }
        success('Item updated', 'Menu item saved.')
      } else {
        const res = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: currentRestaurantId,
            name: data.name,
            description: data.description ?? '',
            price: data.price,
            category: data.category ?? 'Other',
            image: data.image ?? '',
            isAvailable: data.isAvailable !== false
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Create failed')
        }
        success('Item added', 'Menu item saved and will show under this restaurant.')
      }
      setIsModalOpen(false)
      setEditingItem(null)
      await fetchMenuItems()
    } catch (e) {
      error('Could not save', e instanceof Error ? e.message : 'Failed to save menu item')
    }
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const readyForBillingOrders = orders.filter((o) => o.status === 'ready')
  const historyOrders = orders
    .filter((o) => o.status !== 'pending' && o.status !== 'ready')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (!currentRestaurantId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          {loadingFirstRestaurant ? (
            <>
              <p className="text-gray-600">Loading restaurant…</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No restaurant selected</h2>
              <p className="text-gray-600 text-sm mb-4">
                Add a restaurant in the System Dashboard first, then open its dashboard from there. Or set{' '}
                <code className="bg-gray-200 px-1 rounded text-xs">NEXT_PUBLIC_DEFAULT_RESTAURANT_ID</code> in .env.
              </p>
              <Link href="/system/dashboard">
                <Button variant="primary">Go to System Dashboard</Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    )
  }

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
              <Link href="/system/dashboard">
                <Button variant="ghost" size="sm">
                  <Shield className="w-4 h-4 mr-2" />
                  System control
                </Button>
              </Link>
              <Link href="/kitchen">
                <Button variant="secondary" size="sm">
                  Kitchen View
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  window.location.href = '/login'
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
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
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center ${pendingOrders.length > 0 ? 'bg-white text-orange-600' : 'bg-transparent text-transparent'}`}>
              {pendingOrders.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ready')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'ready'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Ready for billing
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center ${readyForBillingOrders.length > 0 ? 'bg-white text-orange-600' : 'bg-transparent text-transparent'}`}>
              {readyForBillingOrders.length}
            </span>
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
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'tables'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Hash className="w-4 h-4 mr-2" />
            Tables & QR
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            Stock
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'tables' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tables & QR codes (dine-in)</h2>
            <p className="text-sm text-gray-600 mb-4">Add tables and print QR codes so customers can scan to view the menu and order (table is tracked).</p>
            <form onSubmit={handleAddTable} className="flex flex-wrap items-end gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Table number</label>
                <input
                  type="text"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. 5"
                  className="rounded border border-gray-300 px-3 py-2 w-32"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value, 10) || 4)}
                  className="rounded border border-gray-300 px-3 py-2 w-24"
                />
              </div>
              <Button type="submit" variant="primary" disabled={!newTableNumber.trim()}>Add table</Button>
            </form>
            {tablesLoading ? (
              <p className="text-gray-500">Loading tables...</p>
            ) : tables.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
                No tables yet. Add a table above to generate a QR code for dine-in ordering.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 bg-white p-2 rounded border">
                        <img src={getTableQrUrl(t.table_number)} alt={`Table ${t.table_number} QR`} width={120} height={120} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Table {t.table_number}</h3>
                        <p className="text-sm text-gray-500">Capacity: {t.capacity}</p>
                        <p className="text-xs text-gray-500 mt-1">Scan to order at this table</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'stock' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock / Barcode items</h2>
            <p className="text-sm text-gray-600 mb-4">Create barcode items for POS (e.g. water bottles). Leave barcode empty to auto-generate. Print labels and scan at POS to add to sale.</p>
            <form onSubmit={handleAddStockItem} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <input type="text" value={newStockBarcode} onChange={(e) => setNewStockBarcode(e.target.value)} placeholder="Barcode (optional – auto-generated if empty)" className="rounded border border-gray-300 px-3 py-2" title="Leave empty to auto-generate a barcode" />
              <input type="text" value={newStockName} onChange={(e) => setNewStockName(e.target.value)} placeholder="Name *" className="rounded border border-gray-300 px-3 py-2" required />
              <input type="number" min={0} value={newStockQty} onChange={(e) => setNewStockQty(parseInt(e.target.value, 10) || 0)} placeholder="Qty" className="rounded border border-gray-300 px-3 py-2" />
              <input type="number" step="0.01" min={0} value={newStockPrice} onChange={(e) => setNewStockPrice(parseFloat(e.target.value) || 0)} placeholder="Price" className="rounded border border-gray-300 px-3 py-2" />
              <Button type="submit" variant="primary" disabled={!newStockName.trim()}>Add item</Button>
            </form>
            {inventoryLoading ? (
              <p className="text-gray-500">Loading inventory...</p>
            ) : inventory.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
                No barcode items yet. Add items above; they can be scanned in POS to add to sale and update stock.
              </div>
            ) : (
              <Card className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Barcode</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventory.map((i) => (
                      <tr key={i.id}>
                        <td className="px-4 py-3 text-sm font-mono">{i.barcode}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{i.name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={i.quantity}
                            onChange={(e) => {
                              const q = parseInt(e.target.value, 10)
                              if (!isNaN(q) && q >= 0) setInventory((prev) => prev.map((x) => (x.id === i.id ? { ...x, quantity: q } : x)))
                            }}
                            onBlur={(e) => {
                              const q = parseInt(e.target.value, 10)
                              if (!isNaN(q) && q >= 0) handleUpdateStockQuantity(i.id, q)
                            }}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">A${Number(i.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => printBarcodeLabel({ barcode: i.barcode, name: i.name, price: i.price })}
                            title="Print barcode label"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print barcode
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        ) : activeTab === 'menu' ? (
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
                    {menuItemsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Loading menu items…
                        </td>
                      </tr>
                    ) : menuItems.length > 0 ? (
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
            {ordersLoading && (activeTab === 'pending' || activeTab === 'ready' || activeTab === 'history') ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">Loading orders...</p>
              </div>
            ) : activeTab === 'pending' && pendingOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={handleAcceptOrder}
                    onReject={handleRejectOrder}
                  />
                ))}
              </div>
            ) : activeTab === 'ready' && readyForBillingOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readyForBillingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onProceedToBilling={handleProceedToBilling}
                  />
                ))}
              </div>
            ) : activeTab === 'history' && historyOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {historyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">
                  {activeTab === 'pending' && 'No pending orders.'}
                  {activeTab === 'ready' && 'No orders ready for billing.'}
                  {activeTab === 'history' && 'No order history yet.'}
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

