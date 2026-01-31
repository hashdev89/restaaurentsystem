'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table, Restaurant } from '@/types'

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

function mapApiTable(row: { id: string; restaurant_id: string; table_number: string; capacity: number; status: string; location: string | null }): Table {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableNumber: row.table_number,
    capacity: row.capacity,
    status: row.status as Table['status'],
    location: row.location ?? undefined,
  }
}

// Generate time slots
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 11; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function SeatBooking() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params?.restaurantId as string
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [numberOfGuests, setNumberOfGuests] = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialRequests: ''
  })

  useEffect(() => {
    if (!restaurantId) return
    let cancelled = false
    async function load() {
      try {
        const [resRes, resTables] = await Promise.all([
          fetch('/api/restaurants'),
          fetch(`/api/tables?restaurantId=${encodeURIComponent(restaurantId)}`),
        ])
        if (cancelled) return
        if (resRes.ok) {
          const data = await resRes.json()
          const found = (data.restaurants ?? []).find((r: { id: string }) => r.id === restaurantId)
          if (found) setRestaurant(mapApiRestaurant(found))
        }
        if (resTables.ok) {
          const data = await resTables.json()
          setTables((data.tables ?? []).map(mapApiTable))
        }
      } catch {
        if (!cancelled) setTables([])
      }
    }
    load()
    const today = new Date()
    setSelectedDate(today.toISOString().split('T')[0])
    return () => { cancelled = true }
  }, [restaurantId])

  const availableTables = tables.filter((table) => table.status === 'available')
  const reservedTables = tables.filter((table) => table.status === 'reserved')
  const occupiedTables = tables.filter((table) => table.status === 'occupied')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'maintenance':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4" />
      case 'reserved':
        return <AlertCircle className="w-4 h-4" />
      case 'occupied':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTable || !selectedDate || !selectedTime) {
      alert('Please select a table, date, and time')
      return
    }

    if (numberOfGuests > selectedTable.capacity) {
      alert(`This table can only accommodate ${selectedTable.capacity} guests`)
      return
    }

    setIsSubmitting(true)

    try {
      // Create booking via API
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableId: selectedTable.id,
          tableNumber: selectedTable.tableNumber,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          bookingDate: selectedDate,
          bookingTime: selectedTime,
          numberOfGuests,
          specialRequests: formData.specialRequests
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      setShowSuccess(true)
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
        setSelectedTable(null)
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          specialRequests: ''
        })
      }, 3000)
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h2>
        <Button onClick={() => router.push('/')}>Back to Restaurants</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href={`/restaurant/${restaurantId}`} className="text-gray-500 hover:text-gray-700 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Book a Table</h1>
            <p className="text-gray-600 mt-1">{restaurant.name}</p>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">Booking confirmed! We'll see you soon.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Table Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Availability Summary */}
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Seat Availability</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{availableTables.length}</div>
                  <div className="text-sm text-green-700 mt-1">Available</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{reservedTables.length}</div>
                  <div className="text-sm text-yellow-700 mt-1">Reserved</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{occupiedTables.length}</div>
                  <div className="text-sm text-red-700 mt-1">Occupied</div>
                </div>
              </div>
            </Card>

            {/* Tables Grid */}
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select a Table</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tables.map((table) => {
                  const isSelected = selectedTable?.id === table.id
                  const isAvailable = table.status === 'available'
                  return (
                    <button
                      key={table.id}
                      onClick={() => isAvailable && setSelectedTable(table)}
                      disabled={!isAvailable}
                      className={`
                        p-4 rounded-lg border-2 transition-all
                        ${isSelected
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                          : isAvailable
                          ? 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                          : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">Table {table.tableNumber}</span>
                        <Badge className={getStatusColor(table.status)}>
                          {getStatusIcon(table.status)}
                          <span className="ml-1 capitalize">{table.status}</span>
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{table.capacity} seats</span>
                        </div>
                        {table.location && (
                          <div className="text-xs text-gray-500">{table.location}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Number of Guests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Number of Guests
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedTable?.capacity || 10}
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 1)}
                    required
                  />
                  {selectedTable && (
                    <p className="text-xs text-gray-500 mt-1">
                      Table capacity: {selectedTable.capacity} guests
                    </p>
                  )}
                </div>

                {/* Customer Name */}
                <Input
                  label="Full Name"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  placeholder="John Doe"
                />

                {/* Customer Email */}
                <Input
                  label="Email"
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  required
                  placeholder="john@example.com"
                />

                {/* Customer Phone */}
                <Input
                  label="Phone"
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  required
                  placeholder="0412 345 678"
                />

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Any special dietary requirements or requests..."
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!selectedTable || isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                </Button>

                {selectedTable && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-blue-900">Selected:</p>
                    <p className="text-blue-700">
                      Table {selectedTable.tableNumber} ({selectedTable.capacity} seats)
                    </p>
                  </div>
                )}
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

