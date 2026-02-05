import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    let stripe
    try {
      stripe = getStripe()
    } catch (e) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' },
        { status: 503 }
      )
    }
    const body = await request.json()
    const { amountInCents, orderId, currency = 'aud' } = body as {
      amountInCents?: number
      orderId?: string
      currency?: string
    }

    const amount = Math.round(Number(amountInCents) || 0)
    if (amount < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least 50 cents.' },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: orderId ? { orderId } : {}
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (err: unknown) {
    console.error('Stripe create-payment-intent error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create payment intent'
    return NextResponse.json({ error: String(message) }, { status: 500 })
  }
}
