import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, customerName, customerEmail, customerPhone, items, total, orderType, tableNumber, paymentStatus, squarePaymentId } = body

    // Insert order into Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
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
    const orderItems = items.map((item: any) => ({
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
  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

// Get orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const status = searchParams.get('status')

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

    return NextResponse.json({ orders: data })
  } catch (error: any) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

