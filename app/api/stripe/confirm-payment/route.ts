import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

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

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.metadata?.orderId !== orderId) {
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
      .eq('id', orderId)

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
