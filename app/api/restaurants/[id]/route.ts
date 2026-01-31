import { NextRequest, NextResponse } from 'next/server'
import { supabase, getServiceRoleClient } from '@/lib/supabase'

function toRestaurant(row: {
  id: string
  name: string
  description: string | null
  address: string
  phone: string
  image: string | null
  location: string | null
  latitude?: number | null
  longitude?: number | null
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
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
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
    if (body.latitude !== undefined) {
      const v = body.latitude === '' || body.latitude == null ? null : Number(body.latitude)
      updates.latitude = typeof v === 'number' && !Number.isNaN(v) ? v : null
    }
    if (body.longitude !== undefined) {
      const v = body.longitude === '' || body.longitude == null ? null : Number(body.longitude)
      updates.longitude = typeof v === 'number' && !Number.isNaN(v) ? v : null
    }

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Use service role client if available (bypasses RLS); otherwise anon (may fail if RLS blocks)
    const client = getServiceRoleClient() ?? supabase

    // Unlink users that belong to this restaurant (users.restaurant_id has no ON DELETE)
    const { error: usersError } = await client
      .from('users')
      .update({ restaurant_id: null })
      .eq('restaurant_id', id)

    if (usersError) {
      console.error('DELETE restaurant: unlink users error', usersError)
      const msg = usersError.message || 'Could not unlink users from restaurant.'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Delete orders for this restaurant first (cascade deletes order_items).
    // Then we can delete the restaurant (cascade deletes menu_items) without violating order_items.menu_item_id fkey.
    const { error: ordersError } = await client
      .from('orders')
      .delete()
      .eq('restaurant_id', id)

    if (ordersError) {
      console.error('DELETE restaurant: delete orders error', ordersError)
      const msg = ordersError.message || 'Could not delete restaurant orders.'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const { error } = await client
      .from('restaurants')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('DELETE restaurant error', error)
      const msg = error.message || 'Could not delete restaurant.'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('DELETE restaurant error:', err)
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to delete restaurant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
