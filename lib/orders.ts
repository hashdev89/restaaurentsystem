import { Order, OrderItem, MenuItemCustomizationGroup } from '@/types'

/** Supabase returns snake_case; normalize to Order (camelCase, items from order_items) */
export interface SupabaseOrderRow {
  id: string
  restaurant_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total: number
  status: string
  order_type: string
  table_number: string | null
  special_requests: string | null
  payment_status: string
  square_payment_id: string | null
  estimated_ready_time: string | null
  created_at: string
  updated_at: string
  receipt_no?: string | null
  order_items?: SupabaseOrderItemRow[]
}

export interface OrderItemOptionsRow {
  selectedRemoves?: string[]
  selectedExtras?: { name: string; price: number }[]
  spiceLevel?: string
  specialRequest?: string
}

export interface SupabaseOrderItemRow {
  id: string
  order_id: string
  menu_item_id: string | null
  name: string
  quantity: number
  price: number
  customizations?: MenuItemCustomizationGroup[]
  options?: OrderItemOptionsRow | null
}

export function normalizeOrder(row: SupabaseOrderRow): Order {
  const items: OrderItem[] = (row.order_items || []).map((oi) => {
    const opts = oi.options
    return {
      menuItemId: oi.menu_item_id || oi.id,
      name: oi.name,
      quantity: oi.quantity,
      price: Number(oi.price),
      ...(oi.customizations && oi.customizations.length > 0 ? { customizations: oi.customizations } : {}),
      ...(opts && (opts.selectedRemoves?.length || opts.selectedExtras?.length || opts.spiceLevel || opts.specialRequest)
        ? {
            selectedRemoves: opts.selectedRemoves,
            selectedExtras: opts.selectedExtras,
            spiceLevel: opts.spiceLevel ?? undefined,
            specialRequest: opts.specialRequest ?? undefined
          }
        : {})
    }
  })
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    items,
    total: Number(row.total),
    status: row.status as Order['status'],
    orderType: row.order_type as Order['orderType'],
    tableNumber: row.table_number ?? undefined,
    specialRequests: row.special_requests ?? undefined,
    paymentStatus: row.payment_status as Order['paymentStatus'],
    squarePaymentId: row.square_payment_id ?? undefined,
    estimatedReadyTime: row.estimated_ready_time ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.receipt_no != null && row.receipt_no !== '' ? { receiptNo: row.receipt_no } : {})
  }
}

export function normalizeOrders(rows: SupabaseOrderRow[]): Order[] {
  const orders = rows.map(normalizeOrder)
  // Deduplicate by order id (API/PostgREST can return same order multiple times when joining order_items)
  const byId = new Map<string, Order>()
  for (const o of orders) {
    if (!byId.has(o.id)) byId.set(o.id, o)
  }
  return Array.from(byId.values())
}

/** Map frontend mock restaurant id to Supabase UUID when needed */
export function resolveRestaurantId(restaurantId: string): string {
  const defaultId = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID
  if (defaultId && (restaurantId === 'rest_1' || !isUuid(restaurantId))) {
    return defaultId
  }
  return restaurantId
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
