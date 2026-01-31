'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard } from 'lucide-react'

export default function RestaurantDashboardRedirect() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.restaurantId) {
          router.replace(`/restaurant/${data.restaurantId}/dashboard`)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/login')
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => { cancelled = true }
  }, [router])

  if (!checking) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LayoutDashboard className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Loading your dashboard…</p>
      </div>
    </div>
  )
}
