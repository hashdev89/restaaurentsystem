import { randomUUID } from 'node:crypto'
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
  created_at?: string
  updated_at?: string
}

/** Map Supabase restaurant row to frontend Restaurant type (never expose pin hashes) */
function toRestaurant(row: RestaurantRow) {
  const holidayDates = row.public_holiday_dates != null && Array.isArray(row.public_holiday_dates) ? (row.public_holiday_dates as string[]) : []
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
    orderCount: undefined,
    revenueToday: undefined,
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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name')

    if (error) throw error

    const list = (data || []).map((r: RestaurantRow) => toRestaurant(r))
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
    const { name, description, address, phone, image, location, latitude, longitude } = body

    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: 'name, address, and phone are required' },
        { status: 400 }
      )
    }

    // Use service role so System Dashboard can create restaurants (avoids RLS; required on Vercel)
    const client = getServiceRoleClient() ?? supabase
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server misconfigured: NEXT_PUBLIC_SUPABASE_URL not set. Add it in Vercel → Project Settings → Environment Variables, then redeploy.' },
        { status: 503 }
      )
    }

    const lat = latitude != null && latitude !== '' ? Number(latitude) : null
    const lng = longitude != null && longitude !== '' ? Number(longitude) : null

    const id = randomUUID()
    const { data, error } = await client
      .from('restaurants')
      .insert({
        id,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        address: String(address).trim(),
        phone: String(phone).trim(),
        image: image ? String(image).trim() : null,
        location: location ? String(location).trim() : null,
        latitude: typeof lat === 'number' && !Number.isNaN(lat) ? lat : null,
        longitude: typeof lng === 'number' && !Number.isNaN(lng) ? lng : null,
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
