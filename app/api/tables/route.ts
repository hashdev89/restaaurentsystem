import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Get tables for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const status = searchParams.get('status')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurantId is required' },
        { status: 400 }
      )
    }

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

