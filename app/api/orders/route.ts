import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveRestaurantId(restaurantId: string): string {
  const defaultId = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID
  const isUuid = UUID_REGEX.test(restaurantId || '')
  if (defaultId && !isUuid) {
    return defaultId
  }
  return restaurantId
}

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value || '')
}

// Normalize phone for matching (digits only)
function normalizePhone(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '')
}

// Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, customerName, customerEmail, customerPhone, items, total, orderType, tableNumber, specialRequests, paymentStatus, squarePaymentId } = body

    if (!customerName?.trim() || !customerEmail?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { error: 'Name, email and phone are required to place an order.' },
        { status: 400 }
      )
    }

    const orderItems = Array.isArray(items) ? items : []
    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: 'Your cart is empty. Add items before checkout.' },
        { status: 400 }
      )
    }

    const totalNum = typeof total === 'number' && Number.isFinite(total) ? total : Number(total)
    if (Number.isNaN(totalNum) || totalNum < 0) {
      return NextResponse.json(
        { error: 'Invalid order total. Please refresh and try again.' },
        { status: 400 }
      )
    }

    let restaurantIdToUse = resolveRestaurantId(restaurantId || '')

    if (!isUuid(restaurantIdToUse)) {
      const { data: firstRestaurant } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1)
        .single()
      if (firstRestaurant?.id) {
        restaurantIdToUse = firstRestaurant.id
      } else {
        return NextResponse.json(
          {
            error:
              'No restaurant in database. Add a restaurant in Supabase (Table Editor → restaurants), or set NEXT_PUBLIC_DEFAULT_RESTAURANT_ID in .env to your restaurant UUID.',
          },
          { status: 400 }
        )
      }
    }

    // Insert order into Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantIdToUse,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        total: totalNum,
        status: 'pending',
        order_type: orderType || 'pickup',
        table_number: tableNumber || null,
        special_requests: specialRequests || null,
        payment_status: paymentStatus || 'pending',
        square_payment_id: squarePaymentId || null
      })
      .select()
      .single()

    if (orderError) {
      const msg = String(orderError.message || '')
      if (msg.includes('row-level security') || msg.includes('policy')) {
        return NextResponse.json(
          { error: 'Order could not be created. Please contact the restaurant or try again later.' },
          { status: 403 }
        )
      }
      throw orderError
    }

    // Insert order items (validate shape and types); include per-item options when provided
    type ItemInput = {
      menuItemId?: string
      name?: string
      quantity?: number
      price?: number
      selectedRemoves?: string[]
      selectedExtras?: { name: string; price: number }[]
      spiceLevel?: string
      specialRequest?: string
    }
    const rows = orderItems.map((item: ItemInput) => {
      const options =
        item.selectedRemoves?.length ||
        item.selectedExtras?.length ||
        item.spiceLevel ||
        item.specialRequest
          ? {
              selectedRemoves: item.selectedRemoves ?? [],
              selectedExtras: (item.selectedExtras ?? []).map((e) => ({ name: e.name, price: Number(e.price) || 0 })),
              spiceLevel: item.spiceLevel ?? null,
              specialRequest: item.specialRequest ?? null
            }
          : null
      return {
        order_id: order.id,
        menu_item_id: item.menuItemId ?? '',
        name: String(item.name ?? '').trim() || 'Item',
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        price: Number(item.price) || 0,
        ...(options != null ? { options } : {})
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(rows)

    if (itemsError) {
      const msg = String(itemsError.message || '')
      if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
        return NextResponse.json(
          { error: 'One or more items in your cart are no longer available. Please go back to the menu and update your cart.' },
          { status: 400 }
        )
      }
      throw itemsError
    }

    return NextResponse.json({ orderId: order.id, order }, { status: 201 })
  } catch (error: unknown) {
    console.error('Order creation error:', error)
    let message = 'Failed to create order'
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
      message = (error as { message: string }).message
    } else if (error instanceof Error) {
      message = error.message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Get orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantIdParam = searchParams.get('restaurantId')
    const status = searchParams.get('status')
    const customerPhoneParam = searchParams.get('customerPhone')
    const customerEmailParam = searchParams.get('customerEmail')

    const restaurantId = restaurantIdParam ? resolveRestaurantId(restaurantIdParam) : undefined

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false })

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Deduplicate: one-to-many select can return one order row per order_item; keep one per order and merge items.
    const raw = (data ?? []) as Array<{ id: string; customer_phone?: string; customer_email?: string; order_items?: unknown[] } & Record<string, unknown>>
    const byId = new Map<string, (typeof raw)[0]>()
    for (const row of raw) {
      const existing = byId.get(row.id)
      const rowItems = Array.isArray(row.order_items) ? row.order_items : []
      if (!existing) {
        byId.set(row.id, { ...row, order_items: [...rowItems] })
      } else if (rowItems.length > 0) {
        const existingItems = (existing.order_items ?? []) as { id?: string }[]
        const merged = [...existingItems]
        for (const oi of rowItems as { id?: string }[]) {
          if (!merged.some((m) => m?.id === oi?.id)) merged.push(oi)
        }
        existing.order_items = merged
      }
    }
    let orders = Array.from(byId.values())
    // Ensure strict one order per id (dedupe by id in case of any edge cases)
    const seenIds = new Set<string>()
    orders = orders.filter((o) => {
      const id = (o as { id?: string })?.id
      if (!id || seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })

    // Enrich order_items with menu item customizations (Remove options + Extras) for display
    const menuItemIds = [...new Set(
      orders.flatMap((o) =>
        (Array.isArray(o.order_items) ? o.order_items : []).map(
          (oi: { menu_item_id?: string }) => oi?.menu_item_id
        ).filter(Boolean) as string[]
      )
    )]
    let menuCustomizationsMap: Record<string, unknown> = {}
    if (menuItemIds.length > 0) {
      const { data: menuRows } = await supabase
        .from('menu_items')
        .select('id, customizations')
        .in('id', menuItemIds)
      if (Array.isArray(menuRows)) {
        menuCustomizationsMap = Object.fromEntries(
          menuRows
            .filter((r: { id?: string; customizations?: unknown }) => r?.id != null)
            .map((r: { id: string; customizations?: unknown }) => [r.id, r.customizations ?? null])
        )
      }
    }
    for (const order of orders) {
      const items = Array.isArray(order.order_items) ? order.order_items : []
      for (const oi of items as { menu_item_id?: string; customizations?: unknown }[]) {
        const mid = oi?.menu_item_id
        if (mid && menuCustomizationsMap[mid] != null && Array.isArray(menuCustomizationsMap[mid])) {
          oi.customizations = menuCustomizationsMap[mid] as unknown[]
        }
      }
    }

    // Filter by customer (for "Track your order" – show only this customer's orders)
    if (customerPhoneParam?.trim()) {
      const matchPhone = normalizePhone(customerPhoneParam)
      orders = orders.filter((row) => normalizePhone(String(row.customer_phone ?? '')) === matchPhone)
    }
    if (customerEmailParam?.trim()) {
      const matchEmail = String(customerEmailParam).toLowerCase().trim()
      orders = orders.filter((row) => String(row.customer_email ?? '').toLowerCase().trim() === matchEmail)
    }

    return NextResponse.json({ orders })
  } catch (error: unknown) {
    console.error('Get orders error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

