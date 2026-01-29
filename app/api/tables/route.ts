import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function resolveRestaurantId(restaurantId: string): string {
  const defaultId = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID
  if (defaultId && (restaurantId === 'rest_1' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId))) {
    return defaultId
  }
  return restaurantId
}

// Get tables for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantIdParam = searchParams.get('restaurantId')
    const status = searchParams.get('status')

    if (!restaurantIdParam) {
      return NextResponse.json(
        { error: 'restaurantId is required' },
        { status: 400 }
      )
    }

    const restaurantId = resolveRestaurantId(restaurantIdParam)

    let query = supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Calculate availability stats
    const available = data?.filter((t) => t.status === 'available').length || 0
    const reserved = data?.filter((t) => t.status === 'reserved').length || 0
    const occupied = data?.filter((t) => t.status === 'occupied').length || 0
    const total = data?.length || 0

    return NextResponse.json({
      tables: data,
      availability: {
        total,
        available,
        reserved,
        occupied
      }
    })
  } catch (error: any) {
    console.error('Get tables error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

// Create a table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, tableNumber, capacity, location } = body

    if (!restaurantId || !tableNumber) {
      return NextResponse.json(
        { error: 'restaurantId and tableNumber are required' },
        { status: 400 }
      )
    }

    const rid = resolveRestaurantId(restaurantId)

    const { data, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: rid,
        table_number: String(tableNumber),
        capacity: capacity ?? 4,
        status: 'available',
        location: location ?? null
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ table: data }, { status: 201 })
  } catch (error: any) {
    console.error('Create table error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create table' },
      { status: 500 }
    )
  }
}

