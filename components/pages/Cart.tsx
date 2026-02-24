'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { useCart, getCartLineKey } from '../providers/CartProvider'
import { CartItem } from '../CartItem'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { gstAmount, addGst } from '@/lib/gst'

export function Cart() {
  const { items, total } = useCart()
  const router = useRouter()
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

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-full mb-6 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 text-center max-w-sm">
          Looks like you haven't added anything to your cart yet. Browse our menu to find something delicious!
        </p>
        <Link href="/">
          <Button size="lg">Browse Menu</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <div className="flex-1 w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 lg:min-h-[calc(100vh-4rem)]">
        <div className="flex items-center mb-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4 flex-shrink-0">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Your Order</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Cart Items List - relative z-10 so quantity buttons are never covered */}
          <div className="lg:col-span-2 min-w-0 relative z-10">
            <Card className="mb-6 lg:mb-0 overflow-visible">
              <div className="divide-y divide-gray-100 relative">
                {items.map((item, index) => (
                  <CartItem key={`${item.id}-${item.selectedSize ?? ''}-${getCartLineKey(item)}-${index}`} item={item} />
                ))}
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 min-w-0">
            <Card className="lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Items (incl. GST)</h3>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span>{item.quantity}x {item.name}</span>
                      <span>A${(addGst(item.price * item.quantity)).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2 mb-4 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>GST included (10%)</span>
                  <span>A${gstAmount(total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Service fee (incl. GST)</span>
                  <span>A$1.10</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>A${(addGst(total) + 1.1).toFixed(2)}</span>
                </div>
                {onlineCardSurchargePercent > 0 && (
                  <>
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>Card surcharge ({onlineCardSurchargePercent}%)</span>
                      <span>A${( (addGst(total) + 1.1) * (onlineCardSurchargePercent / 100) ).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t-2 border-gray-300">
                      <span>Grand Total</span>
                      <span>A${( (addGst(total) + 1.1) * (1 + onlineCardSurchargePercent / 100) ).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {onlineCardSurchargePercent <= 0 && (
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t-2 border-gray-300">
                    <span>Grand Total</span>
                    <span>A${(addGst(total) + 1.1).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full min-h-[48px] sm:min-h-[56px] text-base sm:text-lg py-3 sm:py-4"
                size="lg"
                onClick={() => router.push('/checkout')}
              >
                Proceed to Checkout
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

