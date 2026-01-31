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
    const { restaurantId, customerName, customerEmail, customerPhone, items, total, orderType, tableNumber, paymentStatus, squarePaymentId } = body

    if (!customerName?.trim() || !customerEmail?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { error: 'Name, email and phone are required to place an order.' },
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
        total,
        status: 'pending',
        order_type: orderType,
        table_number: tableNumber || null,
        payment_status: paymentStatus || 'pending',
        square_payment_id: squarePaymentId || null
      })
      .select()
      .single()

    if (orderError) {
      throw orderError
    }

    // Insert order items
    const orderItems = items.map((item: { menuItemId: string; name: string; quantity: number; price: number }) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      throw itemsError
    }

    return NextResponse.json({ orderId: order.id, order }, { status: 201 })
  } catch (error: unknown) {
    console.error('Order creation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create order'
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

