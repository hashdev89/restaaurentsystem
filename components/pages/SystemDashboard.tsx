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
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  Trash2,
  Headphones,
  MessageSquare,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { useNotification } from '../providers/NotificationProvider'
import { normalizeOrders } from '@/lib/orders'
import type { Restaurant, Order } from '@/types'
import type { Notification, NotificationType } from '@/types/notification'

type Section = 'overview' | 'restaurants' | 'orders' | 'settings' | 'users' | 'notifications' | 'support'

type RestaurantWithMeta = Restaurant & { orderCount?: number; revenueToday?: number; latitude?: number; longitude?: number }

/** Geocode address to lat/lng via Mapbox (for map pin). */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const token = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined
  if (!token?.trim()) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const center = data.features?.[0]?.center
    if (!Array.isArray(center) || center.length < 2) return null
    return { lng: center[0], lat: center[1] }
  } catch {
    return null
  }
}
type OrderWithRestaurantName = Order & { restaurantName?: string }

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'support', label: 'Support (Help desk)', icon: Headphones },
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
    latitude: '',
    longitude: '',
    loginEmail: '',
    loginPassword: '',
  })
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantWithMeta | null>(null)
  const [editRestaurantForm, setEditRestaurantForm] = useState({ name: '', description: '', address: '', phone: '', image: '', location: '', latitude: '', longitude: '', loginEmail: '', loginPassword: '', posEnabled: true, kdsEnabled: true, posPinRequired: false, kdsPinRequired: false })
  const [editRestaurantUser, setEditRestaurantUser] = useState<{ id: string; email: string } | null>(null)
  const [editRestaurantSaving, setEditRestaurantSaving] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState<RestaurantWithMeta | null>(null)
  const [deletingRestaurant, setDeletingRestaurant] = useState(false)
  const [users, setUsers] = useState<{ id: string; email: string; name?: string; role: string; restaurantId?: string }[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [addUserSaving, setAddUserSaving] = useState(false)
  const [addUserForm, setAddUserForm] = useState<{ email: string; name: string; role: 'customer' | 'restaurant' | 'admin'; restaurantId: string }>({ email: '', name: '', role: 'customer', restaurantId: '' })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [supportMessages, setSupportMessages] = useState<{ id: string; source: string; type: string; message: string; createdAt: string; status: string }[]>([])
  const [supportLoading, setSupportLoading] = useState(false)
  const { success, error: showError, notifications, unreadCount, markAllAsRead, markAsRead, remove } = useNotification()

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
    const { name, address, phone, loginEmail, loginPassword } = addRestaurantForm
    if (!name.trim() || !address.trim() || !phone.trim()) {
      showError('Missing fields', 'Name, address, and phone are required.')
      return
    }
    setAddRestaurantSaving(true)
    try {
      // Auto-fetch coordinates from address or location if not already set
      let lat = addRestaurantForm.latitude ? Number(addRestaurantForm.latitude) : undefined
      let lng = addRestaurantForm.longitude ? Number(addRestaurantForm.longitude) : undefined
      const locationStr = addRestaurantForm.location?.trim() ?? ''
      const needCoords = lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)
      if (needCoords && address.trim()) {
        const query = locationStr ? `${address.trim()}, ${locationStr}` : address.trim()
        const coords = await geocodeAddress(query)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }
      if (needCoords && (lat == null || lng == null) && locationStr) {
        const coords = await geocodeAddress(locationStr)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }

      let res: Response
      try {
        res = await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addRestaurantForm.name,
            description: addRestaurantForm.description,
            address: addRestaurantForm.address,
            phone: addRestaurantForm.phone,
            image: addRestaurantForm.image,
            location: addRestaurantForm.location,
            latitude: lat,
            longitude: lng,
          }),
        })
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : 'Network error'
        if (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          throw new Error(
            'Cannot reach the server. If deployed on Vercel: add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Project Settings → Environment Variables, then redeploy.'
          )
        }
        throw fetchErr
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to create restaurant')
      const restaurantId = data.restaurant?.id
      if (restaurantId && loginEmail.trim() && loginPassword && loginPassword.length >= 6) {
        const userRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim().toLowerCase(),
            name: name.trim(),
            role: 'restaurant',
            restaurantId,
            password: loginPassword,
          }),
        })
        if (!userRes.ok) {
          const userData = await userRes.json().catch(() => ({}))
          showError('Restaurant created, login not created', userData.error || 'Could not create login user.')
        } else {
          success('Restaurant added', `${name} created with login. Staff can sign in at Restaurant Login.`)
        }
      } else {
        success('Restaurant added', `${data.restaurant?.name ?? name} has been created. Add a user (Restaurant role) in Users to enable login.`)
      }
      setAddRestaurantForm({ name: '', description: '', address: '', phone: '', image: '', location: '', latitude: '', longitude: '', loginEmail: '', loginPassword: '' })
      setShowAddRestaurant(false)
      const listRes = await fetch('/api/restaurants')
      const listData = await listRes.json()
      if (listRes.ok) setRestaurants(listData.restaurants ?? [])
      const usersRes = await fetch('/api/users')
      const usersData = await usersRes.json()
      if (usersRes.ok) setUsers(usersData.users ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.'
      const isNetworkOrFetch =
        typeof msg === 'string' &&
        (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed'))
      showError(
        'Could not add restaurant',
        isNetworkOrFetch
          ? 'Cannot reach the server or database. Check: (1) Dev server is running. (2) If deployed: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Project Settings → Environment Variables, then redeploy.'
          : msg
      )
    } finally {
      setAddRestaurantSaving(false)
    }
  }

  const openEditRestaurant = async (r: RestaurantWithMeta) => {
    setEditingRestaurant(r)
    const rAny = r as RestaurantWithMeta & { latitude?: number; longitude?: number }
    setEditRestaurantForm({
      name: r.name,
      description: r.description ?? '',
      address: r.address,
      phone: r.phone,
      image: r.image ?? '',
      location: r.location ?? '',
      latitude: rAny.latitude != null ? String(rAny.latitude) : '',
      longitude: rAny.longitude != null ? String(rAny.longitude) : '',
      loginEmail: '',
      loginPassword: '',
      posEnabled: r.posEnabled !== false,
      kdsEnabled: r.kdsEnabled !== false,
      posPinRequired: r.posPinRequired === true,
      kdsPinRequired: r.kdsPinRequired === true,
    })
    setEditRestaurantUser(null)
    try {
      const res = await fetch(`/api/users?restaurantId=${r.id}`)
      const data = await res.json()
      const list = data.users ?? []
      const restaurantUser = list.find((u: { role: string }) => u.role === 'restaurant')
      if (restaurantUser) {
        setEditRestaurantUser({ id: restaurantUser.id, email: restaurantUser.email })
        setEditRestaurantForm((f) => ({ ...f, loginEmail: restaurantUser.email }))
      }
    } catch {
      // ignore
    }
  }

  const handleEditRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRestaurant) return
    const { name, address, phone, loginEmail, loginPassword } = editRestaurantForm
    if (!name.trim() || !address.trim() || !phone.trim()) {
      showError('Missing fields', 'Name, address, and phone are required.')
      return
    }
    setEditRestaurantSaving(true)
    try {
      const res = await fetch(`/api/restaurants/${editingRestaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRestaurantForm.name,
          description: editRestaurantForm.description,
          address: editRestaurantForm.address,
          phone: editRestaurantForm.phone,
          image: editRestaurantForm.image,
          location: editRestaurantForm.location,
          latitude: editRestaurantForm.latitude ? Number(editRestaurantForm.latitude) : undefined,
          longitude: editRestaurantForm.longitude ? Number(editRestaurantForm.longitude) : undefined,
          posEnabled: editRestaurantForm.posEnabled,
          kdsEnabled: editRestaurantForm.kdsEnabled,
          posPinRequired: editRestaurantForm.posPinRequired,
          kdsPinRequired: editRestaurantForm.kdsPinRequired,
        }),
      })
      if (!res.ok) throw new Error('Failed to update restaurant')
      let passwordSaved = false
      if (editRestaurantUser) {
        if (loginPassword && loginPassword.length >= 6) {
          const userRes = await fetch(`/api/users/${editRestaurantUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: loginPassword }),
          })
          if (!userRes.ok) {
            const userData = await userRes.json().catch(() => ({}))
            throw new Error(userData.error || 'Failed to save password')
          }
          passwordSaved = true
        }
      } else if (loginEmail.trim() && loginPassword && loginPassword.length >= 6) {
        const userRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim().toLowerCase(),
            name: name.trim(),
            role: 'restaurant',
            restaurantId: editingRestaurant.id,
            password: loginPassword,
          }),
        })
        if (!userRes.ok) {
          const userData = await userRes.json().catch(() => ({}))
          throw new Error(userData.error || 'Failed to create login')
        }
        passwordSaved = true
      }
      success('Restaurant updated', passwordSaved ? `${name} saved. Login password saved — staff can sign in now.` : `${name} saved.`)
      setEditingRestaurant(null)
      const listRes = await fetch('/api/restaurants')
      const listData = await listRes.json()
      if (listRes.ok) setRestaurants(listData.restaurants ?? [])
      const usersRes = await fetch('/api/users')
      const usersData = await usersRes.json()
      if (usersRes.ok) setUsers(usersData.users ?? [])
    } catch (err) {
      showError('Could not update restaurant', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setEditRestaurantSaving(false)
    }
  }

  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return
    setDeletingRestaurant(true)
    try {
      const res = await fetch(`/api/restaurants/${restaurantToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete')
      }
      success('Restaurant deleted', `${restaurantToDelete.name} has been removed.`)
      setRestaurantToDelete(null)
      const listRes = await fetch('/api/restaurants')
      const listData = await listRes.json()
      if (listRes.ok) setRestaurants(listData.restaurants ?? [])
      const usersRes = await fetch('/api/users')
      const usersData = await usersRes.json()
      if (usersRes.ok) setUsers(usersData.users ?? [])
    } catch (err) {
      showError('Could not delete restaurant', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setDeletingRestaurant(false)
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
    businessName: 'EasyMenu',
    taxRate: 10,
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    features: {
      booking: true,
      pos: true,
      kitchen: true,
    },
    integrations: {
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

  useEffect(() => {
    if (section !== 'support') return
    let cancelled = false
    setSupportLoading(true)
    fetch('/api/support')
      .then((res) => res.ok ? res.json() : { messages: [] })
      .then((data) => {
        if (!cancelled && data.messages) setSupportMessages(data.messages)
      })
      .catch(() => { if (!cancelled) setSupportMessages([]) })
      .finally(() => { if (!cancelled) setSupportLoading(false) })
    return () => { cancelled = true }
  }, [section])

  const markSupportRead = async (id: string) => {
    try {
      await fetch('/api/support', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'read' }) })
      setSupportMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m)))
    } catch (_) { /* ignore */ }
  }

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

  // Close any open modals when switching section so overlay never gets stuck
  useEffect(() => {
    setShowAddRestaurant(false)
    setEditingRestaurant(null)
    setRestaurantToDelete(null)
    setShowAddUser(false)
  }, [section])

  // Clear modal state on mount so no overlay appears on first load
  useEffect(() => {
    setShowAddRestaurant(false)
    setEditingRestaurant(null)
    setRestaurantToDelete(null)
    setShowAddUser(false)
  }, [])

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
              {section === 'notifications' && 'Restaurant, POS, customer errors, updates, and connection issues'}
              {section === 'support' && 'Messages from POS Support (issues & technical help)'}
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

          {/* Notifications */}
          {section === 'notifications' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">All notifications from restaurant, POS, customer side: errors, updates, user connection issues.</p>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-orange-600">
                    <Bell className="w-4 h-4 mr-2" />
                    Mark all read
                  </Button>
                )}
              </div>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {[...notifications].reverse().length === 0 ? (
                    <li className="px-6 py-12 text-center text-gray-500">No notifications yet</li>
                  ) : (
                    [...notifications].reverse().map((n) => (
                      <SystemNotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={() => markAsRead(n.id)}
                        onRemove={() => remove(n.id)}
                      />
                    ))
                  )}
                </ul>
              </Card>
            </div>
          )}

          {/* Support (Help desk) - messages from POS */}
          {section === 'support' && (
            <div className="space-y-4">
              <p className="text-gray-600">Messages sent from POS Support (issues and technical help). Reply or resolve from here.</p>
              {supportLoading ? (
                <p className="text-gray-500">Loading messages…</p>
              ) : supportMessages.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-medium">No support messages yet</p>
                  <p className="text-sm text-gray-500 mt-1">Messages from POS → Support appear here.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {supportMessages.map((m) => (
                    <Card key={m.id} className={`p-4 ${m.status === 'new' ? 'border-l-4 border-orange-500' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge variant={m.type === 'technical' ? 'info' : 'warning'} className="text-xs">
                              {m.type === 'technical' ? 'Technical help' : 'Issue'}
                            </Badge>
                            <span className="text-xs text-gray-500">from {m.source}</span>
                            <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</span>
                            {m.status === 'new' && (
                              <span className="text-xs font-medium text-orange-600">New</span>
                            )}
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap">{m.message}</p>
                        </div>
                        {m.status === 'new' && (
                          <Button variant="ghost" size="sm" onClick={() => markSupportRead(m.id)}>
                            Mark read
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                  onClick={() => openEditRestaurant(r)}
                                  title="Edit restaurant and login"
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRestaurantToDelete(r)}
                                  title="Delete restaurant"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
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
                                <Link href={`/restaurant/${r.id}/dashboard`}>
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

              {/* Add Restaurant modal - only show when on restaurants section */}
              {section === 'restaurants' && showAddRestaurant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <div onClick={(e) => e.stopPropagation()}>
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
                          onBlur={async () => {
                            const addr = addRestaurantForm.address?.trim()
                            const loc = addRestaurantForm.location?.trim()
                            const query = addr && loc ? `${addr}, ${loc}` : addr || loc
                            if (!query) return
                            const coords = await geocodeAddress(query)
                            if (coords) {
                              setAddRestaurantForm((f) => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng) }))
                              success('Coordinates fetched', 'Lat/lng set from address. Restaurant will appear on the map.')
                            }
                          }}
                          placeholder="e.g. 123 Main St or 53F5+M5 Camberwell, Victoria, Australia"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location (city/area) — auto-fills lat/lng on blur</label>
                        <Input
                          value={addRestaurantForm.location}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, location: e.target.value }))}
                          onBlur={async () => {
                            const loc = addRestaurantForm.location?.trim()
                            if (!loc) return
                            const coords = await geocodeAddress(loc)
                            if (coords) {
                              setAddRestaurantForm((f) => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng) }))
                              success('Coordinates fetched', 'Lat/lng set from location. Restaurant will appear on the map.')
                            }
                          }}
                          placeholder="e.g. Camberwell, Victoria, Australia or 53F5+M5 Camberwell"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (for map)</label>
                          <Input
                            value={addRestaurantForm.latitude}
                            onChange={(e) => setAddRestaurantForm((f) => ({ ...f, latitude: e.target.value }))}
                            placeholder="e.g. -33.8688"
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (for map)</label>
                          <Input
                            value={addRestaurantForm.longitude}
                            onChange={(e) => setAddRestaurantForm((f) => ({ ...f, longitude: e.target.value }))}
                            placeholder="e.g. 151.2093"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={async () => {
                            const addr = addRestaurantForm.address?.trim()
                            const loc = addRestaurantForm.location?.trim()
                            const query = addr && loc ? `${addr}, ${loc}` : addr || loc
                            if (!query) { showError('No address or location', 'Enter address or location first, then click Look up on map.') ; return }
                            const coords = await geocodeAddress(query)
                            if (coords) {
                              setAddRestaurantForm((f) => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng) }))
                              success('Coordinates found', 'Lat/lng set. Restaurant will appear on the map.')
                            } else {
                              showError('Lookup failed', 'Could not find coordinates. Add latitude/longitude manually or set NEXT_PUBLIC_MAPBOX_TOKEN.')
                            }
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          Look up on map
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                        <Input
                          value={addRestaurantForm.image}
                          onChange={(e) => setAddRestaurantForm((f) => ({ ...f, image: e.target.value }))}
                          placeholder="https://…"
                        />
                      </div>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Restaurant login (optional)</h4>
                        <p className="text-xs text-gray-500 mb-2">Create login so staff can sign in to this restaurant&apos;s dashboard.</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">This username and password grant access to this restaurant’s Dashboard, POS, and Kitchen (KDS). Staff sign in at Restaurant Login with this email and password.</p>
                          <Input
                            label="Login email"
                            type="email"
                            value={addRestaurantForm.loginEmail}
                            onChange={(e) => setAddRestaurantForm((f) => ({ ...f, loginEmail: e.target.value }))}
                            placeholder="staff@restaurant.com"
                          />
                          <Input
                            label="Login password (min 8 characters)"
                            type="password"
                            value={addRestaurantForm.loginPassword}
                            onChange={(e) => setAddRestaurantForm((f) => ({ ...f, loginPassword: e.target.value }))}
                            placeholder="••••••••"
                            showPasswordToggle
                          />
                        </div>
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
                </div>
              )}

              {/* Edit Restaurant modal - only show when on restaurants section */}
              {section === 'restaurants' && editingRestaurant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Edit Restaurant & Login</h3>
                      <button type="button" onClick={() => setEditingRestaurant(null)} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleEditRestaurant} className="space-y-4">
                      <Input label="Name *" value={editRestaurantForm.name} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, name: e.target.value }))} placeholder="Restaurant name" required />
                      <Input label="Description" value={editRestaurantForm.description} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" />
                      <Input
                        label="Address *"
                        value={editRestaurantForm.address}
                        onChange={(e) => setEditRestaurantForm((f) => ({ ...f, address: e.target.value }))}
                        onBlur={async () => {
                          const addr = editRestaurantForm.address?.trim()
                          const loc = editRestaurantForm.location?.trim()
                          const query = addr && loc ? `${addr}, ${loc}` : addr || loc
                          if (!query) return
                          const coords = await geocodeAddress(query)
                          if (coords) {
                            setEditRestaurantForm((f) => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng) }))
                            success('Coordinates fetched', 'Lat/lng set from address. Restaurant will appear on the map.')
                          }
                        }}
                        placeholder="e.g. 123 Main St or full address (lat/lng auto on blur)"
                        required
                      />
                      <Input label="Phone *" value={editRestaurantForm.phone} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" required />
                      <Input
                        label="Location (city/area) — auto-fills lat/lng on blur"
                        value={editRestaurantForm.location}
                        onChange={(e) => setEditRestaurantForm((f) => ({ ...f, location: e.target.value }))}
                        onBlur={async () => {
                          const loc = editRestaurantForm.location?.trim()
                          if (!loc) return
                          const coords = await geocodeAddress(loc)
                          if (coords) {
                            setEditRestaurantForm((f) => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng) }))
                            success('Coordinates fetched', 'Lat/lng set from location. Restaurant will appear on the map.')
                          }
                        }}
                        placeholder="e.g. Camberwell, Victoria, Australia"
                      />
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[100px]">
                          <Input label="Latitude (for map)" value={editRestaurantForm.latitude} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g. -33.8688" />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <Input label="Longitude (for map)" value={editRestaurantForm.longitude} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g. 151.2093" />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={async () => {
                            const addr = editRestaurantForm.address?.trim()
                            const loc = editRestaurantForm.location?.trim()
                            const query = addr && loc ? `${addr}, ${loc}` : addr || loc
                            if (!query) { showError('No address or location', 'Enter address or location first, then click Look up on map.') ; return }
                            const coords = await geocodeAddress(query)
                            if (coords) {
                              setEditRestaurantForm((f) => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng) }))
                              success('Coordinates found', 'Lat/lng set. Restaurant will appear on the map.')
                            } else {
                              showError('Lookup failed', 'Could not find coordinates. Add latitude/longitude manually or set NEXT_PUBLIC_MAPBOX_TOKEN.')
                            }
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          Look up on map
                        </Button>
                      </div>
                      <Input label="Image URL" value={editRestaurantForm.image} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://…" />
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Restaurant login (Dashboard, POS, Kitchen)</h4>
                        <p className="text-xs text-gray-500 mb-2">This username and password work for this restaurant’s Dashboard, POS, and Kitchen (KDS). Staff sign in at Restaurant Login.</p>
                        {editRestaurantUser ? (
                          <>
                            <p className="text-xs text-gray-500 mb-2">Login email: <strong>{editRestaurantUser.email}</strong></p>
                            <p className="text-xs text-gray-500 mb-2">Set a new password below and click Save to update.</p>
                            <Input label="New password (min 8 characters — leave blank to keep current)" type="password" value={editRestaurantForm.loginPassword} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, loginPassword: e.target.value }))} placeholder="••••••••" autoComplete="new-password" showPasswordToggle />
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 mb-2">No login yet. Add email and password below, then Save to create login for this restaurant.</p>
                            <Input label="Login email" type="email" value={editRestaurantForm.loginEmail} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, loginEmail: e.target.value }))} placeholder="staff@restaurant.com" />
                            <Input label="Login password (min 8 characters)" type="password" value={editRestaurantForm.loginPassword} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, loginPassword: e.target.value }))} placeholder="••••••••" autoComplete="new-password" showPasswordToggle />
                          </>
                        )}
                      </div>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">POS & KDS access</h4>
                        <p className="text-xs text-gray-500 mb-3">Turn POS or Kitchen (KDS) on/off for this restaurant. When PIN is required, staff enter a 4-digit PIN (set in Restaurant Dashboard → Access).</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editRestaurantForm.posEnabled} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, posEnabled: e.target.checked }))} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                            <span className="text-sm font-medium text-gray-700">POS enabled</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editRestaurantForm.posPinRequired} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, posPinRequired: e.target.checked }))} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                            <span className="text-sm font-medium text-gray-700">Require 4-digit PIN for POS</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editRestaurantForm.kdsEnabled} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, kdsEnabled: e.target.checked }))} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                            <span className="text-sm font-medium text-gray-700">KDS (Kitchen) enabled</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editRestaurantForm.kdsPinRequired} onChange={(e) => setEditRestaurantForm((f) => ({ ...f, kdsPinRequired: e.target.checked }))} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                            <span className="text-sm font-medium text-gray-700">Require 4-digit PIN for KDS</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={editRestaurantSaving}>
                          {editRestaurantSaving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingRestaurant(null)}>Cancel</Button>
                      </div>
                    </form>
                  </Card>
                  </div>
                </div>
              )}

              {/* Delete Restaurant confirmation */}
              {restaurantToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Card className="w-full max-w-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete restaurant?</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      <strong>{restaurantToDelete.name}</strong> will be permanently removed. This will also remove its menu items, tables, and related data. This cannot be undone.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setRestaurantToDelete(null)} disabled={deletingRestaurant}>
                        Cancel
                      </Button>
                      <Button variant="danger" onClick={handleDeleteRestaurant} disabled={deletingRestaurant}>
                        {deletingRestaurant ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </Card>
                  </div>
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
                      placeholder="EasyMenu"
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
              </Card>

                {/* Add User modal - only show when on users section */}
                {section === 'users' && showAddUser && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div onClick={(e) => e.stopPropagation()}>
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
                </div>
                )}
              </div>
            )}
        </div>
      </main>
    </div>
  )
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

function formatNotificationTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString()
}

function SystemNotificationItem({
  notification,
  onMarkRead,
  onRemove,
}: {
  notification: Notification
  onMarkRead: () => void
  onRemove: () => void
}) {
  const Icon = NOTIFICATION_ICONS[notification.type]
  const isUnread = !notification.read
  return (
    <li className="flex gap-3 px-6 py-4 text-left transition-colors border-b border-gray-100 last:border-0">
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
        notification.type === 'success' ? 'bg-emerald-100' :
        notification.type === 'error' ? 'bg-red-100' :
        notification.type === 'warning' ? 'bg-amber-100' : 'bg-sky-100'
      }`}>
        <Icon className={`w-4 h-4 ${
          notification.type === 'success' ? 'text-emerald-600' :
          notification.type === 'error' ? 'text-red-600' :
          notification.type === 'warning' ? 'text-amber-600' : 'text-sky-600'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatNotificationTime(notification.timestamp)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isUnread && (
          <button type="button" onClick={onMarkRead} className="p-2 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50" title="Mark as read">
            <Check className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={onRemove} className="p-2 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Remove">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  )
}
