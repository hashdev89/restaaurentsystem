'use client'

import { MapPin, Phone, Star, StarHalf, Users, Calendar } from 'lucide-react'
import { Restaurant } from '@/types'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import Link from 'next/link'

interface RestaurantCardProps {
  restaurant: Restaurant
  onClick: () => void
  showBooking?: boolean
}

export function RestaurantCard({ restaurant, onClick, showBooking = true }: RestaurantCardProps) {
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

  return (
    <div onClick={onClick} className="group cursor-pointer transition-all duration-200 hover:-translate-y-1">
      <Card className="h-full overflow-hidden border-transparent hover:border-orange-200 hover:shadow-lg transition-all duration-200">
        <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700 shadow-sm flex items-center">
            <MapPin className="w-3 h-3 mr-1 text-orange-500" />
            {restaurant.location}
          </div>
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
              {restaurant.name}
            </h3>
          </div>

          <div className="flex items-center mb-3 space-x-1">
            <div className="flex">{renderStars(restaurant.rating)}</div>
            <span className="text-sm font-bold text-gray-900 ml-1">
              {restaurant.rating}
            </span>
            <span className="text-sm text-gray-500">
              ({restaurant.reviewCount} reviews)
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {restaurant.description}
          </p>

          {restaurant.serviceTypes && restaurant.serviceTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {restaurant.serviceTypes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                >
                  {t === 'dine-in' ? 'Dine-in' : t === 'delivery' ? 'Delivery' : 'Takeaway'}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="mr-2 h-4 w-4 text-gray-400" />
              <span className="truncate">{restaurant.address}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="mr-2 h-4 w-4 text-gray-400" />
              <span>{restaurant.phone}</span>
            </div>
            {(restaurant.availableSeats !== undefined || restaurant.totalSeats !== undefined) && (
              <div className="flex items-center text-sm text-gray-500">
                <Users className="mr-2 h-4 w-4 text-gray-400" />
                <span>
                  {restaurant.availableSeats !== undefined
                    ? `${restaurant.availableSeats} of ${restaurant.totalSeats || 'N/A'} seats available`
                    : `${restaurant.totalSeats} total seats`}
                </span>
              </div>
            )}
          </div>

          {showBooking && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link href={`/restaurant/${restaurant.id}/booking`} onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" className="w-full" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book a Table
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

