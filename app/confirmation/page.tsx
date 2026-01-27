import { Suspense } from 'react'
import { OrderConfirmation } from '@/components/pages/OrderConfirmation'

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <OrderConfirmation />
    </Suspense>
  )
}

