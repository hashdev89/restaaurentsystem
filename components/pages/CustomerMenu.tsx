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
import { MOCK_RESTAURANTS } from './RestaurantList'

// Expanded Mock Menu Data for Australian Restaurants
const MOCK_MENU: MenuItemType[] = [
  // The Rocks Cafe (rest_1)
  {
    id: '1',
    restaurantId: 'rest_1',
    name: 'Aussie Beef Pie',
    description: 'Traditional Australian meat pie with premium beef, gravy, and flaky pastry. Served with tomato sauce.',
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
    price: 18.50,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    isAvailable: true
  },
  {
    id: '3',
    restaurantId: 'rest_1',
    name: 'Aussie Burger',
    description: 'Beef patty, beetroot, egg, bacon, cheese, lettuce, tomato, and onion on a brioche bun.',
    price: 16.99,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    isAvailable: true
  },
  {
    id: '4',
    restaurantId: 'rest_1',
    name: 'Pavlova',
    description: 'Classic Australian dessert with meringue, fresh cream, and seasonal fruits.',
    price: 9.50,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80',
    isAvailable: true
  },
  // Melbourne Pasta House (rest_2)
  {
    id: '5',
    restaurantId: 'rest_2',
    name: 'Margherita Pizza',
    description: 'Fresh mozzarella, basil, and tomato sauce on our hand-tossed sourdough crust.',
    price: 22.00,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80',
    isAvailable: true
  },
  {
    id: '6',
    restaurantId: 'rest_2',
    name: 'Spaghetti Carbonara',
    description: 'Classic Roman pasta with eggs, cheese, pancetta, and black pepper.',
    price: 24.50,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80',
    isAvailable: true
  },
  {
    id: '7',
    restaurantId: 'rest_2',
    name: 'Tiramisu',
    description: 'Classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cream.',
    price: 12.00,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80',
    isAvailable: true
  },
  // Brisbane Sushi Bar (rest_3)
  {
    id: '8',
    restaurantId: 'rest_3',
    name: 'Dragon Roll',
    description: 'Shrimp tempura and cucumber topped with avocado and eel sauce.',
    price: 18.50,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd43ca?w=800&q=80',
    isAvailable: true
  },
  {
    id: '9',
    restaurantId: 'rest_3',
    name: 'Miso Soup',
    description: 'Traditional Japanese soup with tofu, seaweed, and green onions.',
    price: 6.50,
    category: 'Starters',
    image: 'https://images.unsplash.com/photo-1547592166-23acbe3a624b?w=800&q=80',
    isAvailable: true
  },
  // Perth Curry House (rest_4)
  {
    id: '10',
    restaurantId: 'rest_4',
    name: 'Butter Chicken',
    description: 'Tender chicken cooked in a rich tomato and butter gravy.',
    price: 24.00,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80',
    isAvailable: true
  },
  {
    id: '11',
    restaurantId: 'rest_4',
    name: 'Garlic Naan',
    description: 'Oven-baked flatbread topped with garlic and cilantro.',
    price: 5.50,
    category: 'Sides',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80',
    isAvailable: true
  },
  // Adelaide Steakhouse (rest_5)
  {
    id: '12',
    restaurantId: 'rest_5',
    name: 'Wagyu Ribeye',
    description: 'Premium Australian Wagyu beef, grilled to perfection. Served with roasted vegetables.',
    price: 45.00,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
    isAvailable: true
  },
  {
    id: '13',
    restaurantId: 'rest_5',
    name: 'Lamb Cutlets',
    description: 'Tender lamb cutlets with mint sauce and seasonal vegetables.',
    price: 32.00,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
    isAvailable: true
  },
  // Hobart Seafood Grill (rest_6)
  {
    id: '14',
    restaurantId: 'rest_6',
    name: 'Tasmanian Salmon',
    description: 'Fresh Tasmanian salmon, pan-seared with lemon butter sauce and seasonal vegetables.',
    price: 28.50,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    isAvailable: true
  },
  {
    id: '15',
    restaurantId: 'rest_6',
    name: 'Oysters Natural',
    description: 'Fresh Tasmanian oysters served natural with lemon and mignonette.',
    price: 22.00,
    category: 'Starters',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    isAvailable: true
  }
]

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

  useEffect(() => {
    const foundRestaurant = MOCK_RESTAURANTS.find((r) => r.id === restaurantId)
    if (foundRestaurant) {
      setRestaurant(foundRestaurant)
    }
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

  if (!restaurantId || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Restaurant Not Found
        </h2>
        <p className="text-gray-500 mb-8">
          The restaurant you're looking for doesn't exist or is currently unavailable.
        </p>
        <Button onClick={() => router.push('/')}>Back to Restaurants</Button>
      </div>
    )
  }

  // Filter items for this restaurant
  const restaurantItems = MOCK_MENU.filter((item) => item.restaurantId === restaurantId)
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

