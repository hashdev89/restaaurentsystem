import { Suspense } from 'react'
import { POSSystem } from '@/components/pages/POSSystem'

export default function RestaurantPOSPage({
  params
}: {
  params: { restaurantId: string }
}) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500">Loading POS...</div>}>
      <POSSystem restaurantId={params.restaurantId} />
    </Suspense>
  )
}
