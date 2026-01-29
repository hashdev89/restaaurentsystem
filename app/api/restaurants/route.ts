import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/** Map Supabase restaurant row to frontend Restaurant type */
function toRestaurant(row: {
  id: string
  name: string
  description: string | null
  address: string
  phone: string
  image: string | null
  location: string | null
  is_active: boolean
  rating: number
  review_count: number
  created_at?: string
  updated_at?: string
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    address: row.address,
    phone: row.phone,
    image: row.image ?? '',
    location: row.location ?? '',
    isActive: row.is_active,
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    orderCount: undefined,
    revenueToday: undefined,
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name')

    if (error) throw error

    const list = (data || []).map(toRestaurant)
    return NextResponse.json({ restaurants: list })
  } catch (err: unknown) {
    console.error('GET restaurants error:', err)
    const message =
      (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string')
        ? (err as { message: string }).message
        : err instanceof Error ? err.message : 'Failed to fetch restaurants'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, address, phone, image, location } = body

    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: 'name, address, and phone are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        address: String(address).trim(),
        phone: String(phone).trim(),
        image: image ? String(image).trim() : null,
        location: location ? String(location).trim() : null,
        is_active: true,
        rating: 0,
        review_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ restaurant: toRestaurant(data) }, { status: 201 })
  } catch (err: unknown) {
    console.error('POST restaurants error:', err)
    const message =
      (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string')
        ? (err as { message: string }).message
        : err instanceof Error
          ? err.message
          : 'Failed to create restaurant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
