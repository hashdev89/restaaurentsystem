import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Normalize to a valid UUID (orders.id is uuid type). Handles "uuid-timestamp" or other suffixes. */
function toOrderUuid(value: string | undefined): string | null {
  const s = (value ?? '').trim()
  if (!s) return null
  if (UUID_REGEX.test(s)) return s
  const uuidPart = s.slice(0, 36)
  if (UUID_REGEX.test(uuidPart)) return uuidPart
  return null
}

/**
 * After the client confirms payment with Stripe.js, call this to verify
 * the PaymentIntent succeeded and mark the order as paid.
 */
export async function POST(request: NextRequest) {
  try {
    let stripe
    try {
      stripe = getStripe()
    } catch {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' },
        { status: 503 }
      )
    }
    const body = await request.json()
    const { orderId, paymentIntentId } = body as { orderId?: string; paymentIntentId?: string }

    if (!orderId?.trim() || !paymentIntentId?.trim()) {
      return NextResponse.json(
        { error: 'orderId and paymentIntentId are required.' },
        { status: 400 }
      )
    }

    const orderUuid = toOrderUuid(orderId)
    if (!orderUuid) {
      return NextResponse.json(
        { error: 'Invalid order ID format.' },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const metadataOrderUuid = toOrderUuid(paymentIntent.metadata?.orderId as string | undefined)

    if (metadataOrderUuid !== orderUuid) {
      return NextResponse.json(
        { error: 'Payment does not match this order.' },
        { status: 400 }
      )
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not succeeded yet.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        square_payment_id: paymentIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderUuid)

    if (error) {
      console.error('Confirm payment DB update error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Stripe confirm-payment error:', err)
    const message = err instanceof Error ? err.message : 'Failed to confirm payment'
    return NextResponse.json({ error: String(message) }, { status: 500 })
  }
}
