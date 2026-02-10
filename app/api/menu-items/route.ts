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
  sizes?: unknown
}

type CustomizationGroup = { id: string; name: string; type: string; options: { id: string; name: string; price: number }[] }

function toMenuItem(row: MenuItemRow, categoryCustomizations?: CustomizationGroup[]) {
  const itemCustomizations = row.customizations != null && Array.isArray(row.customizations)
    ? (row.customizations as CustomizationGroup[])
    : undefined
  const sizes = row.sizes != null && Array.isArray(row.sizes)
    ? (row.sizes as { name: string; price: number }[]).filter((s) => s && typeof s.name === 'string')
    : undefined
  const merged = mergeCategoryCustomizations(itemCustomizations, categoryCustomizations)
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: row.category,
    image: row.image ?? '',
    isAvailable: row.is_available,
    ...(merged && merged.length > 0 ? { customizations: merged } : {}),
    ...(sizes && sizes.length > 0 ? { sizes } : {}),
  }
}

function mergeCategoryCustomizations(
  itemGroups: CustomizationGroup[] | undefined,
  categoryGroups: CustomizationGroup[] | undefined
): CustomizationGroup[] | undefined {
  if (!categoryGroups?.length && !itemGroups?.length) return undefined
  if (!categoryGroups?.length) return itemGroups
  const byType = new Map<string, CustomizationGroup>()
  for (const g of categoryGroups) {
    if (g?.type && Array.isArray(g.options)) {
      byType.set(g.type, { id: g.id || g.type, name: g.name || g.type, type: g.type, options: [...g.options] })
    }
  }
  for (const g of itemGroups ?? []) {
    if (!g?.type || !Array.isArray(g.options)) continue
    const existing = byType.get(g.type)
    const opts = existing ? [...existing.options] : []
    const seen = new Set(opts.map((o) => o.id || o.name))
    for (const o of g.options) {
      const key = o.id || o.name
      if (!seen.has(key)) {
        opts.push(o)
        seen.add(key)
      }
    }
    byType.set(g.type, { id: g.id || g.type, name: g.name || g.type, type: g.type, options: opts })
  }
  const out = Array.from(byType.values()).filter((g) => g.options.length > 0)
  return out.length ? out : undefined
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantIdParam = searchParams.get('restaurantId')
    if (!restaurantIdParam) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }
    const restaurantId = resolveRestaurantId(restaurantIdParam)
    const [itemsRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('category').order('name'),
      supabase.from('category_customizations').select('category, customizations').eq('restaurant_id', restaurantId)
    ])
    if (itemsRes.error) throw itemsRes.error
    const catData = catRes.error && catRes.error.code === '42P01' ? [] : catRes.data ?? []
    const byCategory: Record<string, CustomizationGroup[]> = {}
    for (const row of catData) {
      const r = row as { category: string; customizations: unknown }
      if (r.category && Array.isArray(r.customizations) && r.customizations.length > 0) {
        byCategory[r.category] = r.customizations as CustomizationGroup[]
      }
    }
    const items = (itemsRes.data ?? []).map((row) => {
      const categoryCust = byCategory[(row as MenuItemRow).category]
      return toMenuItem(row as MenuItemRow, categoryCust)
    })
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
    const { restaurantId, name, description, price, category, image, isAvailable, customizations, sizes } = body
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
    if (sizes != null && Array.isArray(sizes) && sizes.length > 0) {
      payload.sizes = sizes
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
