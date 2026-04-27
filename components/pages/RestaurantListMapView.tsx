'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, X } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Restaurant } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Select } from '../ui/Select'

const OSM_FALLBACK_STYLE: mapboxgl.Style = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
}
const DEFAULT_MAPBOX_PUBLIC_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export type FilteredRestaurantForMap = Restaurant & { distance?: number }

export interface RestaurantListMapViewProps {
  filteredRestaurants: FilteredRestaurantForMap[]
  userLocation: { lat: number; lng: number } | null
  locationEnabled: boolean
  locationError: string | null
  isGettingLocation: boolean
  maxDistance: number
  setMaxDistance: (n: number) => void
  setLocationError: (s: string | null) => void
  enableLocation: () => void
  disableLocation: () => void
  selectedRestaurant: Restaurant | null
  setSelectedRestaurant: (r: Restaurant | null) => void
}

export function RestaurantListMapView(props: RestaurantListMapViewProps) {
  const {
    filteredRestaurants,
    userLocation,
    locationEnabled,
    locationError,
    isGettingLocation,
    maxDistance,
    setMaxDistance,
    setLocationError,
    enableLocation,
    disableLocation,
    selectedRestaurant,
    setSelectedRestaurant,
  } = props

  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const usedFallbackStyleRef = useRef(false)

  const mapboxToken = (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined)?.trim() || DEFAULT_MAPBOX_PUBLIC_TOKEN

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = mapboxToken

    const center: [number, number] =
      userLocation && locationEnabled ? [userLocation.lng, userLocation.lat] : [133.7751, -25.2744]
    const zoom = userLocation && locationEnabled ? 10 : 4

    const container = mapContainer.current
    map.current = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
      attributionControl: true,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    const handleMapError = (event: mapboxgl.ErrorEvent) => {
      if (usedFallbackStyleRef.current || !map.current) return
      const message = event.error?.message ?? ''
      if (message.includes('401') || message.includes('403') || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('access token') || message.toLowerCase().includes('style')) {
        usedFallbackStyleRef.current = true
        map.current.setStyle(OSM_FALLBACK_STYLE)
      }
    }
    map.current.on('error', handleMapError)
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right',
    )
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    const onLoad = /* map load */ () => {
      map.current?.resize()
      requestAnimationFrame(() => map.current?.resize())
    }
    map.current.on('load', onLoad)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.current?.resize()
      })
      resizeObserver.observe(container)
    }

    return () => {
      map.current?.off('error', handleMapError)
      map.current?.off('load', onLoad)
      resizeObserver?.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!map.current) return

    const run = () => {
      if (!map.current || !map.current.isStyleLoaded()) return

      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }

      if (userLocation && locationEnabled) {
        map.current.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: 11,
          duration: 1500,
        })

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
      } else {
        map.current.flyTo({
          center: [133.7751, -25.2744],
          zoom: 4,
          duration: 1500,
        })
      }
    }

    if (map.current.isStyleLoaded()) {
      run()
    } else {
      map.current.once('load', run)
    }

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
    }
  }, [userLocation, locationEnabled])

  useEffect(() => {
    const mapInstance = map.current
    if (!mapInstance) return

    let cancelled = false

    const syncMarkersAndRadius = () => {
      if (cancelled || !map.current || !map.current.isStyleLoaded()) return

      const m = map.current

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      filteredRestaurants.forEach((restaurant) => {
        if (!restaurant.coordinates) return

        const el = document.createElement('div')
        el.className = 'custom-marker'
        el.style.width = '40px'
        el.style.height = '40px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = '#f97316'
        el.style.border = '3px solid white'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
        el.style.cursor = 'pointer'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.innerHTML = '<span style="color: white; font-weight: bold; font-size: 16px;">📍</span>'

        const priceDots =
          restaurant.priceRange === 'budget'
            ? '$'
            : restaurant.priceRange === 'moderate'
              ? '$$'
              : restaurant.priceRange === 'expensive'
                ? '$$$'
                : '$$$$'

        const distHtml = restaurant.distance
          ? '<p class="text-xs text-orange-600 font-medium">📍 ' + restaurant.distance.toFixed(1) + ' km away</p>'
          : ''

        const priceHtml = restaurant.priceRange
          ? '<span class="text-xs text-orange-600">' + priceDots + '</span>'
          : ''

        const popupHtml =
          '<div class="p-2"><h3 class="font-bold text-gray-900 text-sm mb-1">' +
          restaurant.name +
          '</h3><p class="text-xs text-gray-600 mb-1">' +
          restaurant.location +
          '</p>' +
          distHtml +
          '<div class="flex items-center gap-2 mt-2"><span class="text-xs text-gray-600">⭐ ' +
          restaurant.rating +
          '</span>' +
          priceHtml +
          '</div><button onclick="window.location.href=\'/restaurant/' +
          restaurant.id +
          '\'" class="mt-2 w-full bg-orange-600 text-white text-xs px-3 py-1 rounded hover:bg-orange-700 transition-colors">View Menu</button></div>'

        const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: false }).setHTML(popupHtml)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([restaurant.coordinates.lng, restaurant.coordinates.lat])
          .setPopup(popup)
          .addTo(m)

        ;(marker as mapboxgl.Marker & { restaurantId: string }).restaurantId = restaurant.id

        el.addEventListener('click', () => {
          router.push('/restaurant/' + restaurant.id)
        })

        markersRef.current.push(marker)
      })

      if (userLocation && locationEnabled && m) {
        const existingSource = m.getSource('radius-circle')
        if (existingSource) {
          if (m.getLayer('radius-circle-fill')) m.removeLayer('radius-circle-fill')
          if (m.getLayer('radius-circle-stroke')) m.removeLayer('radius-circle-stroke')
          m.removeSource('radius-circle')
        }

        const createCircle = (center: [number, number], radiusInMeters: number) => {
          const points = 64
          const circle: [number, number][] = []
          for (let i = 0; i <= points; i++) {
            const angle = (i * 360) / points
            const dx = radiusInMeters * Math.cos((angle * Math.PI) / 180)
            const dy = radiusInMeters * Math.sin((angle * Math.PI) / 180)
            const latOffset = dy / 111320
            const lngOffset = dx / (111320 * Math.cos((center[1] * Math.PI) / 180))
            circle.push([center[0] + lngOffset, center[1] + latOffset])
          }
          const closed = [...circle, circle[0]!]
          return { type: 'Polygon' as const, coordinates: [closed] }
        }

        const circle = createCircle([userLocation.lng, userLocation.lat], maxDistance * 1000)

        m.addSource('radius-circle', {
          type: 'geojson',
          data: { type: 'Feature', geometry: circle, properties: {} },
        })

        m.addLayer({
          id: 'radius-circle-fill',
          type: 'fill',
          source: 'radius-circle',
          paint: { 'fill-color': '#f97316', 'fill-opacity': 0.1 },
        })

        m.addLayer({
          id: 'radius-circle-stroke',
          type: 'line',
          source: 'radius-circle',
          paint: { 'line-color': '#f97316', 'line-width': 2, 'line-opacity': 0.5 },
        })
      } else if (m) {
        if (m.getLayer('radius-circle-fill')) m.removeLayer('radius-circle-fill')
        if (m.getLayer('radius-circle-stroke')) m.removeLayer('radius-circle-stroke')
        const existingSource = m.getSource('radius-circle')
        if (existingSource) m.removeSource('radius-circle')
      }

      if (!locationEnabled && filteredRestaurants.length > 0 && filteredRestaurants.some((r) => r.coordinates)) {
        const bounds = new mapboxgl.LngLatBounds()
        filteredRestaurants.forEach((restaurant) => {
          if (restaurant.coordinates) {
            bounds.extend([restaurant.coordinates.lng, restaurant.coordinates.lat])
          }
        })
        m.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 12,
        })
      }

      requestAnimationFrame(() => map.current?.resize())
    }

    const runSync = () => {
      if (cancelled) return
      requestAnimationFrame(() => {
        if (!cancelled) syncMarkersAndRadius()
      })
    }

    if (mapInstance.isStyleLoaded()) {
      runSync()
    } else {
      mapInstance.on('load', runSync)
    }

    return () => {
      cancelled = true
      mapInstance.off('load', runSync)
    }
  }, [filteredRestaurants, router, userLocation, locationEnabled, maxDistance])

  const withCoords = filteredRestaurants.filter((r) => r.coordinates)

  return (
    <div className="relative h-full w-full min-h-[400px]">
      <div ref={mapContainer} className="h-full w-full min-h-[400px]" />

      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs z-10 max-h-[50vh] overflow-hidden flex flex-col">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-600" />
          Restaurants ({withCoords.length})
        </h3>
        <div className="space-y-2 overflow-y-auto flex-1">
          {withCoords.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => {
                setSelectedRestaurant(restaurant)
                if (map.current && restaurant.coordinates) {
                  map.current.flyTo({
                    center: [restaurant.coordinates.lng, restaurant.coordinates.lat],
                    zoom: 15,
                    duration: 1500,
                    essential: true,
                  })
                  setTimeout(() => {
                    const marker = markersRef.current.find(
                      (mm) => (mm as mapboxgl.Marker & { restaurantId: string }).restaurantId === restaurant.id,
                    )
                    if (marker) {
                      markersRef.current.forEach((m) => {
                        if (m !== marker && m.getPopup()?.isOpen()) m.getPopup()?.remove()
                      })
                      marker.togglePopup()
                    }
                  }, 1600)
                }
              }}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all group',
                selectedRestaurant?.id === restaurant.id
                  ? 'bg-orange-100 border-orange-500 shadow-md'
                  : 'bg-white border-gray-200 hover:bg-orange-50 hover:border-orange-500',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-orange-600">{restaurant.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{restaurant.location}</p>
                  {restaurant.distance && (
                    <p className="text-xs text-orange-600 font-medium mt-1">📍 {restaurant.distance.toFixed(1)} km away</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="info" className="text-xs">
                      ⭐ {restaurant.rating}
                    </Badge>
                    {restaurant.priceRange && (
                      <Badge variant="warning" className="text-xs">
                        {'$'.repeat(
                          restaurant.priceRange === 'budget' ? 1 : restaurant.priceRange === 'moderate' ? 2 : restaurant.priceRange === 'expensive' ? 3 : 4,
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {withCoords.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No restaurants found</p>}
      </div>

      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs z-10 mt-[calc(50vh+1rem)]">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className={cn('w-5 h-5 mt-0.5', locationEnabled ? 'text-orange-600' : 'text-gray-400')} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locationEnabled ? 'Nearby Mode' : 'Find Near Me'}</p>
              {!locationError && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {locationEnabled ? `Within ${maxDistance}km` : 'Enable location to find restaurants near you'}
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
                    { value: '100', label: '100km' },
                  ]}
                  className="flex-1 text-xs"
                />
              )}
              {locationEnabled ? (
                <Button variant="secondary" size="sm" onClick={disableLocation} className="flex items-center gap-1 text-xs">
                  <X className="w-3 h-3" />
                  Off
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={enableLocation} disabled={isGettingLocation} className="flex items-center gap-1 text-xs">
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
