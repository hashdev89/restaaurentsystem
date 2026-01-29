'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Store,
  Package,
  Settings,
  Users,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Building2,
  Plus,
  Edit,
  Pause,
  Play,
  ExternalLink,
  Save,
  Bell,
  Shield,
  MapPin,
  CreditCard,
  Database,
  X,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { useNotification } from '../providers/NotificationProvider'
import { normalizeOrders } from '@/lib/orders'
import type { Restaurant, Order } from '@/types'

type Section = 'overview' | 'restaurants' | 'orders' | 'settings' | 'users'

type RestaurantWithMeta = Restaurant & { orderCount?: number; revenueToday?: number }
type OrderWithRestaurantName = Order & { restaurantName?: string }

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'restaurants', label: 'Restaurants', icon: Store },
  { id: 'orders', label: 'All Orders', icon: Package },
  { id: 'settings', label: 'System Settings', icon: Settings },
  { id: 'users', label: 'Users & Access', icon: Users },
]

export function SystemDashboard() {
  const [section, setSection] = useState<Section>('overview')
  const [restaurants, setRestaurants] = useState<RestaurantWithMeta[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(true)
  const [orders, setOrders] = useState<OrderWithRestaurantName[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)
  const [addRestaurantSaving, setAddRestaurantSaving] = useState(false)
  const [addRestaurantForm, setAddRestaurantForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    image: '',
    location: '',
  })
  const [users, setUsers] = useState<{ id: string; email: string; name?: string; role: string; restaurantId?: string }[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [addUserSaving, setAddUserSaving] = useState(false)
  const [addUserForm, setAddUserForm] = useState<{ email: string; name: string; role: 'customer' | 'restaurant' | 'admin'; restaurantId: string }>({ email: '', name: '', role: 'customer', restaurantId: '' })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const { success, error: showError } = useNotification()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setRestaurantsLoading(true)
      try {
        const res = await fetch('/api/restaurants')
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        if (!cancelled) setRestaurants(data.restaurants ?? [])
      } catch (e) {
        if (!cancelled) setRestaurants([])
        console.error('Failed to fetch restaurants:', e)
      } finally {
        if (!cancelled) setRestaurantsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setOrdersLoading(true)
      try {
        const res = await fetch('/api/orders')
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        const raw = (data.orders ?? []) as Parameters<typeof normalizeOrders>[0]
        const normalized = normalizeOrders(raw)
        if (!cancelled) setOrders(normalized)
      } catch (e) {
        if (!cancelled) setOrders([])
        console.error('Failed to fetch orders:', e)
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setUsersLoading(true)
      try {
        const res = await fetch('/api/users')
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        if (!cancelled) setUsers(data.users ?? [])
      } catch (e) {
        if (!cancelled) setUsers([])
        console.error('Failed to fetch users:', e)
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const restaurantById = Object.fromEntries(restaurants.map((r) => [r.id, r]))
  const ordersWithNames: OrderWithRestaurantName[] = orders.map((o) => ({
    ...o,
    restaurantName: restaurantById[o.restaurantId]?.name ?? o.restaurantId,
  }))

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    const { name, address, phone } = addRestaurantForm
    if (!name.trim() || !address.trim() || !phone.trim()) {
      showError('Missing fields', 'Name, address, and phone are required.')
      return
    }
    setAddRestaurantSaving(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addRestaurantForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create restaurant')
      success('Restaurant added', `${data.restaurant?.name ?? name} has been created. Checkout and dashboard will use it.`)
      setAddRestaurantForm({ name: '', description: '', address: '', phone: '', image: '', location: '' })
      setShowAddRestaurant(false)
      const listRes = await fetch('/api/restaurants')
      const listData = await listRes.json()
      if (listRes.ok) setRestaurants(listData.restaurants ?? [])
    } catch (err) {
      showError('Could not add restaurant', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setAddRestaurantSaving(false)
    }
  }

  const toggleRestaurantActive = async (r: RestaurantWithMeta) => {
    try {
      const res = await fetch(`/api/restaurants/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !r.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      const listRes = await fetch('/api/restaurants')
      const listData = await listRes.json()
      if (listRes.ok) setRestaurants(listData.restaurants ?? [])
      success(r.isActive ? 'Restaurant paused' : 'Restaurant active', `${r.name} has been ${r.isActive ? 'paused' : 'activated'}.`)
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addUserForm.email.trim()) {
      showError('Missing email', 'Email is required.')
      return
    }
    setAddUserSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addUserForm.email.trim(),
          name: addUserForm.name.trim() || undefined,
          role: addUserForm.role,
          restaurantId: addUserForm.restaurantId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')
      success('User added', `${data.user?.email ?? addUserForm.email} has been added.`)
      setAddUserForm({ email: '', name: '', role: 'customer', restaurantId: '' })
      setShowAddUser(false)
      const listRes = await fetch('/api/users')
      const listData = await listRes.json()
      if (listRes.ok) setUsers(listData.users ?? [])
    } catch (err) {
      showError('Could not add user', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setAddUserSaving(false)
    }
  }

  // System settings state
  const [settings, setSettings] = useState({
    businessName: 'RestaurantHub',
    taxRate: 10,
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    features: {
      booking: true,
      pos: true,
      kitchen: true,
    },
    integrations: {
      square: true,
      supabase: true,
      mapbox: true,
    },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSettingsLoading(true)
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        if (!cancelled && data.settings) setSettings(data.settings)
      } catch (e) {
        console.error('Failed to fetch settings:', e)
      } finally {
        if (!cancelled) setSettingsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save settings')
      if (data.settings) setSettings(data.settings)
      success('Settings saved', 'System settings have been updated and stored in the database.')
    } catch (err) {
      showError('Could not save settings', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const totalRevenueToday = restaurants.reduce((sum, r) => sum + (r.revenueToday ?? 0), 0)
  const totalOrdersToday = restaurants.reduce((sum, r) => sum + (r.orderCount ?? 0), 0)
  const pendingOrdersCount = ordersWithNames.filter((o) => o.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold">
            <Shield className="w-6 h-6 text-orange-600" />
            <span>System Control</span>
          </Link>
          <p className="text-xs text-gray-500 mt-1">Software owner dashboard</p>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-colors ${
                section === id
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
              <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <Link href="/restaurant/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Building2 className="w-4 h-4 mr-2" />
              Restaurant Dashboard
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900">
              {SIDEBAR_ITEMS.find((s) => s.id === section)?.label ?? 'System Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {section === 'overview' && 'Platform overview and key metrics'}
              {section === 'restaurants' && 'Manage all restaurants on the platform'}
              {section === 'orders' && 'View and filter orders across all restaurants'}
              {section === 'settings' && 'System-wide settings and integrations'}
              {section === 'users' && 'Users, roles, and access control'}
            </p>
          </div>
        </header>

        <div className="p-6">
          {/* Overview */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Restaurants</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{restaurants.length}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {restaurants.filter((r) => r.isActive).length} active
                      </p>
                    </div>
                    <Building2 className="w-10 h-10 text-orange-100" />
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Orders Today</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrdersToday}</p>
                    </div>
                    <ShoppingBag className="w-10 h-10 text-blue-100" />
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Revenue Today</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${totalRevenueToday.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-10 h-10 text-green-100" />
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {pendingOrdersCount}
                      </p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-amber-100" />
                  </div>
                </Card>
              </div>
              <Card className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Quick actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Link href="/system/dashboard">
                    <Button variant="secondary" size="sm" onClick={() => setSection('restaurants')}>
                      <Store className="w-4 h-4 mr-2" />
                      Manage Restaurants
                    </Button>
                  </Link>
                  <Link href="/system/dashboard">
                    <Button variant="secondary" size="sm" onClick={() => setSection('orders')}>
                      <Package className="w-4 h-4 mr-2" />
                      View All Orders
                    </Button>
                  </Link>
                  <Link href="/system/dashboard">
                    <Button variant="secondary" size="sm" onClick={() => setSection('settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      System Settings
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* Restaurants */}
          {section === 'restaurants' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Manage all restaurants. Add new ones so checkout and dashboard work.</p>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowAddRestaurant(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Restaurant
                </Button>
              </div>
              {restaurantsLoading ? (
                <p className="text-gray-500">Loading restaurants…</p>
              ) : restaurants.length === 0 ? (
                <Card className="p-8 text-center">
                  <Store className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-medium">No restaurants yet</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">Add your first restaurant so customers can order and checkout.</p>
                  <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowAddRestaurant(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Restaurant
                  </Button>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {restaurants.map((r) => (
                          <tr key={r.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {r.image ? (
                                  <img src={r.image} alt="" className="w-10 h-10 rounded-md object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                                    {r.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{r.name}</p>
                                  <p className="text-sm text-gray-500 truncate max-w-xs">{r.description || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.location || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.orderCount ?? 0}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {r.isActive ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRestaurantActive(r)}
                                  title={r.isActive ? 'Pause' : 'Activate'}
                                >
                                  {r.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                                <Link href={`/restaurant/${r.id}`} target="_blank" rel="noopener">
                                  <Button variant="ghost" size="sm" title="View public page">
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Link href="/restaurant/dashboard">
                                  <Button variant="ghost" size="sm" title="Restaurant dashboard">
                                    <LayoutDashboard className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Add Restaurant modal */}
              {showAddRestaurant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Add Restaurant</h3>
                      <button type="button" onClick={() => setShowAddRestaurant(false)} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleAddRestaurant} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <Input
                          value={addRestaurantForm.name}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. The Rocks Cafe"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <Input
                          value={addRestaurantForm.description}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Short description"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                        <Input
                          value={addRestaurantForm.address}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, address: e.target.value }))}
                          placeholder="Full address"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <Input
                          value={addRestaurantForm.phone}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="e.g. (02) 9251 2345"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location (city/area)</label>
                        <Input
                          value={addRestaurantForm.location}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, location: e.target.value }))}
                          placeholder="e.g. Sydney, NSW"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                        <Input
                          value={addRestaurantForm.image}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, image: e.target.value }))}
                          placeholder="https://…"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={addRestaurantSaving}>
                          {addRestaurantSaving ? 'Saving…' : 'Add Restaurant'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddRestaurant(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {section === 'orders' && (
            <div className="space-y-4">
              <p className="text-gray-600">Orders from all restaurants (Supabase).</p>
              {ordersLoading ? (
                <p className="text-gray-500">Loading orders…</p>
              ) : ordersWithNames.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">No orders yet. Orders appear here after customers checkout.</Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ordersWithNames.map((o) => (
                          <tr key={o.id}>
                            <td className="px-4 py-3">
                              <p className="font-mono text-sm font-medium text-gray-900 truncate max-w-[140px]" title={o.id}>{o.id}</p>
                              <p className="text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{o.restaurantName ?? o.restaurantId}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{o.customerName}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">${Number(o.total).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  o.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* System Settings */}
          {section === 'settings' && (
            <div className="max-w-2xl space-y-6">
              {settingsLoading ? (
                <p className="text-gray-500">Loading settings…</p>
              ) : (
                <>
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  General
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business / platform name</label>
                    <Input
                      value={settings.businessName}
                      onChange={(e) => setSettings((s) => ({ ...s, businessName: e.target.value }))}
                      placeholder="RestaurantHub"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax rate (%)</label>
                      <Input
                        type="number"
                        value={String(settings.taxRate)}
                        onChange={(e) => setSettings((s) => ({ ...s, taxRate: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <Input
                        value={settings.currency}
                        onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <Input
                      value={settings.timezone}
                      onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Features
                </h3>
                <div className="space-y-3">
                  {(['booking', 'pos', 'kitchen'] as const).map((f) => (
                    <label key={f} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium text-gray-700 capitalize">{f}</span>
                      <input
                        type="checkbox"
                        checked={settings.features[f]}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            features: { ...s.features, [f]: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Integrations
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Square (Payments)</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Connected</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Supabase (Database)</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Connected</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Mapbox (Maps)</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Connected</span>
                  </div>
                </div>
              </Card>

              <Button onClick={saveSettings} className="bg-orange-600 hover:bg-orange-700" disabled={settingsSaving}>
                <Save className="w-4 h-4 mr-2" />
                {settingsSaving ? 'Saving…' : 'Save settings'}
              </Button>
                </>
              )}
            </div>
          )}

          {/* Users & Access */}
          {section === 'users' && (
            <div className="space-y-4">
              <p className="text-gray-600">Manage platform users (stored in Supabase). Add staff or admins and optionally link to a restaurant.</p>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Platform users
                  </h3>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowAddUser(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add user
                  </Button>
                </div>
                {usersLoading ? (
                  <p className="text-gray-500">Loading users…</p>
                ) : users.length === 0 ? (
                  <p className="text-gray-500 py-4">No users yet. Add a user to get started.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name / Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{u.name || '—'}</p>
                              <p className="text-sm text-gray-500">{u.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">{u.role}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {u.restaurantId ? restaurantById[u.restaurantId]?.name ?? u.restaurantId : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="sm" title="Edit (coming soon)"><Edit className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showAddUser && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <Card className="w-full max-w-md p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Add User</h3>
                        <button type="button" onClick={() => setShowAddUser(false)} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                          <Input
                            type="email"
                            value={addUserForm.email}
                            onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="user@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <Input
                            value={addUserForm.name}
                            onChange={(e) => setAddUserForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Display name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={addUserForm.role}
                            onChange={(e) => setAddUserForm((f) => ({ ...f, role: e.target.value as 'customer' | 'restaurant' | 'admin' }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="customer">Customer</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant (optional)</label>
                          <select
                            value={addUserForm.restaurantId}
                            onChange={(e) => setAddUserForm((f) => ({ ...f, restaurantId: e.target.value }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="">— None —</option>
                            {restaurants.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={addUserSaving}>
                            {addUserSaving ? 'Saving…' : 'Add User'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setShowAddUser(false)}>Cancel</Button>
                        </div>
                      </form>
                    </Card>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
