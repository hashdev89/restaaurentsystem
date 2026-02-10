import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type CustomizationGroup = { id: string; name: string; type: 'remove' | 'extra'; options: { id: string; name: string; price: number }[] }

function resolveRestaurantId(restaurantId: string): string {
  const defaultId = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID
  if (defaultId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)) {
    return defaultId
  }
  return restaurantId
}

/** GET ?restaurantId= → { customizationsByCategory: { [category]: CustomizationGroup[] } } */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantIdParam = searchParams.get('restaurantId')
    if (!restaurantIdParam) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }
    const restaurantId = resolveRestaurantId(restaurantIdParam)
    const { data, error } = await supabase
      .from('category_customizations')
      .select('category, customizations')
      .eq('restaurant_id', restaurantId)
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ customizationsByCategory: {} })
      }
      throw error
    }
    const customizationsByCategory: Record<string, CustomizationGroup[]> = {}
    for (const row of data ?? []) {
      const cat = (row as { category: string; customizations: unknown }).category
      const cust = (row as { category: string; customizations: unknown }).customizations
      if (cat && Array.isArray(cust) && cust.length > 0) {
        customizationsByCategory[cat] = cust as CustomizationGroup[]
      }
    }
    return NextResponse.json({ customizationsByCategory })
  } catch (err: unknown) {
    console.error('GET category-customizations error:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch category customizations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST body: { restaurantId, category, customizations: CustomizationGroup[] } → upsert */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, category, customizations } = body as {
      restaurantId?: string
      category?: string
      customizations?: CustomizationGroup[]
    }
    if (!restaurantId || !category?.trim()) {
      return NextResponse.json({ error: 'restaurantId and category are required' }, { status: 400 })
    }
    const rid = resolveRestaurantId(restaurantId)
    const cat = String(category).trim()
    const payload = Array.isArray(customizations) && customizations.length > 0 ? customizations : []
    const { error } = await supabase
      .from('category_customizations')
      .upsert(
        { restaurant_id: rid, category: cat, customizations: payload, updated_at: new Date().toISOString() },
        { onConflict: 'restaurant_id,category' }
      )
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Table category_customizations does not exist. Run the SQL in supabase/migrations or SQL editor to create it.' },
          { status: 503 }
        )
      }
      throw error
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('POST category-customizations error:', err)
    const message = err instanceof Error ? err.message : 'Failed to save category customizations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
