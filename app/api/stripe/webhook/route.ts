import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const orderId = paymentIntent.metadata?.orderId
    if (orderId) {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          square_payment_id: paymentIntent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
      if (error) console.error('Webhook: failed to update order', orderId, error)
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
