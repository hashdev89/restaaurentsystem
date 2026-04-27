'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../providers/CartProvider'
import { useNotification } from '../providers/NotificationProvider'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { Select } from '../ui/Select'
import { OrderType } from '@/types'
import { gstFromInclusive, priceInclGst } from '@/lib/gst'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

const CUSTOMER_PROFILE_KEY = 'restaurant-customer-profile'

type CustomerProfile = { firstName: string; lastName: string; email: string; phone: string }

function loadCustomerProfile(): CustomerProfile {
  if (typeof window === 'undefined') return { firstName: '', lastName: '', email: '', phone: '' }
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY)
    if (!raw) return { firstName: '', lastName: '', email: '', phone: '' }
    const p = JSON.parse(raw) as { firstName?: string; lastName?: string; name?: string; email?: string; phone?: string }
    if (typeof p.firstName === 'string' && typeof p.lastName === 'string') {
      return {
        firstName: p.firstName,
        lastName: p.lastName,
        email: typeof p.email === 'string' ? p.email : '',
        phone: typeof p.phone === 'string' ? p.phone : ''
      }
    }
    // Backward compatibility: split legacy "name" into first/last
    const name = typeof p.name === 'string' ? p.name.trim() : ''
    const [firstName, ...rest] = name ? name.split(/\s+/) : []
    return {
      firstName: firstName ?? '',
      lastName: rest.length ? rest.join(' ') : '',
      email: typeof p.email === 'string' ? p.email : '',
      phone: typeof p.phone === 'string' ? p.phone : ''
    }
  } catch {
    return { firstName: '', lastName: '', email: '', phone: '' }
  }
}

function saveCustomerProfile(profile: CustomerProfile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify({
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim()
    }))
  } catch {
    // ignore
  }
}

type StripePayFormProps = {
  orderId: string
  paymentIntentId: string
  orderType: string
  amountDisplay: string
  onSuccess: () => void
  onError: (message: string) => void
}

function StripePayForm({ orderId, paymentIntentId, orderType, amountDisplay, onSuccess, onError }: StripePayFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isConfirming, setIsConfirming] = useState(false)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsConfirming(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/confirmation?orderId=${orderId}&orderType=${orderType}`,
          receipt_email: undefined
        }
      })
      if (error) {
        onError(error.message || 'Payment failed')
        return
      }
      const res = await fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentIntentId })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        onError(data.error || 'Could not confirm payment')
        return
      }
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'link']
        }}
      />
      <Button type="submit" size="lg" className="w-full" isLoading={isConfirming} disabled={!stripe || isConfirming}>
        {isConfirming ? 'Processing...' : `Pay ${amountDisplay}`}
      </Button>
    </form>
  )
}

export function Checkout() {
  const { items, total, clearCart, tableNumber: cartTable } = useCart()
  const { success, error } = useNotification()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>('pickup')
  const [tableNumber, setTableNumber] = useState(cartTable ?? '')

  // Stripe: 'pay-later' = pay on pickup; 'pay-now' = pay with card. After creating order we get clientSecret and show Stripe form.
  const [paymentMethod, setPaymentMethod] = useState<'pay-later' | 'pay-now'>('pay-later')
  const [stripeStep, setStripeStep] = useState<'form' | 'payment'>('form')
  const [stripeData, setStripeData] = useState<{ orderId: string; clientSecret: string; paymentIntentId: string } | null>(null)

  // Dine-in seating (only used when orderType === 'dine-in')
  const [dineInGuests, setDineInGuests] = useState<'single' | 'group'>('single')
  const [guestCount, setGuestCount] = useState(2)
  const [childrenCount, setChildrenCount] = useState(0)
  const [childrenAges, setChildrenAges] = useState('')

  useEffect(() => {
    if (cartTable) setTableNumber(cartTable)
  }, [cartTable])

  const [onlineCardSurchargePercent, setOnlineCardSurchargePercent] = useState(0)
  useEffect(() => {
    const restaurantId = items[0]?.restaurantId
    if (!restaurantId) return
    fetch(`/api/restaurants/${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const pct = data?.restaurant?.onlineCardSurchargePercent
        setOnlineCardSurchargePercent(typeof pct === 'number' && pct >= 0 ? pct : 0)
      })
      .catch(() => setOnlineCardSurchargePercent(0))
  }, [items])

  // Form State – pre-fill from cached customer profile (client-only)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  })

  useEffect(() => {
    const profile = loadCustomerProfile()
    if (profile.firstName || profile.lastName || profile.email || profile.phone) {
      setFormData((prev) => ({
        ...prev,
        firstName: profile.firstName,
        lastName: profile.lastName,
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

  const serviceFeeAmount = 1.1 // A$1.00 + 10% GST = A$1.10 per order
  const itemsTotalInclGst = priceInclGst(total)
  const baseTotalBeforeCard = itemsTotalInclGst + serviceFeeAmount
  const cardSurchargeAmount = paymentMethod === 'pay-now' && onlineCardSurchargePercent > 0
    ? baseTotalBeforeCard * (onlineCardSurchargePercent / 100)
    : 0
  const finalTotal = baseTotalBeforeCard + cardSurchargeAmount
  const gstIncludedInFinalTotal = gstFromInclusive(finalTotal)

  const buildDineInSeatingNote = (): string | null => {
    if (orderType !== 'dine-in') return null
    const adults = dineInGuests === 'single' ? 1 : guestCount
    const parts: string[] = [`Seating: ${adults} ${adults === 1 ? 'person' : 'people'}.`]
    if (childrenCount > 0) {
      const ageNote = childrenAges.trim() ? ` (ages: ${childrenAges.trim()})` : ''
      parts.push(`Children: ${childrenCount}${ageNote}.`)
    }
    return parts.join(' ')
  }

  const createOrderInSupabase = async (opts: { paymentStatus: string }) => {
    if (!items.length) {
      throw new Error('Your cart is empty. Add items before checkout.')
    }
    const specialRequests = buildDineInSeatingNote()
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: items[0]?.restaurantId || '',
        customerName: [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(' '),
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: items.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price ?? 0,
          ...(item.selectedRemoves?.length ? { selectedRemoves: item.selectedRemoves } : {}),
          ...(item.selectedExtras?.length
            ? { selectedExtras: item.selectedExtras.map((e) => ({ name: e.name, price: e.price })) }
            : {}),
          ...(item.spiceLevel ? { spiceLevel: item.spiceLevel } : {}),
          ...(item.specialRequest ? { specialRequest: item.specialRequest } : {})
        })),
        total: finalTotal,
        status: 'pending',
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : null,
        specialRequests: specialRequests || undefined,
        paymentStatus: opts.paymentStatus
      })
    })
    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to create order')
    }
    return orderResponse.json()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      error('Missing details', 'Please enter your first name, last name, email and phone number.')
      return
    }

    if (paymentMethod === 'pay-now' && stripeStep === 'form') {
      if (!stripePromise) {
        error('Stripe not configured', 'Pay with card is not available. Use pay on pickup or add Stripe keys to .env.')
        return
      }
      setIsProcessing(true)
      try {
        const orderData = await createOrderInSupabase({ paymentStatus: 'pending' })
        saveCustomerProfile({ firstName: formData.firstName, lastName: formData.lastName, email: formData.email, phone: formData.phone })
        const amountInCents = Math.round(finalTotal * 100)
        const res = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountInCents, orderId: orderData.orderId, currency: 'aud' })
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create payment')
        }
        const { clientSecret, paymentIntentId } = await res.json()
        setStripeData({ orderId: orderData.orderId, clientSecret, paymentIntentId })
        setStripeStep('payment')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to start payment'
        error('Payment error', msg)
      } finally {
        setIsProcessing(false)
      }
      return
    }

    if (paymentMethod === 'pay-later') {
      setIsProcessing(true)
      try {
        const orderData = await createOrderInSupabase({ paymentStatus: 'pending' })
        saveCustomerProfile({ firstName: formData.firstName, lastName: formData.lastName, email: formData.email, phone: formData.phone })
        clearCart()
        success('Order placed', `Order #${orderData.orderId} confirmed. Pay when you collect.`, {
          actionHref: `/confirmation?orderId=${orderData.orderId}&orderType=${orderType}`,
          actionLabel: 'View confirmation',
        })
        router.push(`/confirmation?orderId=${orderData.orderId}&orderType=${orderType}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to place order.'
        console.error('Checkout error:', err)
        error('Checkout failed', msg, { duration: 6000 })
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleStripePaymentSuccess = () => {
    clearCart()
    success('Payment successful', 'Your order has been placed and paid.', {
      actionHref: `/confirmation?orderId=${stripeData?.orderId}&orderType=${orderType}`,
      actionLabel: 'View confirmation'
    })
    router.push(`/confirmation?orderId=${stripeData?.orderId}&orderType=${orderType}`)
  }

  const Wrapper = stripeData ? 'div' : 'form'
  const wrapperProps = stripeData
    ? { className: 'flex flex-col lg:flex-row lg:gap-10 lg:items-start w-full' }
    : { onSubmit: handleSubmit, className: 'flex flex-col lg:flex-row lg:gap-10 lg:items-start w-full' }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <div className="flex-1 w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 lg:py-8 lg:min-h-[calc(100vh-4rem)]">
        <div className="flex items-center mb-6">
          <Link href="/cart" className="text-gray-500 hover:text-gray-700 mr-4 flex-shrink-0">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <Wrapper {...wrapperProps}>
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
                    { value: 'pickup', label: 'Pickup' },
                    { value: 'dine-in', label: 'Reserve a dine (Dine in)' },
                    { value: 'delivery', label: 'Delivery' }
                  ]}
                />
              </div>
            </Card>

            {/* Contact Info */}
            <Card
              header={<h2 className="text-lg font-semibold">Contact Information</h2>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="John"
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Doe"
                  />
                </div>
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

            {/* Dine-in seating (only when Reserve a dine is selected) */}
            {orderType === 'dine-in' && (
              <Card
                header={<h2 className="text-lg font-semibold">Dine-in seating</h2>}
              >
                <p className="text-sm text-gray-600 mb-4">This helps the restaurant prepare the right table for you.</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How many people are joining?</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dineInGuests"
                          checked={dineInGuests === 'single'}
                          onChange={() => setDineInGuests('single')}
                          className="rounded-full border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-gray-700">Single person</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dineInGuests"
                          checked={dineInGuests === 'group'}
                          onChange={() => setDineInGuests('group')}
                          className="rounded-full border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-gray-700">Group</span>
                      </label>
                    </div>
                    {dineInGuests === 'group' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Number of people</label>
                        <input
                          type="number"
                          min={2}
                          max={50}
                          value={guestCount}
                          onChange={(e) => setGuestCount(Math.max(2, Math.min(50, parseInt(e.target.value, 10) || 2)))}
                          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Children (if any)</label>
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-sm text-gray-600">Number of kids:</span>
                      <select
                        value={childrenCount}
                        onChange={(e) => setChildrenCount(parseInt(e.target.value, 10))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>{n === 0 ? 'None' : n}</option>
                        ))}
                      </select>
                    </div>
                    {childrenCount > 0 && (
                      <div className="mt-3">
                        <Input
                          label="Children ages (optional)"
                          name="childrenAges"
                          value={childrenAges}
                          onChange={(e) => setChildrenAges(e.target.value)}
                          placeholder="e.g. 5, 7 or under 5, 5–10"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ages or age ranges help the restaurant with seating and high chairs.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Payment: standard section — pay on collect or pay now (Card) */}
            <Card
              header={<h2 className="text-lg font-semibold">Payment</h2>}
            >
              {!stripeData ? (
                <>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'pay-later'}
                        onChange={() => setPaymentMethod('pay-later')}
                        className="rounded-full border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-gray-700">Pay when you collect</span>
                    </label>
                    {paymentMethod === 'pay-later' && (
                      <p className="text-sm text-gray-600 ml-6">
                        The restaurant will confirm payment at pickup or delivery.
                      </p>
                    )}
                    {stripePromise && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'pay-now'}
                            onChange={() => setPaymentMethod('pay-now')}
                            className="rounded-full border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-gray-700">Pay now — Card</span>
                        </label>
                        {paymentMethod === 'pay-now' && (
                          <p className="text-sm text-gray-600 ml-6">
                            Pay securely before placing your order. Card payment accepted.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Pay with your card.
                  </p>
                  {stripePromise && stripeData && (
                    <Elements key={stripeData.paymentIntentId} stripe={stripePromise} options={{ clientSecret: stripeData.clientSecret, appearance: { theme: 'stripe' } }}>
                      <StripePayForm
                        orderId={stripeData.orderId}
                        paymentIntentId={stripeData.paymentIntentId}
                        orderType={orderType}
                        amountDisplay={`A$${finalTotal.toFixed(2)}`}
                        onSuccess={handleStripePaymentSuccess}
                        onError={(msg) => error('Payment failed', msg)}
                      />
                    </Elements>
                  )}
                  <button
                    type="button"
                    onClick={() => { setStripeData(null); setStripeStep('form') }}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    ← Back to form
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* Order Summary - sticky on desktop, full width */}
          <div className="w-full lg:w-[380px] lg:flex-shrink-0 mt-8 lg:mt-0">
            <Card className="lg:sticky lg:top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Items (incl. GST)</h3>
                <ul className="space-y-1">
                  {items.map((item, idx) => {
                    const opts: string[] = []
                    if (item.selectedRemoves?.length) opts.push(`Remove: ${item.selectedRemoves.join(', ')}`)
                    if (item.selectedExtras?.length) opts.push(item.selectedExtras.map((e) => e.name).join(', '))
                    if (item.spiceLevel) opts.push(`Spice: ${item.spiceLevel}`)
                    if (item.specialRequest) opts.push(item.specialRequest)
                    const optText = opts.length ? ` — ${opts.join('; ')}` : ''
                    return (
                      <li key={`${item.id}-${item.selectedSize ?? ''}-${idx}`} className="flex justify-between text-sm text-gray-600">
                        <span>{item.quantity}x {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ''}{optText}</span>
                        <span>A${(priceInclGst(item.price ?? 0) * item.quantity).toFixed(2)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="space-y-2 mb-4 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>GST included (10%)</span>
                  <span>A${gstIncludedInFinalTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Service fee (incl. GST)</span>
                  <span>A$1.10</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>A${baseTotalBeforeCard.toFixed(2)}</span>
                </div>
                {paymentMethod === 'pay-now' && onlineCardSurchargePercent > 0 && (
                  <>
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>Card surcharge ({onlineCardSurchargePercent}%)</span>
                      <span>A${cardSurchargeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t-2 border-gray-300 mb-6">
                      <span>Grand Total</span>
                      <span>A${finalTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {!(paymentMethod === 'pay-now' && onlineCardSurchargePercent > 0) && (
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t-2 border-gray-300 mb-6">
                    <span>Grand Total</span>
                    <span>A${finalTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Buttons - responsive; hide when Stripe payment step is active (pay button is in Payment card) */}
              {!stripeData && (
                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-base sm:text-lg py-3 sm:py-4 min-h-[48px] sm:min-h-[56px]"
                    isLoading={isProcessing}
                  >
                    {paymentMethod === 'pay-now'
                      ? (isProcessing ? 'Preparing payment...' : 'Continue to payment')
                      : (isProcessing ? 'Placing order...' : `Place order (A$${finalTotal.toFixed(2)})`)}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </Wrapper>
      </div>
    </div>
  )
}

