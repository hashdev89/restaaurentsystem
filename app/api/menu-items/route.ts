import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function resolveRestaurantId(restaurantId: string): string {
  const defaultId = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID
  if (defaultId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)) {
    return defaultId
  }
  return restaurantId
}

type MenuItemRow = {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  price: number
  category: string
  image: string | null
  is_available: boolean
  customizations?: unknown
}

function toMenuItem(row: MenuItemRow) {
  const customizations = row.customizations != null && Array.isArray(row.customizations)
    ? (row.customizations as { id: string; name: string; type: string; options: { id: string; name: string; price: number }[] }[])
    : undefined
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: row.category,
    image: row.image ?? '',
    isAvailable: row.is_available,
    ...(customizations && customizations.length > 0 ? { customizations } : {}),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantIdParam = searchParams.get('restaurantId')
    if (!restaurantIdParam) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }
    const restaurantId = resolveRestaurantId(restaurantIdParam)
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category')
      .order('name')
    if (error) throw error
    const items = (data ?? []).map(toMenuItem)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    console.error('GET menu-items error:', err)
    const message = err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error ? err.message : 'Failed to fetch menu items'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, name, description, price, category, image, isAvailable, customizations } = body
    if (!restaurantId || !name || price == null) {
      return NextResponse.json({ error: 'restaurantId, name, and price are required' }, { status: 400 })
    }
    const rid = resolveRestaurantId(restaurantId)
    const payload: Record<string, unknown> = {
      restaurant_id: rid,
      name: String(name).trim(),
      description: description != null ? String(description).trim() : null,
      price: Number(price),
      category: category != null ? String(category).trim() || 'Other' : 'Other',
      image: image != null ? String(image).trim() || null : null,
      is_available: isAvailable !== false,
    }
    if (customizations != null && Array.isArray(customizations) && customizations.length > 0) {
      payload.customizations = customizations
    }
    const { data, error } = await supabase
      .from('menu_items')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    const item = toMenuItem(data as MenuItemRow)
    return NextResponse.json({ item })
  } catch (err: unknown) {
    console.error('POST menu-items error:', err)
    const message = err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error ? err.message : 'Failed to create menu item'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
