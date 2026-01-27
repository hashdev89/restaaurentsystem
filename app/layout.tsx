import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/components/providers/CartProvider'
import { Navigation } from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Restaurant Ordering System',
  description: 'Order food from your favorite restaurants',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Navigation />
          {children}
        </CartProvider>
      </body>
    </html>
  )
}

