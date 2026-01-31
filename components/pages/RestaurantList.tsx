'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UtensilsCrossed, MapPin, Filter, X } from 'lucide-react'
import { Restaurant } from '@/types'
import { RestaurantCard } from '../RestaurantCard'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '@/lib/utils'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

/** Map API restaurant row to Restaurant type (API returns latitude/longitude for map) */
function mapApiRestaurant(row: { id: string; name: string; description: string | null; address: string; phone: string; image: string | null; location: string | null; latitude?: number | null; longitude?: number | null; is_active: boolean; rating: number; review_count: number }): Restaurant {
  const lat = row.latitude != null ? Number(row.latitude) : undefined
  const lng = row.longitude != null ? Number(row.longitude) : undefined
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    address: row.address,
    phone: row.phone,
    image: row.image ?? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    isActive: row.is_active,
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    location: row.location ?? '',
    coordinates: lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng) ? { lat, lng } : undefined,
  }
}

const LOCATIONS = ['All Locations', 'The Rocks, Sydney', 'Melbourne CBD', 'Brisbane CBD', 'Perth CBD', 'Adelaide CBD', 'Hobart']
const PRICE_RANGES = [
  { value: 'all', label: 'All Prices' },
  { value: 'budget', label: 'Budget ($)' },
  { value: 'moderate', label: 'Moderate ($$)' },
  { value: 'expensive', label: 'Expensive ($$$)' },
  { value: 'premium', label: 'Premium ($$$$)' }
]
const CUISINE_TYPES = ['All Cuisines', 'Australian', 'Italian', 'Japanese', 'Indian', 'Seafood', 'Steakhouse', 'Burgers', 'Pizza', 'Pasta', 'Curry', 'Vegetarian', 'Fine Dining']
const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'distance', label: 'Distance' }
]

export function RestaurantList() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('All Locations')
  const [selectedPriceRange, setSelectedPriceRange] = useState('all')
  const [selectedCuisine, setSelectedCuisine] = useState('All Cuisines')
  const [sortBy, setSortBy] = useState('popularity')
  const [activeTab, setActiveTab] = useState('list')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [maxDistance, setMaxDistance] = useState<number>(25) // Default 25km radius
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [, setRestaurantsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/restaurants')
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        const list = (data.restaurants ?? []).map(mapApiRestaurant)
        if (!cancelled) setRestaurants(list)
      } catch {
        if (!cancelled) setRestaurants([])
      } finally {
        if (!cancelled) setRestaurantsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Enable location and get user's current position
  const enableLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLocationEnabled(true)
        setIsGettingLocation(false)
        // Auto-sort by distance when location is enabled
        setSortBy('distance')
      },
      (error) => {
        setIsGettingLocation(false)
        let errorMessage = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        setLocationError(errorMessage)
        setLocationEnabled(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Disable location
  const disableLocation = () => {
    setLocationEnabled(false)
    setUserLocation(null)
    setLocationError(null)
    if (sortBy === 'distance') {
      setSortBy('popularity')
    }
  }

  // Calculate distance
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const filteredRestaurants = useMemo(() => {
    let filtered: (Restaurant & { distance?: number })[] = restaurants.filter((restaurant) => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (restaurant.cuisineTypes ?? []).some(cuisine => cuisine.toLowerCase().includes(searchQuery.toLowerCase()))
      
    const matchesLocation =
      selectedLocation === 'All Locations' || restaurant.location === selectedLocation
      
      const matchesPriceRange =
        selectedPriceRange === 'all' || (restaurant.priceRange ?? 'moderate') === selectedPriceRange
      
      const matchesCuisine =
        selectedCuisine === 'All Cuisines' || (restaurant.cuisineTypes ?? []).includes(selectedCuisine)
      
      return matchesSearch && matchesLocation && matchesPriceRange && matchesCuisine
    })

    // Add distance if user location available
    if (userLocation) {
      filtered = filtered.map(restaurant => ({
        ...restaurant,
        distance: restaurant.coordinates
          ? calculateDistance(
              userLocation.lat,
              userLocation.lng,
              restaurant.coordinates.lat,
              restaurant.coordinates.lng
            )
          : undefined
      })) as (Restaurant & { distance?: number })[]

      // Filter by max distance if location is enabled
      if (locationEnabled) {
        filtered = filtered.filter(restaurant => 
          restaurant.distance !== undefined && restaurant.distance <= maxDistance
        )
      }
    }

    // Sort
    filtered.sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return b.reviewCount - a.reviewCount
      case 'rating':
        return b.rating - a.rating
      case 'name':
        return a.name.localeCompare(b.name)
        case 'distance':
          if (userLocation && a.distance && b.distance) {
            return a.distance - b.distance
          }
          return 0
      default:
        return 0
    }
  })

    return filtered
  }, [restaurants, searchQuery, selectedLocation, selectedPriceRange, selectedCuisine, sortBy, userLocation, locationEnabled, maxDistance])

  // Map component with interactive Mapbox GL JS
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const MapView = () => {
    const mapboxToken = (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined) || 'pk.eyJ1IjoiaGFzaGRldjg5IiwiYSI6ImNtZWt3dTJ3cTBhc2Yya29jY2FpZHluZ20ifQ.ID9_-ktKbovDhmeQZL8_1Q'
    
    useEffect(() => {
      if (!mapContainer.current || map.current) return

      // Set Mapbox access token
      mapboxgl.accessToken = mapboxToken

      // Initialize map - center on user location if available, otherwise Australia
      const center = userLocation && locationEnabled 
        ? [userLocation.lng, userLocation.lat] as [number, number]
        : [133.7751, -25.2744] as [number, number]
      const zoom = userLocation && locationEnabled ? 10 : 4

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
        attributionControl: true
      })

      // Add navigation controls (zoom, rotation, fullscreen)
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      
      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      )

      // Add scale control
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

      return () => {
        // Cleanup markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mapboxToken is from env; init once
    }, [])

    // User location marker ref
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null)

    // Update map center and add user marker when location is enabled
    useEffect(() => {
      if (!map.current) return

      // Remove existing user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }

      if (userLocation && locationEnabled) {
        // Center map on user location
        map.current.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: 11,
          duration: 1500
        })

        // Add user location marker (green)
        const userEl = document.createElement('div')
        userEl.className = 'user-location-marker'
        userEl.style.width = '20px'
        userEl.style.height = '20px'
        userEl.style.borderRadius = '50%'
        userEl.style.backgroundColor = '#10b981'
        userEl.style.border = '3px solid white'
        userEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'

        userMarkerRef.current = new mapboxgl.Marker(userEl)
          .setLngLat([userLocation.lng, userLocation.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div class="p-2"><strong class="text-green-600">📍 Your Location</strong></div>'))
          .addTo(map.current)
      } else if (map.current) {
        // Center on Australia if location disabled
        map.current.flyTo({
          center: [133.7751, -25.2744],
          zoom: 4,
          duration: 1500
        })
      }

      return () => {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove()
          userMarkerRef.current = null
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- userLocation, locationEnabled from state; effect updates map when they change
    }, [userLocation, locationEnabled])

    // Update markers when filtered restaurants change
    useEffect(() => {
      const mapInstance = map.current
      if (!mapInstance) return

      // Remove existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Add markers for filtered restaurants
      filteredRestaurants.forEach((restaurant) => {
        if (!restaurant.coordinates) return

        // Create custom marker element
        const el = document.createElement('div')
        el.className = 'custom-marker'
        el.style.width = '40px'
        el.style.height = '40px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = '#f97316' // Orange color
        el.style.border = '3px solid white'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
        el.style.cursor = 'pointer'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.innerHTML = '<span style="color: white; font-weight: bold; font-size: 16px;">📍</span>'

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: false })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-gray-900 text-sm mb-1">${restaurant.name}</h3>
              <p class="text-xs text-gray-600 mb-1">${restaurant.location}</p>
              ${restaurant.distance ? `<p class="text-xs text-orange-600 font-medium">📍 ${restaurant.distance.toFixed(1)} km away</p>` : ''}
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xs text-gray-600">⭐ ${restaurant.rating}</span>
                ${restaurant.priceRange ? `<span class="text-xs text-orange-600">${'$'.repeat(
                  restaurant.priceRange === 'budget' ? 1 :
                  restaurant.priceRange === 'moderate' ? 2 :
                  restaurant.priceRange === 'expensive' ? 3 : 4
                )}</span>` : ''}
              </div>
              <button 
                onclick="window.location.href='/restaurant/${restaurant.id}'"
                class="mt-2 w-full bg-orange-600 text-white text-xs px-3 py-1 rounded hover:bg-orange-700 transition-colors"
              >
                View Menu
              </button>
            </div>
          `)

        // Create marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([restaurant.coordinates.lng, restaurant.coordinates.lat])
          .setPopup(popup)
          .addTo(mapInstance)

        // Store restaurant ID with marker for easy lookup
        ;(marker as mapboxgl.Marker & { restaurantId: string }).restaurantId = restaurant.id

        // Add click handler
        el.addEventListener('click', () => {
          router.push(`/restaurant/${restaurant.id}`)
        })

        markersRef.current.push(marker)
      })

      // Add radius circle if location is enabled
      if (userLocation && locationEnabled && mapInstance) {
        // Remove existing radius circle if any
        const existingSource = mapInstance.getSource('radius-circle')
        if (existingSource) {
          if (mapInstance.getLayer('radius-circle-fill')) {
            mapInstance.removeLayer('radius-circle-fill')
          }
          if (mapInstance.getLayer('radius-circle-stroke')) {
            mapInstance.removeLayer('radius-circle-stroke')
          }
          mapInstance.removeSource('radius-circle')
        }

        // Helper function to create circle geometry
        const createCircle = (center: [number, number], radiusInMeters: number) => {
          const points = 64
          const circle = []
          for (let i = 0; i <= points; i++) {
            const angle = (i * 360) / points
            const dx = radiusInMeters * Math.cos((angle * Math.PI) / 180)
            const dy = radiusInMeters * Math.sin((angle * Math.PI) / 180)
            
            // Convert meters to degrees (approximate)
            const latOffset = dy / 111320
            const lngOffset = dx / (111320 * Math.cos((center[1] * Math.PI) / 180))
            
            circle.push([center[0] + lngOffset, center[1] + latOffset])
          }
          return {
            type: 'Polygon' as const,
            coordinates: [[...circle, circle[0]]]
          }
        }

        // Create circle geometry
        const circle = createCircle([userLocation.lng, userLocation.lat], maxDistance * 1000) // Convert km to meters

        mapInstance.addSource('radius-circle', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: circle,
            properties: {}
          }
        })

        mapInstance.addLayer({
          id: 'radius-circle-fill',
          type: 'fill',
          source: 'radius-circle',
          paint: {
            'fill-color': '#f97316',
            'fill-opacity': 0.1
          }
        })

        mapInstance.addLayer({
          id: 'radius-circle-stroke',
          type: 'line',
          source: 'radius-circle',
          paint: {
            'line-color': '#f97316',
            'line-width': 2,
            'line-opacity': 0.5
          }
        })
      } else {
        // Remove radius circle if location disabled
        if (mapInstance) {
          if (mapInstance.getLayer('radius-circle-fill')) {
            mapInstance.removeLayer('radius-circle-fill')
          }
          if (mapInstance.getLayer('radius-circle-stroke')) {
            mapInstance.removeLayer('radius-circle-stroke')
          }
          const existingSource = mapInstance.getSource('radius-circle')
          if (existingSource) {
            mapInstance.removeSource('radius-circle')
          }
        }
      }

      // Fit map to show all markers if there are any (but not if location is enabled - keep centered on user)
      if (!locationEnabled && filteredRestaurants.length > 0 && filteredRestaurants.some(r => r.coordinates)) {
        const bounds = new mapboxgl.LngLatBounds()
        filteredRestaurants.forEach(restaurant => {
          if (restaurant.coordinates) {
            bounds.extend([restaurant.coordinates.lng, restaurant.coordinates.lat])
          }
        })
        mapInstance.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 12
        })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- deps used for markers and radius; stable refs/state
    }, [filteredRestaurants, router, userLocation, locationEnabled, maxDistance])

    return (
      <div className="relative h-full w-full">
        <div ref={mapContainer} className="h-full w-full" />
        
        {/* Restaurant List Overlay */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs z-10 max-h-[50vh] overflow-hidden flex flex-col">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            Restaurants ({filteredRestaurants.filter(r => r.coordinates).length})
          </h3>
          <div className="space-y-2 overflow-y-auto flex-1">
            {filteredRestaurants.filter(r => r.coordinates).map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => {
                  setSelectedRestaurant(restaurant)
                  
                  // Fly to restaurant on map with zoom
                  if (map.current && restaurant.coordinates) {
                    map.current.flyTo({
                      center: [restaurant.coordinates.lng, restaurant.coordinates.lat],
                      zoom: 15, // Zoom in closer for better view
                      duration: 1500,
                      essential: true
                    })
                    
                    // Wait for flyTo to complete, then open popup
                    setTimeout(() => {
                      // Find marker by restaurant ID (more reliable)
                      const marker = markersRef.current.find(m => 
                        (m as mapboxgl.Marker & { restaurantId: string }).restaurantId === restaurant.id
                      )
                      
                      if (marker) {
                        // Close all other popups first
                        markersRef.current.forEach(m => {
                          if (m !== marker && m.getPopup()?.isOpen()) {
                            m.getPopup()?.remove()
                          }
                        })
                        // Open this marker's popup
                        marker.togglePopup()
                      }
                    }, 1600) // Slightly after flyTo completes
                  }
                }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all group",
                  selectedRestaurant?.id === restaurant.id
                    ? "bg-orange-100 border-orange-500 shadow-md"
                    : "bg-white border-gray-200 hover:bg-orange-50 hover:border-orange-500"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-orange-600">
                      {restaurant.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{restaurant.location}</p>
                    {restaurant.distance && (
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        📍 {restaurant.distance.toFixed(1)} km away
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="info" className="text-xs">
                        ⭐ {restaurant.rating}
                      </Badge>
                      {restaurant.priceRange && (
                        <Badge variant="warning" className="text-xs">
                          {'$'.repeat(
                            restaurant.priceRange === 'budget' ? 1 :
                            restaurant.priceRange === 'moderate' ? 2 :
                            restaurant.priceRange === 'expensive' ? 3 : 4
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filteredRestaurants.filter(r => r.coordinates).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No restaurants found
            </p>
          )}
        </div>

        {/* Location Toggle - Only in Map View - Positioned on left below restaurant list */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs z-10 mt-[calc(50vh+1rem)]">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className={cn(
                "w-5 h-5 mt-0.5",
                locationEnabled ? "text-orange-600" : "text-gray-400"
              )} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {locationEnabled ? 'Nearby Mode' : 'Find Near Me'}
                </p>
                {!locationError && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {locationEnabled 
                      ? `Within ${maxDistance}km`
                      : 'Enable location to find restaurants near you'
                    }
                  </p>
                )}
                {locationError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-700 font-medium mb-1">Location Error</p>
                    <p className="text-xs text-red-600">{locationError}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setLocationError(null)
                        enableLocation()
                      }}
                      className="mt-2 w-full text-xs h-7"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {!locationError && (
              <div className="flex items-center gap-2">
                {locationEnabled && (
                  <Select
                    value={maxDistance.toString()}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    options={[
                      { value: '5', label: '5km' },
                      { value: '10', label: '10km' },
                      { value: '25', label: '25km' },
                      { value: '50', label: '50km' },
                      { value: '100', label: '100km' }
                    ]}
                    className="flex-1 text-xs"
                  />
                )}
                {locationEnabled ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={disableLocation}
                    className="flex items-center gap-1 text-xs"
                  >
                    <X className="w-3 h-3" />
                    Off
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={enableLocation}
                    disabled={isGettingLocation}
                    className="flex items-center gap-1 text-xs"
                  >
                    <MapPin className="w-3 h-3" />
                    {isGettingLocation ? 'Locating...' : 'Enable'}
                  </Button>
                )}
              </div>
            )}
            {locationEnabled && userLocation && !locationError && (
              <div className="pt-2 border-t border-gray-200 text-xs text-green-700">
                ✓ {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} nearby
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Choose Your Restaurant
          </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Discover the best Australian restaurants and get it delivered to your table or doorstep.
          </p>
          </div>

            {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search restaurants, cuisine types..."
                className="pl-10 h-12 text-lg shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs for Map/List View */}
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="list">
                    <UtensilsCrossed className="w-4 h-4 mr-2" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <MapPin className="w-4 h-4 mr-2" />
                    Map View
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="secondary"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {(selectedLocation !== 'All Locations' || selectedPriceRange !== 'all' || selectedCuisine !== 'All Cuisines') && (
                    <Badge variant="info" className="ml-1">
                      {[selectedLocation !== 'All Locations', selectedPriceRange !== 'all', selectedCuisine !== 'All Cuisines'].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
            </div>

              {/* Enhanced Filters */}
              {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                    label="Location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                options={LOCATIONS.map((loc) => ({
                  value: loc,
                  label: loc
                }))}
              />
                  <Select
                    label="Price Range"
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    options={PRICE_RANGES}
                  />
                  <Select
                    label="Cuisine Type"
                    value={selectedCuisine}
                    onChange={(e) => setSelectedCuisine(e.target.value)}
                    options={CUISINE_TYPES.map((cuisine) => ({
                      value: cuisine,
                      label: cuisine
                    }))}
                  />
              <Select
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={SORT_OPTIONS}
              />
                  <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedLocation('All Locations')
                        setSelectedPriceRange('all')
                        setSelectedCuisine('All Cuisines')
                        setSortBy('popularity')
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </Button>
                    <div className="text-sm text-gray-600">
                      {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} found
                    </div>
                  </div>
            </div>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="list" className="mt-0">
        {filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="relative">
              <RestaurantCard
                restaurant={restaurant}
                onClick={() => router.push(`/restaurant/${restaurant.id}`)}
              />
                    {restaurant.distance && (
                      <Badge variant="info" className="absolute top-2 right-2">
                        {restaurant.distance.toFixed(1)} km
                      </Badge>
                    )}
                    {restaurant.priceRange && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="warning">
                          {'$'.repeat(
                            restaurant.priceRange === 'budget' ? 1 :
                            restaurant.priceRange === 'moderate' ? 2 :
                            restaurant.priceRange === 'expensive' ? 3 : 4
                          )}
                        </Badge>
                      </div>
                    )}
                  </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <UtensilsCrossed className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No restaurants found
            </h3>
            <p className="mt-2 text-gray-500">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '70vh', minHeight: '600px' }}>
              <MapView />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
