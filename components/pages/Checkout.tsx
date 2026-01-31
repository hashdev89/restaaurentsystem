'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Lock } from 'lucide-react'
import { useCart } from '../providers/CartProvider'
import { useNotification } from '../providers/NotificationProvider'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { Select } from '../ui/Select'
import { OrderType } from '@/types'

const CUSTOMER_PROFILE_KEY = 'restaurant-customer-profile'

function loadCustomerProfile(): { name: string; email: string; phone: string } {
  if (typeof window === 'undefined') return { name: '', email: '', phone: '' }
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY)
    if (!raw) return { name: '', email: '', phone: '' }
    const p = JSON.parse(raw) as { name?: string; email?: string; phone?: string }
    return {
      name: typeof p.name === 'string' ? p.name : '',
      email: typeof p.email === 'string' ? p.email : '',
      phone: typeof p.phone === 'string' ? p.phone : ''
    }
  } catch {
    return { name: '', email: '', phone: '' }
  }
}

function saveCustomerProfile(profile: { name: string; email: string; phone: string }) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify({
      name: profile.name.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim()
    }))
  } catch {
    // ignore
  }
}

export function Checkout() {
  const { items, total, clearCart, tableNumber: cartTable } = useCart()
  const { success, error } = useNotification()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>('dine-in')
  const [tableNumber, setTableNumber] = useState(cartTable ?? '')

  useEffect(() => {
    if (cartTable) setTableNumber(cartTable)
  }, [cartTable])

  // Form State – pre-fill name, email, phone from cached customer profile (client-only)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  })

  useEffect(() => {
    const profile = loadCustomerProfile()
    if (profile.name || profile.email || profile.phone) {
      setFormData((prev) => ({
        ...prev,
        name: profile.name,
        email: profile.email,
        phone: profile.phone
      }))
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const subtotal = total
  const gstAmount = total * 0.1
  const serviceFeeRate = 0.01
  const serviceFeeAmount = total * serviceFeeRate
  const finalTotal = total + gstAmount + serviceFeeAmount // Subtotal + GST (10%) + Service fee (1%)

  const createOrderInSupabase = async (opts: { paymentStatus: string; squarePaymentId?: string }) => {
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: items[0]?.restaurantId || '',
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: items.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: finalTotal,
        status: 'pending',
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : null,
        paymentStatus: opts.paymentStatus,
        squarePaymentId: opts.squarePaymentId || null
      })
    })
    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to create order')
    }
    return orderResponse.json()
  }

  const handlePlaceOrderPayLater = async (e: React.FormEvent, payAtLabel: string) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      error('Missing details', 'Please enter name, email and phone.')
      return
    }
    setIsProcessing(true)
    try {
      const orderData = await createOrderInSupabase({ paymentStatus: 'pending' })
      clearCart()
      success('Order placed', `Order sent to the restaurant. ${payAtLabel}`, {
        actionHref: `/confirmation?orderId=${orderData.orderId}&orderType=${orderType}`,
        actionLabel: 'View confirmation'
      })
      router.push(`/confirmation?orderId=${orderData.orderId}&orderType=${orderType}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order'
      error('Order failed', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      error('Missing details', 'Please enter your name, email and phone number.')
      return
    }
    setIsProcessing(true)

    try {
      const paymentResponse = await fetch('/api/square/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalTotal,
          sourceId: 'card',
          orderId: `ORD-${Date.now()}`
        })
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        throw new Error(errorData.error || 'Payment failed')
      }

      const paymentData = await paymentResponse.json()
      const orderData = await createOrderInSupabase({
        paymentStatus: paymentData.status === 'COMPLETED' ? 'captured' : 'authorized',
        squarePaymentId: paymentData.paymentId
      })

      saveCustomerProfile({ name: formData.name, email: formData.email, phone: formData.phone })
      clearCart()
      success('Order placed', `Order #${orderData.orderId} confirmed. Redirecting…`, {
        actionHref: `/confirmation?orderId=${orderData.orderId}&orderType=${orderType}`,
        actionLabel: 'View confirmation',
      })
      router.push(`/confirmation?orderId=${orderData.orderId}&orderType=${orderType}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed. Please try again.'
      console.error('Checkout error:', err)
      error('Checkout failed', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <div className="flex-1 w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 lg:py-8 lg:min-h-[calc(100vh-4rem)]">
        <div className="flex items-center mb-6">
          <Link href="/cart" className="text-gray-500 hover:text-gray-700 mr-4 flex-shrink-0">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:gap-10 lg:items-start w-full">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Order Type Selection */}
            <Card
              header={<h2 className="text-lg font-semibold">Order Type</h2>}
            >
              <div className="space-y-4">
                <Select
                  label="How would you like to receive your order?"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  options={[
                    { value: 'dine-in', label: 'Dine In' },
                    { value: 'pickup', label: 'Pickup' },
                    { value: 'delivery', label: 'Delivery' }
                  ]}
                />
                {orderType === 'dine-in' && (
                  <Input
                    label="Table Number"
                    name="tableNumber"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g., 12"
                    required
                  />
                )}
              </div>
            </Card>

            {/* Contact Info */}
            <Card
              header={<h2 className="text-lg font-semibold">Contact Information</h2>}
            >
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="John Doe"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="john@example.com"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="0412 345 678"
                  />
                </div>
              </div>
            </Card>

            {/* Payment Info */}
            <Card
              header={<h2 className="text-lg font-semibold">Payment Details</h2>}
            >
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6 flex items-start">
                <Lock className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  This is a secure 128-bit SSL encrypted payment. Your card details are safe.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Card Number"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Date"
                    name="expiry"
                    value={formData.expiry}
                    onChange={handleInputChange}
                    required
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  <Input
                    label="CVC"
                    name="cvc"
                    value={formData.cvc}
                    onChange={handleInputChange}
                    required
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center text-gray-400 gap-2">
                <CreditCard className="w-6 h-6" />
                <span className="text-sm">Powered by Square</span>
              </div>
            </Card>
          </div>

          {/* Order Summary - sticky on desktop, full width */}
          <div className="w-full lg:w-[380px] lg:flex-shrink-0 mt-8 lg:mt-0">
            <Card className="lg:sticky lg:top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Subtotal ({items.length} items)</span>
                  <span>A${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>GST (10%)</span>
                  <span>A${gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Service fee (1%)</span>
                  <span>A${serviceFeeAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg text-gray-900 mb-6">
                <span>Total</span>
                <span>A${finalTotal.toFixed(2)}</span>
              </div>

              {/* Buttons - responsive */}
              <div className="flex flex-col gap-3">
                {orderType === 'dine-in' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full text-base sm:text-lg py-3 sm:py-4 min-h-[48px] sm:min-h-[56px]"
                    disabled={isProcessing}
                    onClick={(e) => handlePlaceOrderPayLater(e, 'You can pay at the table.')}
                  >
                    {isProcessing ? 'Placing order...' : 'Place order (pay at table)'}
                  </Button>
                )}
                {orderType === 'pickup' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full text-base sm:text-lg py-3 sm:py-4 min-h-[48px] sm:min-h-[56px]"
                    disabled={isProcessing}
                    onClick={(e) => handlePlaceOrderPayLater(e, 'Pay at the restaurant when you pickup.')}
                  >
                    {isProcessing ? 'Placing order...' : 'Place order (pay at restaurant when pickup)'}
                  </Button>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base sm:text-lg py-3 sm:py-4 min-h-[48px] sm:min-h-[56px]"
                  isLoading={isProcessing}
                >
                  {isProcessing ? 'Processing...' : `Pay A$${finalTotal.toFixed(2)} now`}
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}

