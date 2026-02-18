import { Suspense } from 'react'
import { POSSystem } from '@/components/pages/POSSystem'

export default function POSPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500">Loading POS...</div>}>
      <POSSystem />
    </Suspense>
  )
}
