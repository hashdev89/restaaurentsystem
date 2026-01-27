import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Create a new seat booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      restaurantId,
      tableId,
      tableNumber,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
      bookingTime,
      numberOfGuests,
      specialRequests
    } = body

    // Insert booking into Supabase
    const { data: booking, error: bookingError } = await supabase
      .from('seat_bookings')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_number: tableNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        booking_date: bookingDate,
        booking_time: bookingTime,
        number_of_guests: numberOfGuests,
        special_requests: specialRequests || null,
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError) {
      throw bookingError
    }

    // Update table status to reserved
    if (tableId) {
      await supabase
        .from('tables')
        .update({ status: 'reserved', updated_at: new Date().toISOString() })
        .eq('id', tableId)
    }

    return NextResponse.json({ bookingId: booking.id, booking }, { status: 201 })
  } catch (error: any) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    )
  }
}

// Get bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const bookingDate = searchParams.get('bookingDate')

    let query = supabase
      .from('seat_bookings')
      .select(`
        *,
        tables (*)
      `)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }

    if (bookingDate) {
      query = query.eq('booking_date', bookingDate)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ bookings: data })
  } catch (error: any) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

