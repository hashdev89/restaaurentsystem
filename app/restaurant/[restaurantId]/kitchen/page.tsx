import { KitchenDisplaySystem } from '@/components/pages/KitchenDisplaySystem'

export default function RestaurantKitchenPage({
  params
}: {
  params: { restaurantId: string }
}) {
  return <KitchenDisplaySystem restaurantId={params.restaurantId} />
}
