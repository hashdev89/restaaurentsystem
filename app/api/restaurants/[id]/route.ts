import { NextRequest, NextResponse } from 'next/server'
import { supabase, getServiceRoleClient } from '@/lib/supabase'

type RestaurantRow = {
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
  pos_enabled?: boolean | null
  kds_enabled?: boolean | null
  pos_pin_required?: boolean | null
  kds_pin_required?: boolean | null
  sunday_surcharge_enabled?: boolean | null
  sunday_surcharge_percent?: number | null
  public_holiday_surcharge_enabled?: boolean | null
  public_holiday_surcharge_percent?: number | null
  public_holiday_dates?: unknown
  surcharge_manual_override?: string | null
  online_card_surcharge_percent?: number | null
  pos_card_surcharge_percent?: number | null
}

function toRestaurant(row: RestaurantRow) {
  const holidayDates = row.public_holiday_dates != null && Array.isArray(row.public_holiday_dates)
    ? (row.public_holiday_dates as string[])
    : []
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
    posEnabled: row.pos_enabled !== false,
    kdsEnabled: row.kds_enabled !== false,
    posPinRequired: row.pos_pin_required === true,
    kdsPinRequired: row.kds_pin_required === true,
    sundaySurchargeEnabled: row.sunday_surcharge_enabled === true,
    sundaySurchargePercent: row.sunday_surcharge_percent != null ? Number(row.sunday_surcharge_percent) : 0,
    publicHolidaySurchargeEnabled: row.public_holiday_surcharge_enabled === true,
    publicHolidaySurchargePercent: row.public_holiday_surcharge_percent != null ? Number(row.public_holiday_surcharge_percent) : 0,
    publicHolidayDates: holidayDates,
    surchargeManualOverride: (row.surcharge_manual_override === 'sunday' || row.surcharge_manual_override === 'public_holiday' || row.surcharge_manual_override === 'none') ? row.surcharge_manual_override : 'auto',
    onlineCardSurchargePercent: row.online_card_surcharge_percent != null ? Number(row.online_card_surcharge_percent) : 0,
    posCardSurchargePercent: row.pos_card_surcharge_percent != null ? Number(row.pos_card_surcharge_percent) : 0,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    return NextResponse.json({ restaurant: toRestaurant(data as RestaurantRow) })
  } catch (err: unknown) {
    console.error('GET restaurant error:', err)
    return NextResponse.json({ error: 'Failed to fetch restaurant' }, { status: 500 })
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
    if (typeof body.posEnabled === 'boolean') updates.pos_enabled = body.posEnabled
    if (typeof body.kdsEnabled === 'boolean') updates.kds_enabled = body.kdsEnabled
    if (typeof body.posPinRequired === 'boolean') updates.pos_pin_required = body.posPinRequired
    if (typeof body.kdsPinRequired === 'boolean') updates.kds_pin_required = body.kdsPinRequired
    if (typeof body.sundaySurchargeEnabled === 'boolean') updates.sunday_surcharge_enabled = body.sundaySurchargeEnabled
    if (typeof body.sundaySurchargePercent === 'number' && body.sundaySurchargePercent >= 0) updates.sunday_surcharge_percent = body.sundaySurchargePercent
    if (typeof body.publicHolidaySurchargeEnabled === 'boolean') updates.public_holiday_surcharge_enabled = body.publicHolidaySurchargeEnabled
    if (typeof body.publicHolidaySurchargePercent === 'number' && body.publicHolidaySurchargePercent >= 0) updates.public_holiday_surcharge_percent = body.publicHolidaySurchargePercent
    if (Array.isArray(body.publicHolidayDates)) updates.public_holiday_dates = body.publicHolidayDates
    if (body.surchargeManualOverride === 'auto' || body.surchargeManualOverride === 'sunday' || body.surchargeManualOverride === 'public_holiday' || body.surchargeManualOverride === 'none') {
      updates.surcharge_manual_override = body.surchargeManualOverride
    }
    if (typeof body.onlineCardSurchargePercent === 'number' && body.onlineCardSurchargePercent >= 0) {
      updates.online_card_surcharge_percent = body.onlineCardSurchargePercent
    }
    if (typeof body.posCardSurchargePercent === 'number' && body.posCardSurchargePercent >= 0) {
      updates.pos_card_surcharge_percent = body.posCardSurchargePercent
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

    return NextResponse.json({ restaurant: toRestaurant(data as RestaurantRow) })
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
