'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Search, ArrowLeft, MapPin, Phone, Star, StarHalf, Calendar } from 'lucide-react'
import { MenuItem } from '@/components/MenuItem'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCart } from '@/components/providers/CartProvider'
import { MenuItem as MenuItemType, Restaurant } from '@/types'

function mapApiRestaurant(row: { id: string; name: string; description: string | null; address: string; phone: string; image: string | null; location: string | null; is_active: boolean; rating: number; review_count: number }): Restaurant {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    address: row.address,
    phone: row.phone,
    image: row.image ?? '',
    isActive: row.is_active,
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    location: row.location ?? '',
  }
}

export function CustomerMenu() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params?.restaurantId as string
  const { itemCount, total, setTableNumber } = useCart()
  const searchParams = useSearchParams()
  const tableFromUrl = searchParams.get('table')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [resRes, resMenu] = await Promise.all([
          fetch('/api/restaurants'),
          fetch(`/api/menu-items?restaurantId=${encodeURIComponent(restaurantId)}`),
        ])
        if (cancelled) return
        if (resRes.ok) {
          const data = await resRes.json()
          const found = (data.restaurants ?? []).find((r: { id: string }) => r.id === restaurantId)
          if (found) setRestaurant(mapApiRestaurant(found))
        }
        if (resMenu.ok) {
          const data = await resMenu.json()
          setMenuItems(data.items ?? [])
        }
      } catch {
        if (!cancelled) setRestaurant(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [restaurantId])

  useEffect(() => {
    if (tableFromUrl) setTableNumber(tableFromUrl)
  }, [tableFromUrl, setTableNumber])

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarHalf key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />)
      }
    }
    return stars
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h2>
        <Button onClick={() => router.push('/')}>Back to Restaurants</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500">Loading restaurant…</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h2>
        <p className="text-gray-500 mb-8">The restaurant doesn&apos;t exist or is unavailable.</p>
        <Button onClick={() => router.push('/')}>Back to Restaurants</Button>
      </div>
    )
  }

  const restaurantItems = menuItems
  // Get unique categories for this restaurant
  const categories = ['All', ...Array.from(new Set(restaurantItems.map((item) => item.category)))]

  const filteredItems = restaurantItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
                <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                  <div className="flex items-center">
                    <div className="flex mr-1">{renderStars(restaurant.rating)}</div>
                    <span className="font-medium text-gray-900">{restaurant.rating}</span>
                    <span className="ml-1">({restaurant.reviewCount})</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{restaurant.location}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href={`/restaurant/${restaurantId}/booking`}>
                <Button variant="secondary" className="relative">
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Table
                </Button>
              </Link>
              <Link href="/cart">
                <Button variant="primary" className="relative">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Cart ({itemCount}) - ${total.toFixed(2)}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Restaurant Hero/Info (Mobile Only - simplified) */}
        <div className="md:hidden mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">{restaurant.description}</p>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="mr-3">{restaurant.address}</span>
            <Phone className="w-3 h-3 mr-1" />
            <span>{restaurant.phone}</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={`Search menu at ${restaurant.name}...`}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${
                    selectedCategory === category
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No items found matching your criteria.
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setSelectedCategory('All')
                setSearchQuery('')
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      {/* Mobile Sticky Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
          <Link href="/cart">
            <Button className="w-full justify-between px-6">
              <span className="flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" />
                {itemCount} items
              </span>
              <span>${total.toFixed(2)}</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

