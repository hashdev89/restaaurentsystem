import { POSSystem } from '@/components/pages/POSSystem'

export default function RestaurantPOSPage({
  params
}: {
  params: { restaurantId: string }
}) {
  return <POSSystem restaurantId={params.restaurantId} />
}
