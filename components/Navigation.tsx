'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  ShoppingBag, 
  Package, 
  ChefHat, 
  CreditCard, 
  LayoutDashboard,
  Shield,
  Menu,
  X
} from 'lucide-react'
import { useCart } from './providers/CartProvider'
import { Button } from './ui/Button'

export function Navigation() {
  const pathname = usePathname()
  const { itemCount } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Hide navigation on POS page
  if (pathname === '/pos') {
    return null
  }

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/cart', label: 'Cart', icon: ShoppingBag, badge: itemCount },
  ]

  const staffLinks = [
    { href: '/kitchen', label: 'Kitchen', icon: ChefHat },
    { href: '/pos', label: 'POS', icon: CreditCard },
    { href: '/restaurant/dashboard', label: 'Restaurant Login', icon: LayoutDashboard },
    { href: '/system/dashboard', label: 'System', icon: Shield },
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="w-6 h-6 text-orange-600" />
            <span className="text-xl font-bold text-gray-900">RestaurantHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive(link.href) ? 'primary' : 'ghost'}
                    size="sm"
                    className="relative"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                    {link.badge !== undefined && (
                      <span className={`ml-2 text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.25rem] text-center ${link.badge > 0 ? 'bg-orange-600 text-white' : 'bg-transparent text-transparent'}`}>
                        {link.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              )
            })}

            {/* Staff Links Separator */}
            <div className="mx-2 h-6 w-px bg-gray-300" />

            {staffLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive(link.href) ? 'primary' : 'ghost'}
                    size="sm"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          {/* Mobile: menu button */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {link.label}
                    {link.badge !== undefined && (
                      <span className={`ml-auto text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.25rem] text-center ${link.badge > 0 ? 'bg-orange-600 text-white' : 'bg-transparent text-transparent'}`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                )
              })}

              <div className="my-2 border-t border-gray-200" />

              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Staff
              </div>

              {staffLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

