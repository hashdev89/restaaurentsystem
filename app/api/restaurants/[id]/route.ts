import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await _request.json()

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.description === 'string') updates.description = body.description.trim() || null
    if (typeof body.address === 'string') updates.address = body.address.trim()
    if (typeof body.phone === 'string') updates.phone = body.phone.trim()
    if (typeof body.image === 'string') updates.image = body.image.trim() || null
    if (typeof body.location === 'string') updates.location = body.location.trim() || null
    if (typeof body.isActive === 'boolean') updates.is_active = body.isActive

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    return NextResponse.json({ restaurant: toRestaurant(data) })
  } catch (err: unknown) {
    console.error('PATCH restaurant error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update restaurant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
