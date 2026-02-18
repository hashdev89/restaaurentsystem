import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toOrderUuid(value: string | undefined): string | null {
  const s = (value ?? '').trim()
  if (!s) return null
  if (UUID_REGEX.test(s)) return s
  const uuidPart = s.slice(0, 36)
  if (UUID_REGEX.test(uuidPart)) return uuidPart
  return null
}

/**
 * Stripe webhook: mark order as paid when payment_intent.succeeded.
 * Set STRIPE_WEBHOOK_SECRET in .env and run: stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set; webhook skipped')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  let event: Stripe.Event
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const rawOrderId = paymentIntent.metadata?.orderId as string | undefined
    const orderUuid = toOrderUuid(rawOrderId)
    if (orderUuid) {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          square_payment_id: paymentIntent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderUuid)
      if (error) console.error('Webhook: failed to update order', orderUuid, error)
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
