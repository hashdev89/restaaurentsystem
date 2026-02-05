import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/components/providers/CartProvider'
import { NotificationProvider } from '@/components/providers/NotificationProvider'
import { Navigation } from '@/components/Navigation'
import { NotificationToasts } from '@/components/NotificationToasts'

export const metadata: Metadata = {
  title: 'EasyMenu - Search Easy & Order Easy',
  description: 'Search Easy & Order Easy. Order food from your favorite restaurants.',
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
          <NotificationProvider>
            <Navigation />
            {children}
            <NotificationToasts />
          </NotificationProvider>
        </CartProvider>
      </body>
    </html>
  )
}

