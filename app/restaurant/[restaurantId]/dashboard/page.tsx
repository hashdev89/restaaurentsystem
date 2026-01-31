import { RestaurantDashboard } from '@/components/pages/RestaurantDashboard'

export default function RestaurantDashboardPage({
  params
}: {
  params: { restaurantId: string }
}) {
  return <RestaurantDashboard restaurantId={params.restaurantId} />
}
