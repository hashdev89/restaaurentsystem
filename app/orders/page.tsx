import { Suspense } from 'react'
import { OrderTracking } from '@/components/pages/OrderTracking'

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-gray-500">Loading...</div>}>
      <OrderTracking />
    </Suspense>
  )
}

