'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function OrderConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const orderType = searchParams.get('orderType')
  const redirectStatus = searchParams.get('redirect_status')
  const paymentIntent = searchParams.get('payment_intent')
  const confirmSent = useRef(false)

  // When Stripe redirects after 3DS, mark the order as paid (front-end never called confirm-payment)
  useEffect(() => {
    if (!orderId || !paymentIntent || redirectStatus !== 'succeeded' || confirmSent.current) return
    confirmSent.current = true
    fetch('/api/stripe/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paymentIntentId: paymentIntent })
    }).catch(() => {})
  }, [orderId, paymentIntent, redirectStatus])

  if (!orderId) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center py-12">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your order. We've received it and will start preparing it shortly.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-8 inline-block">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
            Order ID
          </p>
          <p className="text-2xl font-mono font-bold text-gray-900">#{orderId}</p>
          {orderType && (
            <p className="text-sm text-gray-500 mt-2">
              {orderType === 'dine-in'
                ? 'Dine In'
                : orderType.charAt(0).toUpperCase() + orderType.slice(1)}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            You will receive an email confirmation with your receipt.
          </p>
          <div className="flex gap-3">
            <Link href="/orders" className="flex-1">
              <Button variant="secondary" className="w-full">
                Track Order
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full">
                Back to Menu
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

