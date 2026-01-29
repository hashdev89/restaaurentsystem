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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const barcode = searchParams.get('barcode')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }

    const rid = resolveRestaurantId(restaurantId)
    let query = supabase.from('inventory').select('*').eq('restaurant_id', rid).order('name')

    if (barcode) {
      query = query.eq('barcode', barcode)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ items: data ?? [] })
  } catch (error: any) {
    console.error('Get inventory error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { restaurantId, barcode, name, quantity, price } = body

    if (!restaurantId || !name) {
      return NextResponse.json({ error: 'restaurantId and name are required' }, { status: 400 })
    }

    const rid = resolveRestaurantId(restaurantId)
    const barcodeStr = typeof barcode === 'string' && barcode.trim() ? barcode.trim() : null
    const finalBarcode = barcodeStr ?? `BC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        restaurant_id: rid,
        barcode: finalBarcode,
        name: String(name).trim(),
        quantity: quantity ?? 0,
        price: price ?? 0
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error: any) {
    console.error('Create inventory error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create item' }, { status: 500 })
  }
}
