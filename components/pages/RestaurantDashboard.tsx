'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { LayoutDashboard, History, LogOut, Utensils, Plus, Edit, Trash2, Hash, Package, Printer, User, Clock, Lock, Percent, Layers } from 'lucide-react'
import { Order, MenuItem, MenuItemCustomizationOption } from '@/types'
import { OrderCard } from '../OrderCard'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { MenuItemForm, type CategoryCustomizationsMap } from '../MenuItemForm'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'
import { priceInclGst } from '@/lib/gst'
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
  const [activeTab, setActiveTab] = useState<'pending' | 'ready' | 'history' | 'menu' | 'tables' | 'stock' | 'staff' | 'shift' | 'access' | 'surcharges'>('pending')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
  const CATEGORY_OPTIONS_NEW = '__new_category__'
  const [categoryOptionsModalOpen, setCategoryOptionsModalOpen] = useState(false)
  const [categoryOptionsCategory, setCategoryOptionsCategory] = useState('')
  const [categoryOptionsNewCategoryName, setCategoryOptionsNewCategoryName] = useState('')
  const [categoryRemoveOptions, setCategoryRemoveOptions] = useState<MenuItemCustomizationOption[]>([])
  const [categoryExtras, setCategoryExtras] = useState<MenuItemCustomizationOption[]>([])
  const [categoryCustomizationsByCategory, setCategoryCustomizationsByCategory] = useState<Record<string, { id: string; name: string; type: string; options: { id: string; name: string; price: number }[] }[]>>({})
  const [categoryOptionsSaving, setCategoryOptionsSaving] = useState(false)
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
  const [restaurantAccess, setRestaurantAccess] = useState<{ posPinRequired?: boolean; kdsPinRequired?: boolean }>({})
  const [accessPosPin, setAccessPosPin] = useState('')
  const [accessKdsPin, setAccessKdsPin] = useState('')
  const [accessPinsSaving, setAccessPinsSaving] = useState(false)
  const [surchargeSundayEnabled, setSurchargeSundayEnabled] = useState(false)
  const [surchargeSundayPercent, setSurchargeSundayPercent] = useState(10)
  const [surchargePublicHolidayEnabled, setSurchargePublicHolidayEnabled] = useState(false)
  const [surchargePublicHolidayPercent, setSurchargePublicHolidayPercent] = useState(15)
  const [surchargePublicHolidayDates, setSurchargePublicHolidayDates] = useState<string[]>([])
  const [surchargeNewDate, setSurchargeNewDate] = useState('')
  const [surchargeManualOverride, setSurchargeManualOverride] = useState<'auto' | 'sunday' | 'public_holiday' | 'none'>('auto')
  const [surchargeSaving, setSurchargeSaving] = useState(false)
  const [onlineCardSurchargePercent, setOnlineCardSurchargePercent] = useState(0)
  const [posCardSurchargePercent, setPosCardSurchargePercent] = useState(0)
  const [restaurantName, setRestaurantName] = useState('')

  // Fetch restaurant name for dashboard title
  useEffect(() => {
    if (!currentRestaurantId) {
      setRestaurantName('')
      return
    }
    let cancelled = false
    fetch(`/api/restaurants/${currentRestaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.restaurant?.name) setRestaurantName(data.restaurant.name)
      })
      .catch(() => { if (!cancelled) setRestaurantName('') })
    return () => { cancelled = true }
  }, [currentRestaurantId])

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
      const list = (data.items ?? []).map((row: { id: string; restaurant_id: string; name: string; description: string | null; price: number; category: string | null; image: string | null; is_available: boolean; customizations?: MenuItem['customizations'] }) => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        name: row.name,
        description: row.description ?? '',
        price: Number(row.price),
        category: row.category ?? '',
        image: row.image ?? '',
        isAvailable: row.is_available ?? true,
        ...(row.customizations && row.customizations.length > 0 ? { customizations: row.customizations } : {})
      }))
      setMenuItems(list)
    } catch (e) {
      console.error('Fetch menu items error:', e)
    } finally {
      setMenuItemsLoading(false)
    }
  }, [currentRestaurantId])

  const fetchCategoryCustomizations = useCallback(async () => {
    if (!currentRestaurantId) return
    try {
      const res = await fetch(`/api/category-customizations?restaurantId=${encodeURIComponent(currentRestaurantId)}`)
      if (!res.ok) return
      const data = await res.json()
      setCategoryCustomizationsByCategory(data.customizationsByCategory ?? {})
    } catch (e) {
      console.error('Fetch category customizations error:', e)
    }
  }, [currentRestaurantId])

  useEffect(() => {
    if (activeTab === 'tables') fetchTables()
  }, [activeTab, fetchTables])

  useEffect(() => {
    if (activeTab === 'stock') fetchInventory()
  }, [activeTab, fetchInventory])

  useEffect(() => {
    if (activeTab === 'menu') {
      fetchMenuItems()
      fetchCategoryCustomizations()
    }
  }, [activeTab, fetchMenuItems, fetchCategoryCustomizations])

  useEffect(() => {
    if (!categoryOptionsModalOpen || !categoryOptionsCategory || categoryOptionsCategory === CATEGORY_OPTIONS_NEW) return
    const groups = categoryCustomizationsByCategory[categoryOptionsCategory]
    if (!groups?.length) {
      setCategoryRemoveOptions([])
      setCategoryExtras([])
      return
    }
    let removeOpts: MenuItemCustomizationOption[] = []
    let extraOpts: MenuItemCustomizationOption[] = []
    for (const g of groups) {
      if (g.type === 'remove') removeOpts = (g.options || []).map((o) => ({ id: o.id, name: o.name, price: 0 }))
      if (g.type === 'extra') extraOpts = (g.options || []).map((o) => ({ id: o.id, name: o.name, price: o.price ?? 0 }))
    }
    setCategoryRemoveOptions(removeOpts)
    setCategoryExtras(extraOpts)
  }, [categoryOptionsModalOpen, categoryOptionsCategory, categoryCustomizationsByCategory])

  useEffect(() => {
    if (activeTab === 'access' && currentRestaurantId) {
      fetch(`/api/restaurants/${currentRestaurantId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.restaurant) setRestaurantAccess({ posPinRequired: data.restaurant.posPinRequired, kdsPinRequired: data.restaurant.kdsPinRequired })
        })
        .catch(() => { /* ignore */ })
    }
  }, [activeTab, currentRestaurantId])

  useEffect(() => {
    if (activeTab === 'surcharges' && currentRestaurantId) {
      fetch(`/api/restaurants/${currentRestaurantId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          const r = data?.restaurant
          if (r) {
            setSurchargeSundayEnabled(r.sundaySurchargeEnabled === true)
            setSurchargeSundayPercent(Number(r.sundaySurchargePercent) || 0)
            setSurchargePublicHolidayEnabled(r.publicHolidaySurchargeEnabled === true)
            setSurchargePublicHolidayPercent(Number(r.publicHolidaySurchargePercent) || 0)
            setSurchargePublicHolidayDates(Array.isArray(r.publicHolidayDates) ? [...r.publicHolidayDates] : [])
            setSurchargeManualOverride(r.surchargeManualOverride === 'sunday' || r.surchargeManualOverride === 'public_holiday' || r.surchargeManualOverride === 'none' ? r.surchargeManualOverride : 'auto')
            setOnlineCardSurchargePercent(Number(r.onlineCardSurchargePercent) ?? 0)
            setPosCardSurchargePercent(Number(r.posCardSurchargePercent) ?? 0)
          }
        })
        .catch(() => { /* ignore */ })
    }
  }, [activeTab, currentRestaurantId])

  const handleSaveAccessPins = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentRestaurantId) return
    const posPin = accessPosPin.replace(/\D/g, '').slice(0, 4)
    const kdsPin = accessKdsPin.replace(/\D/g, '').slice(0, 4)
    if (!posPin && !kdsPin) {
      error('No PINs', 'Enter at least one 4-digit PIN.')
      return
    }
    if (posPin && posPin.length !== 4) {
      error('Invalid PIN', 'POS PIN must be exactly 4 digits.')
      return
    }
    if (kdsPin && kdsPin.length !== 4) {
      error('Invalid PIN', 'KDS PIN must be exactly 4 digits.')
      return
    }
    setAccessPinsSaving(true)
    try {
      const res = await fetch(`/api/restaurants/${currentRestaurantId}/access-pins`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posPin: posPin || undefined, kdsPin: kdsPin || undefined })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      success('PINs saved', 'POS and KDS access PINs updated.')
      setAccessPosPin('')
      setAccessKdsPin('')
    } catch (e) {
      error('Could not save', e instanceof Error ? e.message : 'Failed to save PINs')
    } finally {
      setAccessPinsSaving(false)
    }
  }

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
            <div class="price">A$${priceInclGst(Number(item.price)).toFixed(2)} (incl. GST)</div>
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

  const menuCategoryOptions = useMemo(() => {
    const defaults = ['Starters', 'Mains', 'Desserts', 'Drinks', 'Sides']
    const fromItems = menuItems.map((m) => m.category).filter(Boolean) as string[]
    return [...new Set([...defaults, ...fromItems])]
  }, [menuItems])

  /** Convert category customizations (array of groups) to MenuItemForm shape: { removeOptions, extras } per category */
  const categoryCustomizationsForForm = useMemo((): CategoryCustomizationsMap => {
    const out: CategoryCustomizationsMap = {}
    for (const [cat, groups] of Object.entries(categoryCustomizationsByCategory)) {
      let removeOptions: MenuItemCustomizationOption[] = []
      let extras: MenuItemCustomizationOption[] = []
      for (const g of groups || []) {
        if (g.type === 'remove') removeOptions = (g.options || []).map((o) => ({ id: o.id, name: o.name, price: 0 }))
        if (g.type === 'extra') extras = (g.options || []).map((o) => ({ id: o.id, name: o.name, price: o.price ?? 0 }))
      }
      out[cat] = { removeOptions, extras }
    }
    return out
  }, [categoryCustomizationsByCategory])

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
            isAvailable: data.isAvailable,
            customizations: data.customizations,
            sizes: data.sizes
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
            isAvailable: data.isAvailable !== false,
            customizations: data.customizations,
            sizes: data.sizes
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

  const handleSaveCategoryOptions = async () => {
    const effectiveCategory = categoryOptionsCategory === CATEGORY_OPTIONS_NEW
      ? categoryOptionsNewCategoryName?.trim()
      : categoryOptionsCategory?.trim()
    if (!currentRestaurantId || !effectiveCategory) {
      error('Category required', categoryOptionsCategory === CATEGORY_OPTIONS_NEW ? 'Enter a name for the new category.' : 'Select a category.')
      return
    }
    setCategoryOptionsSaving(true)
    try {
      const customizations: { id: string; name: string; type: 'remove' | 'extra'; options: { id: string; name: string; price: number }[] }[] = []
      const removeOpts = categoryRemoveOptions.filter((o) => (o.name ?? '').trim())
      if (removeOpts.length > 0) {
        customizations.push({
          id: 'remove_options',
          name: 'Options',
          type: 'remove',
          options: removeOpts.map((o, i) => ({ id: o.id || `rem_${i}`, name: (o.name ?? '').trim(), price: 0 }))
        })
      }
      const extraOpts = categoryExtras.filter((o) => (o.name ?? '').trim())
      if (extraOpts.length > 0) {
        customizations.push({
          id: 'extras',
          name: 'Extras',
          type: 'extra',
          options: extraOpts.map((o, i) => ({ id: o.id || `ext_${i}`, name: (o.name ?? '').trim(), price: Number(o.price) || 0 }))
        })
      }
      const res = await fetch('/api/category-customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: currentRestaurantId,
          category: effectiveCategory,
          customizations
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      success('Category options saved', `Options for "${effectiveCategory}" now apply to all items in this category.`)
      await fetchCategoryCustomizations()
      await fetchMenuItems()
    } catch (e) {
      error('Could not save', e instanceof Error ? e.message : 'Failed to save category options')
    } finally {
      setCategoryOptionsSaving(false)
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
            <div className="flex flex-col gap-0.5 pt-2.5">
              {restaurantName && (
                <span className="text-xl font-bold text-gray-900 leading-tight">{restaurantName}</span>
              )}
              <span className="text-sm font-medium text-gray-500 leading-tight">Restaurant Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              {currentRestaurantId && (
                <>
                  <Link href={`/restaurant/${currentRestaurantId}/pos`}>
                    <Button variant="secondary" size="sm">
                      POS
                    </Button>
                  </Link>
                  <Link href={`/restaurant/${currentRestaurantId}/kitchen`}>
                    <Button variant="secondary" size="sm">
                      Kitchen (KDS)
                    </Button>
                  </Link>
                </>
              )}
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
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User className="w-4 h-4 mr-2" />
            Staff Management
          </button>
          <button
            onClick={() => setActiveTab('shift')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'shift'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Shift Management
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'access'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Lock className="w-4 h-4 mr-2" />
            Access (PINs)
          </button>
          <button
            onClick={() => setActiveTab('surcharges')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'surcharges'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Percent className="w-4 h-4 mr-2" />
            Surcharges
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'surcharges' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Sunday &amp; public holiday surcharges</h2>
            <p className="text-sm text-gray-600 mb-4">Enable surcharges and set percentages. POS will apply them automatically by date, or use the manual override below. These settings apply to this restaurant and sync to POS.</p>
            <Card className="p-6 max-w-2xl">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!currentRestaurantId) return
                  setSurchargeSaving(true)
                  try {
                    const res = await fetch(`/api/restaurants/${currentRestaurantId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sundaySurchargeEnabled: surchargeSundayEnabled,
                        sundaySurchargePercent: surchargeSundayPercent,
                        publicHolidaySurchargeEnabled: surchargePublicHolidayEnabled,
                        publicHolidaySurchargePercent: surchargePublicHolidayPercent,
                        publicHolidayDates: surchargePublicHolidayDates,
                        surchargeManualOverride: surchargeManualOverride,
                        onlineCardSurchargePercent,
                        posCardSurchargePercent,
                      }),
                    })
                    if (!res.ok) throw new Error('Failed to save')
                    success('Surcharges saved', 'POS will use these settings.')
                  } catch (e) {
                    error('Could not save', e instanceof Error ? e.message : 'Failed to save surcharges')
                  } finally {
                    setSurchargeSaving(false)
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Sunday surcharge</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={surchargeSundayEnabled}
                        onChange={(e) => setSurchargeSundayEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-orange-600"
                      />
                      <span className="text-sm">Enable Sunday surcharge</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={25}
                        step={0.5}
                        value={surchargeSundayPercent}
                        onChange={(e) => setSurchargeSundayPercent(Number(e.target.value) || 0)}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <span className="text-sm text-gray-500">% (e.g. 5–10)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Public holiday surcharge</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={surchargePublicHolidayEnabled}
                        onChange={(e) => setSurchargePublicHolidayEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-orange-600"
                      />
                      <span className="text-sm">Enable public holiday surcharge</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={25}
                        step={0.5}
                        value={surchargePublicHolidayPercent}
                        onChange={(e) => setSurchargePublicHolidayPercent(Number(e.target.value) || 0)}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <span className="text-sm text-gray-500">% (e.g. 10–15)</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Public holiday dates (YYYY-MM-DD)</label>
                    <p className="text-xs text-gray-500 mb-2">Add dates when the public holiday surcharge applies. POS checks today’s date against this list.</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <input
                        type="date"
                        value={surchargeNewDate}
                        onChange={(e) => setSurchargeNewDate(e.target.value)}
                        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (surchargeNewDate) {
                            setSurchargePublicHolidayDates((prev) => (prev.includes(surchargeNewDate) ? prev : [...prev, surchargeNewDate].sort()))
                            setSurchargeNewDate('')
                          }
                        }}
                      >
                        Add date
                      </Button>
                    </div>
                    {surchargePublicHolidayDates.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {surchargePublicHolidayDates.map((d) => (
                          <li key={d} className="inline-flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-sm">
                            {d}
                            <button
                              type="button"
                              onClick={() => setSurchargePublicHolidayDates((prev) => prev.filter((x) => x !== d))}
                              className="text-red-600 hover:text-red-800"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Card payment surcharges</h3>
                  <p className="text-xs text-gray-500 mb-3">Percentage added when customer pays by card. Online surcharge applies to the customer cart/checkout; POS surcharge applies to in-store card payments.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Online payment (card) surcharge %</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={onlineCardSurchargePercent}
                        onChange={(e) => setOnlineCardSurchargePercent(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-gray-500">Applied at checkout when paying by card online</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">POS card surcharge %</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={posCardSurchargePercent}
                        onChange={(e) => setPosCardSurchargePercent(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-gray-500">Applied in POS when payment method is card or mix</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manual override for today</label>
                  <p className="text-xs text-gray-500 mb-2">Force which surcharge applies in POS today (or use Auto to use date).</p>
                  <select
                    value={surchargeManualOverride}
                    onChange={(e) => setSurchargeManualOverride(e.target.value as 'auto' | 'sunday' | 'public_holiday' | 'none')}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="auto">Auto (use date: Sunday or public holiday list)</option>
                    <option value="sunday">Force Sunday surcharge today</option>
                    <option value="public_holiday">Force public holiday surcharge today</option>
                    <option value="none">No surcharge today</option>
                  </select>
                </div>
                <Button type="submit" disabled={surchargeSaving}>{surchargeSaving ? 'Saving…' : 'Save surcharges'}</Button>
              </form>
            </Card>
          </div>
        ) : activeTab === 'access' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">POS & KDS access PINs</h2>
            <p className="text-sm text-gray-600 mb-4">Set 4-digit PINs for POS and Kitchen (KDS). When &quot;Require 4-digit PIN&quot; is enabled for each, staff enter this PIN to open POS or KDS.</p>
            <form onSubmit={handleSaveAccessPins} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">POS PIN (4 digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={accessPosPin}
                  onChange={(e) => setAccessPosPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg tracking-widest"
                  autoComplete="off"
                />
                {restaurantAccess.posPinRequired && <p className="text-xs text-orange-600 mt-1">PIN required for POS (enabled in System Control)</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KDS (Kitchen) PIN (4 digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={accessKdsPin}
                  onChange={(e) => setAccessKdsPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg tracking-widest"
                  autoComplete="off"
                />
                {restaurantAccess.kdsPinRequired && <p className="text-xs text-orange-600 mt-1">PIN required for KDS (when enabled)</p>}
              </div>
              <Button type="submit" disabled={accessPinsSaving}>{(accessPosPin || accessKdsPin) ? (accessPinsSaving ? 'Saving…' : 'Save PINs') : 'Save PINs'}</Button>
            </form>
          </div>
        ) : activeTab === 'staff' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Management</h2>
            <p className="text-sm text-gray-600 mb-4">Manage staff and permissions for this restaurant.</p>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Staff list and roles can be configured here. Add staff members, assign roles (e.g. waiter, kitchen, manager), and manage access.</p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">This section is available from Restaurant Dashboard. Connect to your user/role API to load and edit staff.</p>
              </div>
            </Card>
          </div>
        ) : activeTab === 'shift' ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shift Management</h2>
            <p className="text-sm text-gray-600 mb-4">Start/end shifts and view shift reports.</p>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Track shifts, clock in/out, and view shift summaries. Start shift, end shift, and view today&apos;s shift report.</p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">Shift data can be integrated with your time-tracking or payroll system.</p>
              </div>
            </Card>
          </div>
        ) : activeTab === 'tables' ? (
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
                        <td className="px-4 py-3 text-sm">A${priceInclGst(Number(i.price)).toFixed(2)}</td>
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
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCategoryOptionsModalOpen(true)
                    const firstExisting = menuCategoryOptions[0] || Object.keys(categoryCustomizationsByCategory)[0]
                    setCategoryOptionsCategory(firstExisting || CATEGORY_OPTIONS_NEW)
                    setCategoryOptionsNewCategoryName('')
                  }}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Category options
                </Button>
                <Button onClick={handleAddMenuItem} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Item
                </Button>
              </div>
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
                        Customizations
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
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
                            A${priceInclGst(item.price).toFixed(2)} (incl. GST)
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px]">
                            {item.customizations && item.customizations.length > 0 ? (
                              <div className="space-y-1 text-xs">
                                {item.customizations.map((g) => {
                                  const opts = (g.options || []).map((o) => o.name).filter(Boolean).join(', ')
                                  if (!opts) return null
                                  if ((g.type || '').toLowerCase() === 'remove') {
                                    return <div key={g.id}><span className="text-gray-500">Remove:</span> {opts}</div>
                                  }
                                  const prices = (g.options || []).map((o) => Number(o?.price) > 0 ? `$${o.price}` : null).filter(Boolean)
                                  const pricePart = prices.length > 0 ? ` (${prices.join(', ')})` : ''
                                  return <div key={g.id}><span className="text-gray-500">Extras:</span> {opts}{pricePart}</div>
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
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
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                    showOrderSummary={false}
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

      {/* Menu Item Modal - close only via Close button, not overlay */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        closeOnOverlayClick={false}
      >
        <MenuItemForm
          initialData={editingItem || undefined}
          categoryOptions={menuCategoryOptions}
          categoryCustomizationsByCategory={categoryCustomizationsForForm}
          onSubmit={handleMenuItemSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Category options modal: set remove/extras once per category; they apply to all items in that category */}
      <Modal
        isOpen={categoryOptionsModalOpen}
        onClose={() => setCategoryOptionsModalOpen(false)}
        title="Options for category"
        closeOnOverlayClick={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Set options and extras for a category. They will apply to <strong>all menu items</strong> in that category (e.g. all Pizzas get the same options). Add or delete options as needed.
          </p>
          <Select
            label="Category"
            value={categoryOptionsCategory}
            onChange={(e) => {
              setCategoryOptionsCategory(e.target.value)
              if (e.target.value !== CATEGORY_OPTIONS_NEW) setCategoryOptionsNewCategoryName('')
            }}
            options={[
              ...Array.from(new Set([...menuCategoryOptions, ...Object.keys(categoryCustomizationsByCategory)])).map((c) => ({ value: c, label: c })),
              { value: CATEGORY_OPTIONS_NEW, label: '➕ New category...' }
            ]}
          />
          {categoryOptionsCategory === CATEGORY_OPTIONS_NEW && (
            <Input
              label="New category name"
              value={categoryOptionsNewCategoryName}
              onChange={(e) => setCategoryOptionsNewCategoryName(e.target.value)}
              placeholder="e.g. Pizza, Sides, Beverages"
            />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
            <p className="text-xs text-gray-500 mb-2">Options customers can select (e.g. No tomato, No onion). No charge. Add or delete as needed.</p>
            {categoryRemoveOptions.map((opt, idx) => (
              <div key={opt.id || idx} className="flex gap-2 mb-2">
                <Input
                  value={opt.name}
                  onChange={(e) => {
                    const list = [...categoryRemoveOptions]
                    list[idx] = { ...list[idx], name: e.target.value }
                    setCategoryRemoveOptions(list)
                  }}
                  placeholder="e.g. No tomato"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setCategoryRemoveOptions(categoryRemoveOptions.filter((_, i) => i !== idx))}
                  className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  aria-label="Delete option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCategoryRemoveOptions([...categoryRemoveOptions, { id: `rem_${Date.now()}`, name: '', price: 0 }])}
              className="text-sm text-orange-600 font-medium hover:underline"
            >
              + Add option
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Extras</label>
            <p className="text-xs text-gray-500 mb-2">Add-ons with optional price (e.g. Extra cheese A$2). Add or delete as needed.</p>
            {categoryExtras.map((opt, idx) => (
              <div key={opt.id || idx} className="flex gap-2 mb-2 items-center">
                <Input
                  value={opt.name}
                  onChange={(e) => {
                    const list = [...categoryExtras]
                    list[idx] = { ...list[idx], name: e.target.value }
                    setCategoryExtras(list)
                  }}
                  placeholder="e.g. Extra cheese"
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={String(opt.price ?? 0)}
                  onChange={(e) => {
                    const list = [...categoryExtras]
                    list[idx] = { ...list[idx], price: parseFloat(e.target.value) || 0 }
                    setCategoryExtras(list)
                  }}
                  className="w-20"
                />
                <span className="text-xs text-gray-500 w-6">A$</span>
                <button
                  type="button"
                  onClick={() => setCategoryExtras(categoryExtras.filter((_, i) => i !== idx))}
                  className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  aria-label="Delete extra"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCategoryExtras([...categoryExtras, { id: `ext_${Date.now()}`, name: '', price: 0 }])}
              className="text-sm text-orange-600 font-medium hover:underline"
            >
              + Add extra
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCategoryOptionsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategoryOptions} isLoading={categoryOptionsSaving}>
              Save for this category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

