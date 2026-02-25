'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  Search,
  ShoppingCart,
  CreditCard,
  X,
  Plus,
  Minus,
  Coffee,
  UtensilsCrossed,
  IceCream,
  GlassWater,
  Pizza,
  ChefHat,
  Trash2,
  Check,
  DollarSign,
  Wallet,
  Receipt,
  Printer,
  User,
  Percent,
  Star,
  ArrowLeft,
  Clock,
  TrendingUp,
  Pencil,
  ScanBarcode,
  Home,
  Settings,
  BarChart3,
  Headphones,
  GripVertical
} from 'lucide-react'
import { useNotification } from '../providers/NotificationProvider'
import { NotificationCenter } from '../NotificationCenter'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { POSKeyboardProvider, POSInput } from '../POSOnScreenKeyboard'
import { Dialog, DialogContent } from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { cn } from '@/lib/utils'
import { GST_RATE, priceInclGst } from '@/lib/gst'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'
import { OrderType, type Order, type MenuItem } from '@/types'
import { MenuItemForm } from '../MenuItemForm'

// Types
interface CustomizationOption {
  id: string
  name: string
  price: number
}

interface CustomizationGroup {
  id: string
  name: string
  type: 'add' | 'remove' | 'extra'
  options: CustomizationOption[]
  maxSelections?: number
}

interface POSCategory {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  subItems: POSSubItem[]
}

/** Preset colors for food categories (Tailwind classes). */
const CATEGORY_COLOR_OPTIONS: { value: string; bgColor: string; color: string }[] = [
  { value: 'orange', bgColor: 'bg-orange-500', color: 'text-orange-600' },
  { value: 'green', bgColor: 'bg-green-500', color: 'text-green-600' },
  { value: 'blue', bgColor: 'bg-blue-500', color: 'text-blue-600' },
  { value: 'red', bgColor: 'bg-red-500', color: 'text-red-600' },
  { value: 'amber', bgColor: 'bg-amber-500', color: 'text-amber-600' },
  { value: 'purple', bgColor: 'bg-purple-500', color: 'text-purple-600' },
  { value: 'teal', bgColor: 'bg-teal-500', color: 'text-teal-600' },
  { value: 'pink', bgColor: 'bg-pink-500', color: 'text-pink-600' },
  { value: 'gray', bgColor: 'bg-gray-500', color: 'text-gray-700' },
]

interface POSSubItem {
  id: string
  name: string
  description: string
  basePrice: number
  isAvailable: boolean
  popular?: boolean
  image: string
  /** Small / Medium / Large with separate prices. When set, basePrice is fallback; selected size price is used when adding. */
  sizes?: { name: string; price: number }[]
  /** Custom customization groups for this item (used when adding/editing items). If set, overrides getDefaultCustomizations by id prefix. */
  customizations?: CustomizationGroup[]
}

interface SelectedCustomization {
  groupId: string
  groupName: string
  optionIds: string[]
  optionNames: string[]
  totalPrice: number
}

interface CartItem {
  id: string
  name: string
  description: string
  basePrice: number // Price ex GST
  quantity: number
  categoryName: string
  customizations: SelectedCustomization[]
  finalPrice: number // Price incl GST (basePrice + customizations) * 1.1
  gstAmount: number // GST amount per item (basePrice + customizations) * GST_RATE
  notes?: string
  /** Display label when item was added with a size (e.g. Small, Medium, Large). */
  selectedSize?: string
}

type PaymentMethod = 'card' | 'cash' | 'mix'
type DiscountType = 'percentage' | 'fixed'

interface Discount {
  type: DiscountType
  value: number
  name?: string
}

/** Local POS order summary (completed orders list in POS), not the API Order type */
interface POSOrderSummary {
  id: string
  orderNumber: number
  items: CartItem[]
  total: number
  subtotalExGst: number
  totalGst: number
  discount: Discount | null
  tip: number
  paymentMethod: PaymentMethod
  paymentStatus: string
  orderType: OrderType
  tableNumber: string
  customerName: string
  createdAt: string
  status: string
}

/** Transaction row shown in POS Transactions tab */
interface POSTransaction {
  id: string
  orderId?: string
  orderNumber: number
  amount: number
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  items: number
}

/** Receipt/bill customization from Restaurant Dashboard */
interface PosReceiptState {
  businessName: string
  abn: string
  address: string
  phone: string
  numberPrefix: string
  showQrCode: boolean
  footerText: string
}

// Australian Restaurant Menu Data with Images
const POS_CATEGORIES: POSCategory[] = [
  {
    id: 'burgers',
    name: 'Burgers',
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    subItems: [
      { 
        id: 'burger_1', 
        name: 'Aussie Beef Burger', 
        description: 'Premium beef patty, beetroot, egg, bacon, cheese, lettuce, tomato, onion', 
        basePrice: 18.50, 
        isAvailable: true, 
        popular: true,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'
      },
      { 
        id: 'burger_2', 
        name: 'Chicken Schnitzel Burger', 
        description: 'Crispy chicken schnitzel, lettuce, tomato, mayo, special sauce', 
        basePrice: 16.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&q=80'
      },
      { 
        id: 'burger_3', 
        name: 'Cheese Burger', 
        description: 'Beef patty, cheese, lettuce, tomato, onion, pickles', 
        basePrice: 15.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80'
      },
      { 
        id: 'burger_4', 
        name: 'Veggie Burger', 
        description: 'Plant-based patty, avocado, lettuce, tomato, aioli', 
        basePrice: 14.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1525059696034-4967a7290028?w=800&q=80'
      },
      { 
        id: 'burger_5', 
        name: 'Double Cheese Burger', 
        description: 'Two beef patties, double cheese, special sauce, pickles', 
        basePrice: 21.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433f?w=800&q=80'
      },
    ]
  },
  {
    id: 'pizzas',
    name: 'Pizzas',
    icon: Pizza,
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    subItems: [
      { 
        id: 'pizza_1', 
        name: 'Margherita', 
        description: 'Tomato, mozzarella, fresh basil', 
        basePrice: 16.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80'
      },
      { 
        id: 'pizza_2', 
        name: 'Pepperoni', 
        description: 'Pepperoni, mozzarella, tomato sauce', 
        basePrice: 19.99, 
        isAvailable: true, 
        popular: true,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80'
      },
      { 
        id: 'pizza_3', 
        name: 'Hawaiian', 
        description: 'Ham, pineapple, mozzarella, tomato sauce', 
        basePrice: 20.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80'
      },
      { 
        id: 'pizza_4', 
        name: 'BBQ Chicken', 
        description: 'Chicken, BBQ sauce, red onion, mozzarella', 
        basePrice: 22.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80'
      },
      { 
        id: 'pizza_5', 
        name: 'Vegetarian', 
        description: 'Mixed vegetables, mozzarella, tomato sauce', 
        basePrice: 18.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80'
      },
    ]
  },
  {
    id: 'drinks',
    name: 'Drinks',
    icon: GlassWater,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    subItems: [
      { 
        id: 'drink_1', 
        name: 'Coca Cola', 
        description: '330ml can', 
        basePrice: 4.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80'
      },
      { 
        id: 'drink_2', 
        name: 'Orange Juice', 
        description: 'Fresh squeezed Australian oranges', 
        basePrice: 5.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80'
      },
      { 
        id: 'drink_3', 
        name: 'Bottled Water', 
        description: 'Still water', 
        basePrice: 3.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&q=80'
      },
      { 
        id: 'drink_4', 
        name: 'Iced Tea', 
        description: 'Lemon iced tea', 
        basePrice: 4.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'
      },
      { 
        id: 'drink_5', 
        name: 'Lemon Lime & Bitters', 
        description: 'Classic Australian soft drink', 
        basePrice: 4.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80'
      },
    ]
  },
  {
    id: 'coffee',
    name: 'Coffee',
    icon: Coffee,
    color: 'text-amber-600',
    bgColor: 'bg-amber-600',
    subItems: [
      { 
        id: 'coffee_1', 
        name: 'Flat White', 
        description: 'Double espresso, microfoam milk', 
        basePrice: 4.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&q=80'
      },
      { 
        id: 'coffee_2', 
        name: 'Cappuccino', 
        description: 'Espresso, steamed milk, foam', 
        basePrice: 4.50, 
        isAvailable: true, 
        popular: true,
        image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80'
      },
      { 
        id: 'coffee_3', 
        name: 'Latte', 
        description: 'Espresso, steamed milk', 
        basePrice: 4.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80'
      },
      { 
        id: 'coffee_4', 
        name: 'Long Black', 
        description: 'Double espresso with hot water', 
        basePrice: 4.00, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&q=80'
      },
      { 
        id: 'coffee_5', 
        name: 'Mocha', 
        description: 'Espresso, chocolate, steamed milk', 
        basePrice: 5.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80'
      },
    ]
  },
  {
    id: 'desserts',
    name: 'Desserts',
    icon: IceCream,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500',
    subItems: [
      { 
        id: 'dessert_1', 
        name: 'Pavlova', 
        description: 'Classic Australian meringue with cream and fresh fruits', 
        basePrice: 12.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80'
      },
      { 
        id: 'dessert_2', 
        name: 'Lamington', 
        description: 'Sponge cake with chocolate and coconut', 
        basePrice: 6.50, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80'
      },
      { 
        id: 'dessert_3', 
        name: 'Chocolate Cake', 
        description: 'Rich chocolate cake slice', 
        basePrice: 8.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80'
      },
      { 
        id: 'dessert_4', 
        name: 'Ice Cream', 
        description: 'Vanilla, chocolate, or strawberry', 
        basePrice: 6.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80'
      },
      { 
        id: 'dessert_5', 
        name: 'Sticky Date Pudding', 
        description: 'Warm date pudding with butterscotch sauce', 
        basePrice: 11.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80'
      },
    ]
  },
  {
    id: 'mains',
    name: 'Mains',
    icon: ChefHat,
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    subItems: [
      { 
        id: 'main_1', 
        name: 'Fish & Chips', 
        description: 'Beer-battered barramundi, hand-cut chips, tartar sauce, lemon', 
        basePrice: 24.99, 
        isAvailable: true, 
        popular: true,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
      },
      { 
        id: 'main_2', 
        name: 'Aussie Steak', 
        description: 'Ribeye steak, chips, salad, mushroom sauce', 
        basePrice: 32.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80'
      },
      { 
        id: 'main_3', 
        name: 'Chicken Parma', 
        description: 'Chicken parmigiana, chips, salad', 
        basePrice: 22.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&q=80'
      },
      { 
        id: 'main_4', 
        name: 'Lamb Roast', 
        description: 'Slow-roasted lamb, roast vegetables, gravy', 
        basePrice: 28.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&q=80'
      },
      { 
        id: 'main_5', 
        name: 'Aussie Meat Pie', 
        description: 'Traditional meat pie with chips and sauce', 
        basePrice: 14.99, 
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'
      },
    ]
  },
]

const getDefaultCustomizations = (itemId: string, item?: POSSubItem): CustomizationGroup[] => {
  // Use item's own customizations when set (add/edit item flow)
  if (item?.customizations?.length) return item.customizations

  // Burgers
  if (itemId.startsWith('burger_')) {
    return [
      {
        id: 'extras',
        name: 'Extras',
        type: 'extra',
        options: [
          { id: 'extra_cheese', name: 'Extra Cheese', price: 2.00 },
          { id: 'extra_bacon', name: 'Extra Bacon', price: 3.00 },
          { id: 'avocado', name: 'Avocado', price: 2.50 },
          { id: 'fried_egg', name: 'Fried Egg', price: 2.00 },
          { id: 'onion_rings', name: 'Onion Rings', price: 3.50 },
          { id: 'beetroot', name: 'Beetroot', price: 1.50 },
        ]
      },
      {
        id: 'remove_options',
        name: 'Remove options',
        type: 'remove',
        options: [
          { id: 'no_onion', name: 'No Onion', price: 0 },
          { id: 'no_tomato', name: 'No Tomato', price: 0 },
          { id: 'no_lettuce', name: 'No Lettuce', price: 0 },
          { id: 'no_pickles', name: 'No Pickles', price: 0 },
          { id: 'no_mayo', name: 'No Mayo', price: 0 },
          { id: 'no_beetroot', name: 'No Beetroot', price: 0 },
        ]
      }
    ]
  }
  
  // Pizzas
  if (itemId.startsWith('pizza_')) {
    return [
      {
        id: 'extras',
        name: 'Extras',
        type: 'extra',
        options: [
          { id: 'extra_cheese', name: 'Extra Cheese', price: 3.00 },
          { id: 'mushrooms', name: 'Mushrooms', price: 2.50 },
          { id: 'olives', name: 'Olives', price: 2.50 },
          { id: 'peppers', name: 'Bell Peppers', price: 2.50 },
          { id: 'pepperoni', name: 'Pepperoni', price: 3.50 },
          { id: 'ham', name: 'Ham', price: 3.00 },
        ]
      },
      {
        id: 'remove_options',
        name: 'Remove options',
        type: 'remove',
        options: [
          { id: 'no_onion', name: 'No Onion', price: 0 },
          { id: 'no_olives', name: 'No Olives', price: 0 },
        ]
      }
    ]
  }
  
  // Coffee
  if (itemId.startsWith('coffee_')) {
    return [
      {
        id: 'milk_options',
        name: 'Milk Options',
        type: 'extra',
        options: [
          { id: 'almond_milk', name: 'Almond Milk', price: 0.80 },
          { id: 'oat_milk', name: 'Oat Milk', price: 0.80 },
          { id: 'soy_milk', name: 'Soy Milk', price: 0.80 },
          { id: 'skim_milk', name: 'Skim Milk', price: 0 },
          { id: 'full_cream', name: 'Full Cream', price: 0 },
        ],
        maxSelections: 1
      },
      {
        id: 'extras',
        name: 'Extras',
        type: 'extra',
        options: [
          { id: 'extra_shot', name: 'Extra Shot', price: 1.50 },
          { id: 'sugar', name: 'Sugar', price: 0 },
          { id: 'sweetener', name: 'Sweetener', price: 0 },
          { id: 'cinnamon', name: 'Cinnamon', price: 0.50 },
        ]
      }
    ]
  }
  
  // Drinks - Size options
  if (itemId.startsWith('drink_')) {
    return [
      {
        id: 'size',
        name: 'Size',
        type: 'extra',
        options: [
          { id: 'size_330ml', name: '330ml', price: 0 },
          { id: 'size_500ml', name: '500ml', price: 1.50 },
          { id: 'size_1L', name: '1 Liter', price: 3.00 },
        ],
        maxSelections: 1
      },
      {
        id: 'ice_options',
        name: 'Ice Options',
        type: 'extra',
        options: [
          { id: 'no_ice', name: 'No Ice', price: 0 },
          { id: 'extra_ice', name: 'Extra Ice', price: 0 },
        ]
      }
    ]
  }
  
  // Mains
  if (itemId.startsWith('main_')) {
    return [
      {
        id: 'sides',
        name: 'Sides',
        type: 'add',
        options: [
          { id: 'extra_chips', name: 'Extra Chips', price: 4.50 },
          { id: 'garlic_bread', name: 'Garlic Bread', price: 5.50 },
          { id: 'salad', name: 'Side Salad', price: 4.50 },
          { id: 'onion_rings', name: 'Onion Rings', price: 5.50 },
        ]
      },
      {
        id: 'sauce_options',
        name: 'Sauce Options',
        type: 'extra',
        options: [
          { id: 'gravy', name: 'Gravy', price: 0 },
          { id: 'mushroom_sauce', name: 'Mushroom Sauce', price: 0 },
          { id: 'pepper_sauce', name: 'Pepper Sauce', price: 0 },
          { id: 'no_sauce', name: 'No Sauce', price: 0 },
        ],
        maxSelections: 1
      }
    ]
  }
  
  // Desserts
  if (itemId.startsWith('dessert_')) {
    return [
      {
        id: 'extras',
        name: 'Extras',
        type: 'extra',
        options: [
          { id: 'ice_cream', name: 'Ice Cream', price: 3.50 },
          { id: 'cream', name: 'Cream', price: 2.00 },
          { id: 'chocolate_sauce', name: 'Chocolate Sauce', price: 1.50 },
        ]
      }
    ]
  }
  
  return []
}

/** Map API menu items (from Restaurant Dashboard) to POS categories + subItems. */
function buildCategoriesFromMenuItems(items: { id: string; name: string; description: string; price: number; category: string; image: string; isAvailable: boolean; customizations?: CustomizationGroup[]; sizes?: { name: string; price: number }[] }[]): POSCategory[] {
  const byCategory = new Map<string, typeof items>()
  for (const item of items) {
    const cat = item.category?.trim() || 'Other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    const list = byCategory.get(cat)
    if (list) list.push(item)
  }
  return Array.from(byCategory.entries()).map(([name, catItems], idx) => {
    const colorOpt = CATEGORY_COLOR_OPTIONS[idx % CATEGORY_COLOR_OPTIONS.length]
    return {
    id: `cat_${name.replace(/\s+/g, '_')}`,
    name,
    icon: UtensilsCrossed,
    color: colorOpt.color,
    bgColor: colorOpt.bgColor,
    subItems: catItems.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description ?? '',
      basePrice: Number(i.price) || 0,
      image: i.image ?? '',
      isAvailable: i.isAvailable !== false,
      popular: false,
      sizes: i.sizes && i.sizes.length > 0 ? i.sizes : undefined,
      customizations: i.customizations && i.customizations.length > 0 ? i.customizations : undefined,
    })),
  }
  })
}

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const posStripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toOrderUuid(value: string | undefined): string | null {
  const s = (value ?? '').trim()
  if (!s) return null
  if (UUID_REGEX.test(s)) return s
  const uuidPart = s.slice(0, 36)
  if (UUID_REGEX.test(uuidPart)) return uuidPart
  return null
}

type POSStripePayFormProps = {
  orderId: string
  paymentIntentId: string
  amountDisplay: string
  onSuccess: () => void
  onError: (message: string) => void
}

function POSStripePayForm({ orderId, paymentIntentId, amountDisplay, onSuccess, onError }: POSStripePayFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isConfirming, setIsConfirming] = useState(false)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsConfirming(true)
    try {
      const returnUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${typeof window !== 'undefined' ? window.location.pathname : '/pos'}?posOrderId=${encodeURIComponent(orderId)}`
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl, receipt_email: undefined }
      })
      if (error) {
        onError(error.message || 'Payment failed')
        return
      }
      const res = await fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentIntentId })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        onError(data.error || 'Could not confirm payment')
        return
      }
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card', 'link'] }} />
      <Button type="submit" size="lg" className="w-full" isLoading={isConfirming} disabled={!stripe || isConfirming}>
        {isConfirming ? 'Processing...' : `Pay ${amountDisplay}`}
      </Button>
    </form>
  )
}

export function POSSystem({ restaurantId: restaurantIdProp }: { restaurantId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, warning } = useNotification()
  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<POSSubItem | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('dine-in')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [cashierName, setCashierName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCustomizationModal, setShowCustomizationModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({})
  /** Per-item selected size (Small/Medium/Large) for items that have sizes; used when adding to cart. */
  const [selectedSizeByItemId, setSelectedSizeByItemId] = useState<Record<string, { name: string; price: number }>>({})
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  /** Cash received from customer (for change calculation when payment method is cash) */
  const [cashTendered, setCashTendered] = useState('')
  /** Mix payment: card portion (A$) and cash portion (A$); must sum to total */
  const [mixCardAmount, setMixCardAmount] = useState('')
  const [mixCashAmount, setMixCashAmount] = useState('')
  const [discount, setDiscount] = useState<Discount | null>(null)
  const [tip, setTip] = useState(0)
  const [tipPercentage, setTipPercentage] = useState<number | null>(null)
  const [orderNumber, setOrderNumber] = useState(1)
  /** Receipt number sequence: 1, 2, 3… so receipt no is 001, 002, 003, etc. */
  const [receiptSequence, setReceiptSequence] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [activeSection, setActiveSection] = useState<'menu' | 'orders' | 'more'>('menu')
  const [moreSubSection, setMoreSubSection] = useState<'main' | 'transactions' | 'items' | 'reports' | 'printTest' | 'dailySummary' | 'settings' | 'support'>('main')
  const [posLanguage, setPosLanguage] = useState('en')
  const [posCurrency, setPosCurrency] = useState('AUD')
  const [posTimezone, setPosTimezone] = useState('Australia/Sydney')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportType, setSupportType] = useState<'issue' | 'technical'>('issue')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [orders, setOrders] = useState<POSOrderSummary[]>([])
  const [pendingOrdersFromApi, setPendingOrdersFromApi] = useState<Order[]>([])
  const [pendingOrdersLoading, setPendingOrdersLoading] = useState(false)
  const [transactions, setTransactions] = useState<POSTransaction[]>([])
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<POSSubItem | null>(null)
  const [, setItemFormData] = useState<Partial<POSSubItem> & { categoryId?: string; newCategoryName?: string; removeOptions?: CustomizationOption[]; extras?: CustomizationOption[] }>({})
  const [defaultRestaurantId, setDefaultRestaurantId] = useState<string>('')
  const [barcodeScanValue, setBarcodeScanValue] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  /** When set, cart was loaded from a ready order; completing payment will PATCH this order to completed instead of creating a new order */
  const [orderIdForBilling, setOrderIdForBilling] = useState<string | null>(null)
  /** Card payment via Stripe: 'method' = choose payment type, 'card-form' = show Stripe Payment Element */
  const [paymentStep, setPaymentStep] = useState<'method' | 'card-form'>('method')
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null)
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null)
  const [stripeOrderNumber, setStripeOrderNumber] = useState<number>(0)
  // Categories state so we can add/edit/delete items (initialized from POS_CATEGORIES)
  const [categories, setCategories] = useState<POSCategory[]>(() =>
    POS_CATEGORIES.map(cat => ({ ...cat, subItems: cat.subItems.map(s => ({ ...s })) }))
  )
  // Drag-and-drop reorder (Items screen)
  const [dragCategoryIndex, setDragCategoryIndex] = useState<number | null>(null)
  const [dragItem, setDragItem] = useState<{ categoryId: string; itemIndex: number } | null>(null)
  // New category color when adding item with new category (POS only)
  const [newCategoryColor, setNewCategoryColor] = useState<string>('orange')

  // POS access gate when linked to restaurant: enabled flag + optional 4-digit PIN
  const [posAccess, setPosAccess] = useState<{ posEnabled: boolean; posPinRequired: boolean } | null>(null)
  const [posPinVerified, setPosPinVerified] = useState(false)
  const [posPinInput, setPosPinInput] = useState('')
  const [posPinError, setPosPinError] = useState('')

  // Surcharge settings from Restaurant Dashboard (Sunday / public holiday / card)
  const [posSurcharge, setPosSurcharge] = useState<{
    sundaySurchargeEnabled: boolean
    sundaySurchargePercent: number
    publicHolidaySurchargeEnabled: boolean
    publicHolidaySurchargePercent: number
    publicHolidayDates: string[]
    surchargeManualOverride: 'auto' | 'sunday' | 'public_holiday' | 'none'
    posCardSurchargePercent: number
  }>({
    sundaySurchargeEnabled: false,
    sundaySurchargePercent: 0,
    publicHolidaySurchargeEnabled: false,
    publicHolidaySurchargePercent: 0,
    publicHolidayDates: [],
    surchargeManualOverride: 'auto',
    posCardSurchargePercent: 0,
  })

  // Receipt/bill customization from Restaurant Dashboard
  const [posReceipt, setPosReceipt] = useState<PosReceiptState>({
    businessName: '',
    abn: '',
    address: '',
    phone: '',
    numberPrefix: '001',
    showQrCode: true,
    footerText: '',
  })

  /** Format receipt number as 001, 002, 003, … (3-digit sequence; first order = 001). */
  const formatReceiptNo = useCallback((sequence: number) => {
    return String(sequence).padStart(3, '0')
  }, [])

  // When linked to a restaurant (e.g. /restaurant/[id]/pos), use that restaurant and load menu from API
  const [, setMenuSyncLoading] = useState(false)
  const fetchMenuFromApi = useCallback(async (rid: string) => {
    setMenuSyncLoading(true)
    try {
      const res = await fetch(`/api/menu-items?restaurantId=${encodeURIComponent(rid)}`)
      if (!res.ok) return
      const data = await res.json()
      const items = data.items ?? []
      const built = buildCategoriesFromMenuItems(items)
      setCategories(built)
    } catch (e) {
      console.error('POS fetch menu error:', e)
    } finally {
      setMenuSyncLoading(false)
    }
  }, [])

  useEffect(() => {
    if (restaurantIdProp) {
      setDefaultRestaurantId(restaurantIdProp)
      fetchMenuFromApi(restaurantIdProp)
      setPosPinVerified(false)
      setPosAccess(null)
      fetch(`/api/restaurants/${restaurantIdProp}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          const r = data?.restaurant
          if (r) {
            setPosAccess({ posEnabled: r.posEnabled !== false, posPinRequired: r.posPinRequired === true })
            setPosSurcharge({
              sundaySurchargeEnabled: r.sundaySurchargeEnabled === true,
              sundaySurchargePercent: Number(r.sundaySurchargePercent) || 0,
              publicHolidaySurchargeEnabled: r.publicHolidaySurchargeEnabled === true,
              publicHolidaySurchargePercent: Number(r.publicHolidaySurchargePercent) || 0,
              publicHolidayDates: Array.isArray(r.publicHolidayDates) ? r.publicHolidayDates : [],
              surchargeManualOverride: r.surchargeManualOverride === 'sunday' || r.surchargeManualOverride === 'public_holiday' || r.surchargeManualOverride === 'none' ? r.surchargeManualOverride : 'auto',
              posCardSurchargePercent: Number(r.posCardSurchargePercent) ?? 0,
            })
            setPosReceipt({
              businessName: r.receiptBusinessName ?? r.name ?? 'ABC Retail Pty Ltd',
              abn: r.receiptAbn ?? '',
              address: r.receiptAddress ?? r.address ?? '',
              phone: r.receiptPhone ?? r.phone ?? '',
              numberPrefix: (r.receiptNumberPrefix ?? '001').toString().trim() || '001',
              showQrCode: r.receiptShowQrCode !== false,
              footerText: r.receiptFooterText ?? '',
            })
          }
        })
        .catch(() => setPosAccess({ posEnabled: true, posPinRequired: false }))
      return
    }
    setPosAccess(null)
    setPosPinVerified(false)
    const envId = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID : undefined
    if (envId) {
      setDefaultRestaurantId(envId)
      return
    }
    let cancelled = false
    fetch('/api/restaurants')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data?.restaurants?.length) return
        setDefaultRestaurantId(data.restaurants[0].id)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [restaurantIdProp, fetchMenuFromApi])

  // Load surcharge settings when defaultRestaurantId is set (e.g. from env or list, not from URL)
  useEffect(() => {
    if (!defaultRestaurantId || restaurantIdProp) return
    fetch(`/api/restaurants/${defaultRestaurantId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const r = data?.restaurant
        if (r) {
          setPosSurcharge({
            sundaySurchargeEnabled: r.sundaySurchargeEnabled === true,
            sundaySurchargePercent: Number(r.sundaySurchargePercent) || 0,
            publicHolidaySurchargeEnabled: r.publicHolidaySurchargeEnabled === true,
            publicHolidaySurchargePercent: Number(r.publicHolidaySurchargePercent) || 0,
            publicHolidayDates: Array.isArray(r.publicHolidayDates) ? r.publicHolidayDates : [],
            surchargeManualOverride: r.surchargeManualOverride === 'sunday' || r.surchargeManualOverride === 'public_holiday' || r.surchargeManualOverride === 'none' ? r.surchargeManualOverride : 'auto',
            posCardSurchargePercent: Number(r.posCardSurchargePercent) ?? 0,
          })
          setPosReceipt({
            businessName: r.receiptBusinessName ?? r.name ?? 'ABC Retail Pty Ltd',
            abn: r.receiptAbn ?? '',
            address: r.receiptAddress ?? r.address ?? '',
            phone: r.receiptPhone ?? r.phone ?? '',
            numberPrefix: (r.receiptNumberPrefix ?? '001').toString().trim() || '001',
            showQrCode: r.receiptShowQrCode !== false,
            footerText: r.receiptFooterText ?? '',
          })
        }
      })
      .catch(() => { /* ignore */ })
  }, [defaultRestaurantId, restaurantIdProp])

  // Only show loading spinner on first fetch for Orders tab; background refresh stays silent
  const ordersInitialLoadDone = useRef(false)
  const fetchPendingOrders = useCallback(async () => {
    if (!defaultRestaurantId) return
    if (!ordersInitialLoadDone.current) setPendingOrdersLoading(true)
    try {
      const res = await fetch(`/api/orders?restaurantId=${encodeURIComponent(defaultRestaurantId)}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.orders ?? []) as SupabaseOrderRow[]
      const normalized = normalizeOrders(list)
      const normStatus = (s: string) => String(s ?? '').toLowerCase().trim()
      const withNormStatus = normalized.map((o) => ({ ...o, status: normStatus(o.status) as Order['status'] }))
      setPendingOrdersFromApi(withNormStatus.filter((o) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)))
    } catch (e) {
      console.error('POS fetch pending orders error:', e)
    } finally {
      ordersInitialLoadDone.current = true
      setPendingOrdersLoading(false)
    }
  }, [defaultRestaurantId])

  // Handle redirect back from Stripe (e.g. after 3DS): confirm payment and clear URL
  const stripePosRedirectDone = useRef(false)
  useEffect(() => {
    const posOrderId = searchParams.get('posOrderId')
    const paymentIntent = searchParams.get('payment_intent')
    const redirectStatus = searchParams.get('redirect_status')
    if (!posOrderId || !paymentIntent || redirectStatus !== 'succeeded' || stripePosRedirectDone.current) return
    stripePosRedirectDone.current = true
    fetch('/api/stripe/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: posOrderId, paymentIntentId: paymentIntent })
    })
      .then(() => {
        success('Payment complete', 'Card payment confirmed. Order has been completed.')
        fetchPendingOrders()
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        router.replace(window.location.pathname, { scroll: false })
      })
  }, [searchParams, success, router, fetchPendingOrders])

  useEffect(() => {
    if (activeSection !== 'orders' || !defaultRestaurantId) return
    fetchPendingOrders()
    const interval = setInterval(fetchPendingOrders, 8000)
    return () => clearInterval(interval)
  }, [activeSection, defaultRestaurantId, fetchPendingOrders])

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = categories.flatMap(cat => cat.subItems)
    
    if (selectedCategory) {
      items = categories.find(cat => cat.id === selectedCategory)?.subItems || []
    }
    
    if (searchQuery) {
      items = items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return items.filter(item => item.isAvailable)
  }, [selectedCategory, searchQuery, categories])

  // Get available item count for each category (use current categories so API-synced menu works)
  const getCategoryItemCount = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.subItems.filter(item => item.isAvailable).length : 0
  }

  // Calculations - GST per item approach
  // Subtotal ex GST (sum of base prices + customizations, before GST)
  const subtotalExGst = useMemo(() => 
    cart.reduce((sum, item) => {
      // basePrice is ex GST, customizations are ex GST
      const itemPriceExGst = item.basePrice + item.customizations.reduce((s, c) => s + c.totalPrice, 0)
      return sum + itemPriceExGst * item.quantity
    }, 0), [cart]
  )

  // Total GST amount (sum of GST from all items)
  const totalGst = useMemo(() => 
    cart.reduce((sum, item) => sum + item.gstAmount * item.quantity, 0), [cart]
  )

  // Subtotal incl GST (for display purposes)
  const subtotalInclGst = useMemo(() => 
    subtotalExGst + totalGst, [subtotalExGst, totalGst]
  )

  const discountAmount = useMemo(() => {
    if (!discount) return 0
    if (discount.type === 'percentage') {
      // Apply discount to subtotal incl GST
      return subtotalInclGst * (discount.value / 100)
    }
    return discount.value
  }, [discount, subtotalInclGst])

  // Which surcharge applies today (from Restaurant Dashboard settings)
  const surchargeApplied = useMemo(() => {
    const override = posSurcharge.surchargeManualOverride
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    const isSunday = today.getDay() === 0
    const isPublicHoliday = posSurcharge.publicHolidayDates.includes(todayStr)

    if (override === 'none') return null
    if (override === 'sunday' && posSurcharge.sundaySurchargeEnabled) return { label: 'Sunday surcharge', percent: posSurcharge.sundaySurchargePercent }
    if (override === 'public_holiday' && posSurcharge.publicHolidaySurchargeEnabled) return { label: 'Public holiday surcharge', percent: posSurcharge.publicHolidaySurchargePercent }
    if (override === 'auto') {
      if (isPublicHoliday && posSurcharge.publicHolidaySurchargeEnabled) return { label: 'Public holiday surcharge', percent: posSurcharge.publicHolidaySurchargePercent }
      if (isSunday && posSurcharge.sundaySurchargeEnabled) return { label: 'Sunday surcharge', percent: posSurcharge.sundaySurchargePercent }
    }
    return null
  }, [posSurcharge])

  const subtotalAfterDiscount = subtotalInclGst - discountAmount
  const surchargeAmount = useMemo(() => {
    if (!surchargeApplied) return 0
    return subtotalAfterDiscount * (surchargeApplied.percent / 100)
  }, [surchargeApplied, subtotalAfterDiscount])

  const totalBeforeCardSurcharge = subtotalAfterDiscount + surchargeAmount
  const posCardSurchargeAmount = useMemo(() => {
    const pct = posSurcharge.posCardSurchargePercent ?? 0
    if (pct <= 0) return 0
    if (paymentMethod !== 'card' && paymentMethod !== 'mix') return 0
    return totalBeforeCardSurcharge * (pct / 100)
  }, [posSurcharge.posCardSurchargePercent, paymentMethod, totalBeforeCardSurcharge])

  const total = useMemo(() => 
    totalBeforeCardSurcharge + posCardSurchargeAmount, [totalBeforeCardSurcharge, posCardSurchargeAmount]
  )

  // Quick add to cart (no customization) - increments quantity if item exists
  const quickAddToCart = useCallback((item: POSSubItem, selectedSize?: { name: string; price: number }) => {
    const category = categories.find(cat => 
      cat.subItems.some(subItem => subItem.id === item.id)
    )
    const priceExGst = selectedSize ? selectedSize.price : item.basePrice
    const selectedSizeName = selectedSize?.name

    setCart((prev) => {
      // Check if exact same item (same base item, same size, no customizations) already exists
      const existingItem = prev.find(
        cartItem => 
          cartItem.name === item.name && 
          cartItem.basePrice === priceExGst &&
          cartItem.customizations.length === 0 &&
          (cartItem.selectedSize ?? '') === (selectedSizeName ?? '')
      )

      if (existingItem) {
        // Increment quantity
        return prev.map(cartItem =>
          cartItem.id === existingItem.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }

      // Add new item
      const gstAmount = priceExGst * GST_RATE
      const priceInclGst = priceExGst + gstAmount

      const cartItem: CartItem = {
        id: `${item.id}-${Date.now()}`,
        name: item.name,
        description: item.description,
        basePrice: priceExGst, // ex GST (size price when applicable)
        quantity: 1,
        categoryName: category?.name || 'Other',
        customizations: [],
        finalPrice: priceInclGst, // incl GST
        gstAmount: gstAmount,
        ...(selectedSizeName ? { selectedSize: selectedSizeName } : {}),
      }

      return [...prev, cartItem]
    })
  }, [categories])

  // Direct add to cart (clicking item card)
  const handleItemClick = useCallback((item: POSSubItem, e: React.MouseEvent) => {
    // Check if clicking the customize button or any button
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      e.stopPropagation()
      return
    }
    
    // Prevent double-click from adding twice
    e.preventDefault()
    e.stopPropagation()
    
    const selectedSize = item.sizes?.length ? (selectedSizeByItemId[item.id] ?? item.sizes[0]) : undefined
    quickAddToCart(item, selectedSize)
  }, [quickAddToCart, selectedSizeByItemId])

  // Handle customize button click
  const handleCustomizeClick = useCallback((item: POSSubItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedItem(item)
    setSelectedCustomizations({})
    setShowCustomizationModal(true)
  }, [])

  // Barcode scan: look up inventory and add to cart
  const handleBarcodeScan = useCallback(async () => {
    const code = barcodeScanValue.trim()
    if (!code) return
    if (!defaultRestaurantId) {
      warning('No restaurant', 'Select or set default restaurant first.')
      return
    }
    setBarcodeScanValue('')
    try {
      const res = await fetch(`/api/inventory?restaurantId=${encodeURIComponent(defaultRestaurantId)}&barcode=${encodeURIComponent(code)}`)
      if (!res.ok) throw new Error('Lookup failed')
      const data = await res.json()
      const items = data.items ?? []
      const inv = items[0]
      if (!inv) {
        warning('Barcode not found', `No item with barcode "${code}". Add it in Restaurant Dashboard → Stock.`)
        barcodeInputRef.current?.focus()
        return
      }
      const price = Number(inv.price) || 0
      const basePrice = price
      const gstAmount = basePrice * GST_RATE
      const finalPrice = basePrice + gstAmount
      const cartId = `barcode-${inv.barcode}`
      setCart((prev) => {
        const existing = prev.find((i) => i.id === cartId)
        if (existing) {
          return prev.map((i) =>
            i.id === cartId ? { ...i, quantity: i.quantity + 1 } : i
          )
        }
        const newItem: CartItem = {
          id: cartId,
          name: inv.name,
          description: 'Barcode item',
          basePrice,
          quantity: 1,
          categoryName: 'Barcode',
          customizations: [],
          finalPrice,
          gstAmount
        }
        return [...prev, newItem]
      })
      success('Added', `${inv.name} added to cart`)
    } catch (e) {
      warning('Barcode lookup failed', e instanceof Error ? e.message : 'Could not find item')
    }
    barcodeInputRef.current?.focus()
  }, [barcodeScanValue, defaultRestaurantId, warning, success])

  const handleBarcodeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleBarcodeScan()
      }
    },
    [handleBarcodeScan]
  )

  const handleProceedToBilling = useCallback(
    (orderId: string) => {
      const order = pendingOrdersFromApi.find((o) => o.id === orderId)
      if (!order) {
        warning('Order not found', 'Order may have been updated. Refreshing list.')
        fetchPendingOrders()
        return
      }
      // Convert order items to POS cart items (price from API is per-unit; assume incl GST if > 0)
      const cartItems: CartItem[] = order.items.map((item, idx) => {
        const pricePerUnit = Number(item.price) || 0
        const finalPrice = pricePerUnit
        const basePrice = pricePerUnit / (1 + GST_RATE)
        const gstAmount = basePrice * GST_RATE
        return {
          id: `${order.id}-${item.menuItemId ?? idx}-${idx}`,
          name: item.name,
          description: '',
          basePrice,
          quantity: item.quantity,
          categoryName: 'Order',
          customizations: [],
          finalPrice,
          gstAmount
        }
      })
      setCart(cartItems)
      setOrderIdForBilling(order.id)
      setOrderType((order.orderType as OrderType) || 'dine-in')
      setTableNumber(order.tableNumber ?? '')
      setCustomerName(order.customerName ?? '')
      setCashierName('')
      setDiscount(null)
      setTip(0)
      setTipPercentage(null)
      setActiveSection('menu')
      success('Order loaded into cart', 'Complete checkout to finish billing for this order.')
    },
    [pendingOrdersFromApi, success, warning, fetchPendingOrders]
  )

  const toggleCustomization = (groupId: string, optionId: string, maxSelections?: number) => {
    setSelectedCustomizations((prev) => {
      const current = prev[groupId] || []
      const isSelected = current.includes(optionId)
      
      if (maxSelections === 1) {
        return { ...prev, [groupId]: isSelected ? [] : [optionId] }
      } else {
        if (isSelected) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) }
        } else {
          return { ...prev, [groupId]: [...current, optionId] }
        }
      }
    })
  }

  const calculateCustomizationPrice = useCallback((): number => {
    if (!selectedItem) return 0
    
    const customizations = getDefaultCustomizations(selectedItem.id, selectedItem)
    let total = 0
    
    customizations.forEach((group) => {
      const selected = selectedCustomizations[group.id] || []
      selected.forEach((optionId) => {
        const option = group.options.find((opt) => opt.id === optionId)
        if (option) {
          total += option.price
        }
      })
    })
    
    return total
  }, [selectedItem, selectedCustomizations])

  const addToCartWithCustomizations = () => {
    if (!selectedItem) return

    const category = categories.find(cat => 
      cat.subItems.some(item => item.id === selectedItem.id)
    )

    const customizations = getDefaultCustomizations(selectedItem.id, selectedItem)
    const finalCustomizations: SelectedCustomization[] = []

    customizations.forEach((group) => {
      const selected = selectedCustomizations[group.id] || []
      if (selected.length > 0) {
        const selectedOptions = group.options.filter((opt) => selected.includes(opt.id))
        const totalPrice = selectedOptions.reduce((sum, opt) => sum + opt.price, 0)
        
        finalCustomizations.push({
          groupId: group.id,
          groupName: group.name,
          optionIds: selected,
          optionNames: selectedOptions.map((opt) => opt.name),
          totalPrice
        })
      }
    })

    const customizationPrice = calculateCustomizationPrice()
    // Base price: use selected size when item has sizes, else basePrice
    const selectedSize = selectedItem.sizes?.length ? (selectedSizeByItemId[selectedItem.id] ?? selectedItem.sizes[0]) : undefined
    const basePriceExGst = selectedSize ? selectedSize.price : selectedItem.basePrice
    const priceExGst = basePriceExGst + customizationPrice
    const gstAmount = priceExGst * GST_RATE
    const priceInclGst = priceExGst + gstAmount

    const cartItem: CartItem = {
      id: `${selectedItem.id}-${Date.now()}`,
      name: selectedItem.name,
      description: selectedItem.description,
      basePrice: basePriceExGst, // ex GST (size price when applicable)
      quantity: 1,
      categoryName: category?.name || 'Other',
      customizations: finalCustomizations,
      finalPrice: priceInclGst, // incl GST
      gstAmount: gstAmount,
      ...(selectedSize ? { selectedSize: selectedSize.name } : {}),
    }

    setCart((prev) => [...prev, cartItem])
    setShowCustomizationModal(false)
    setSelectedItem(null)
    setSelectedCustomizations({})
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      setCart(prev => prev.filter(i => i.id !== itemId))
      return
    }
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i))
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const openClearConfirm = () => {
    if (cart.length === 0) return
    setShowClearConfirm(true)
  }

  const clearCart = () => {
    setCart([])
    setTableNumber('')
    setCustomerName('')
    setCashierName('')
    setDiscount(null)
    setTip(0)
    setTipPercentage(null)
    setOrderIdForBilling(null)
    setShowClearConfirm(false)
  }

  // Print receipt function for standard POS thermal printers. Pass orderId when available so QR code can link to order. Pass receiptNoOverride when you've already assigned a receipt number for this order.
  const printReceipt = useCallback((receiptOrderId?: string | null, receiptNoOverride?: string | null) => {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600')
    if (!receiptWindow) return

    const orderIdForQr = receiptOrderId ?? orderIdForBilling
    const receiptBusinessName = (posReceipt.businessName || '').trim() || 'Receipt'
    const receiptAbn = (posReceipt.abn || '').trim()
    const receiptAddress = (posReceipt.address || '').trim()
    const receiptPhone = (posReceipt.phone || '').trim()
    const receiptNo = (receiptNoOverride != null && receiptNoOverride !== '')
      ? receiptNoOverride
      : formatReceiptNo(receiptSequence)
    const receiptFooter = (posReceipt.footerText || '').trim() || 'Thank you for your visit!'
    const showQr = posReceipt.showQrCode && orderIdForQr
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const orderUrl = orderIdForQr ? `${origin}/orders?orderId=${encodeURIComponent(orderIdForQr)}` : ''
    const qrImageSrc = showQr && orderUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(orderUrl)}`
      : ''

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receiptNo}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 10mm 5mm;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        width: 70mm;
      }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      width: 70mm;
      margin: 0 auto;
      padding: 10mm 5mm;
      background: white;
    }
    .receipt {
      width: 100%;
    }
    .header {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .business-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .business-info {
      font-size: 10px;
      margin: 3px 0;
    }
    .order-info {
      margin: 12px 0;
      padding: 8px 0;
    }
    .order-info-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: 11px;
    }
    .items {
      margin: 10px 0;
    }
    .item-row {
      margin: 8px 0;
      padding-bottom: 8px;
    }
    .item-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .item-details {
      font-size: 10px;
      color: #666;
      margin-left: 10px;
      margin-top: 2px;
    }
    .item-qty-price {
      display: flex;
      justify-content: space-between;
      margin-top: 3px;
    }
    .totals {
      margin: 15px 0;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 11px;
    }
    .total-row.gst {
      font-weight: bold;
    }
    .total-row.final {
      font-size: 14px;
      font-weight: bold;
      padding-top: 8px;
      margin-top: 12px;
    }
    .payment-info {
      margin: 15px 0;
      padding: 12px 0;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: 11px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 12px;
      font-size: 10px;
    }
    .divider {
      margin: 12px 0;
      height: 0;
    }
    .notes {
      margin: 10px 0;
      padding: 5px;
      background: #f5f5f5;
      font-size: 10px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="divider"></div>
    <div class="header" style="text-align: center;">
      <div class="business-name">${(receiptBusinessName || 'Receipt').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      ${receiptAddress ? `<div class="business-info">${receiptAddress.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
      ${receiptPhone ? `<div class="business-info">Ph: ${receiptPhone.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
      ${receiptAbn ? `<div class="business-info">ABN: ${receiptAbn.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
    </div>
    <div class="divider"></div>
    <div class="business-info" style="text-align: center;">
      <div class="order-info-row"><span>Date:</span><span>${new Date().toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
      <div class="order-info-row"><span>Receipt No:</span><span>${receiptNo}</span></div>
    </div>
    <div class="divider"></div>

    <table class="item-table" style="width:100%; font-size: 11px; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align:left;">Item</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
    ${cart.map(item => {
      const itemPriceInclGst = item.finalPrice
      const lineTotal = itemPriceInclGst * item.quantity
      const safeName = (item.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const customizationsHtml = (item.customizations && item.customizations.length > 0)
        ? item.customizations.map(c => {
            const safeOpts = (c.optionNames || []).map(n => (n || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')).filter(Boolean)
            const optsText = safeOpts.join(', ')
            const isRemove = (c.groupName || '').toLowerCase().includes('remove')
            if (isRemove && optsText) {
              return `<div class="item-details">Remove: ${optsText}</div>`
            }
            if (optsText) {
              const extraInclGst = c.totalPrice * (1 + GST_RATE)
              const pricePart = c.totalPrice > 0 ? ` (+$${extraInclGst.toFixed(2)})` : ''
              return `<div class="item-details">Add: ${optsText}${pricePart}</div>`
            }
            return ''
          }).filter(Boolean).join('')
        : ''
      return `<tr>
        <td style="text-align:left; vertical-align: top;">
          <span class="item-name">${safeName}</span> (incl. GST)
          ${customizationsHtml}
        </td>
        <td style="text-align:center; vertical-align: top;">${item.quantity}</td>
        <td style="text-align:right; vertical-align: top;">$${lineTotal.toFixed(2)}</td>
      </tr>`
    }).join('')}
      </tbody>
    </table>

    <div class="divider"></div>
    <div class="totals">
      <div class="total-row gst">
        <span>GST included (10%)</span>
        <span>A$${totalGst.toFixed(2)}</span>
      </div>
      ${discount ? `
      <div class="total-row" style="color: green;">
        <span>Discount${discount.name ? ` (${discount.name})` : ''}:</span>
        <span>-A$${discountAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      ${surchargeApplied ? `
      <div class="total-row">
        <span>${surchargeApplied.label} (${surchargeApplied.percent}%):</span>
        <span>A$${surchargeAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row" style="font-weight: bold; margin-top: 8px;">
        <span>Total</span>
        <span>A$${totalBeforeCardSurcharge.toFixed(2)}</span>
      </div>
      ${tip > 0 ? `
      <div class="total-row">
        <span>Tip${tipPercentage ? ` (${tipPercentage}%)` : ''}:</span>
        <span>A$${tip.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row final">
        <span>GRAND TOTAL</span>
        <span>A$${total.toFixed(2)}</span>
      </div>
    </div>

    <div class="payment-info">
      <div class="payment-row">
        <span>Payment Method:</span>
        <span><strong>${paymentMethod === 'card' ? 'CARD' : paymentMethod === 'mix' ? 'MIX (CARD + CASH)' : 'CASH'}</strong></span>
      </div>
      <div class="payment-row">
        <span>Amount Paid:</span>
        <span><strong>A$${total.toFixed(2)}</strong></span>
      </div>
      ${paymentMethod === 'mix' ? (() => {
        const cardAmt = parseFloat(typeof mixCardAmount === 'string' ? mixCardAmount : '0') || 0
        const cashAmt = parseFloat(typeof mixCashAmount === 'string' ? mixCashAmount : '0') || 0
        return `
      <div class="payment-row">
        <span>Card:</span>
        <span><strong>A$${cardAmt.toFixed(2)}</strong></span>
      </div>
      <div class="payment-row">
        <span>Cash:</span>
        <span><strong>A$${cashAmt.toFixed(2)}</strong></span>
      </div>`
      })() : ''}
      ${(paymentMethod === 'cash' || paymentMethod === 'mix') && cashTendered ? (() => {
        const cashPortion = paymentMethod === 'mix' ? (parseFloat(mixCashAmount) || 0) : total
        const received = parseFloat(cashTendered) || 0
        const change = Math.max(0, received - cashPortion)
        return `
      <div class="payment-row">
        <span>Cash Given:</span>
        <span><strong>A$${received.toFixed(2)}</strong></span>
      </div>
      <div class="payment-row">
        <span>Change Given:</span>
        <span><strong>A$${change.toFixed(2)}</strong></span>
      </div>`
      })() : ''}
      <div class="payment-row">
        <span>Status:</span>
        <span><strong>PAID</strong></span>
      </div>
    </div>

    ${cashierName ? `
    <div class="notes">
      <strong>Cashier:</strong> ${(cashierName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
    ` : ''}

    <div class="footer">
      ${receiptFooter.split('\n').map(line => `<div>${(line || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`).join('')}
      ${!receiptFooter.includes('GST') ? '<div style="margin-top: 5px;">GST included in prices</div>' : ''}
      <div style="margin-top: 10px; font-size: 9px;">
        This is a computer-generated receipt.<br>
        No signature required.
      </div>
      ${showQr && qrImageSrc ? `
      <div style="margin-top: 12px;">
        <p style="font-size: 10px; margin-bottom: 4px;">Scan to view order status</p>
        <img src="${qrImageSrc}" alt="Order QR" width="120" height="120" style="display: block; margin: 0 auto;" />
      </div>
      ` : ''}
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 9px; color: #666; text-align: center;">
        Solution by : www.ezymenu.com.au
      </div>
    </div>

    <div class="divider"></div>
  </div>
</body>
</html>
    `

    receiptWindow.document.write(receiptHTML)
    receiptWindow.document.close()

    // Wait for content to load, then print
    setTimeout(() => {
      receiptWindow.focus()
      receiptWindow.print()
      // Optionally close after printing (uncomment if desired)
      // receiptWindow.close()
    }, 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- receipt template uses all listed deps
  }, [cart, orderNumber, orderType, tableNumber, customerName, subtotalExGst, totalGst, subtotalInclGst, discount, discountAmount, tip, tipPercentage, total, totalBeforeCardSurcharge, paymentMethod, cashierName, cashTendered, mixCardAmount, mixCashAmount, surchargeAmount, surchargeApplied, posCardSurchargeAmount, orderIdForBilling, posReceipt, receiptSequence, formatReceiptNo])

  const handleStartCardPayment = async () => {
    if (cart.length === 0 || !posStripePromise) return
    const rid = defaultRestaurantId || (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID : '') || ''
    if (!rid) {
      warning('No restaurant', 'Select a restaurant or set default.')
      return
    }
    setIsProcessing(true)
    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: rid,
          customerName: customerName?.trim() || (orderType === 'dine-in' ? `Table ${tableNumber}` : 'Walk-in'),
          customerEmail: 'pos@restaurant.local',
          customerPhone: 'N/A',
          items: cart.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.finalPrice,
            customizations: item.customizations
          })),
          total,
          status: 'pending',
          orderType,
          tableNumber: orderType === 'dine-in' ? tableNumber : null,
          paymentStatus: 'pending'
        })
      })
      if (!orderResponse.ok) {
        const errData = await orderResponse.json().catch(() => ({}))
        throw new Error(errData?.error || `Order failed: ${orderResponse.status}`)
      }
      const orderData = await orderResponse.json()
      const rawOrderId = orderData.orderId ?? orderData.order?.id
      const orderId = toOrderUuid(rawOrderId)
      if (!orderId) throw new Error('No valid order ID returned from server')
      const amountInCents = Math.round(total * 100)
      const piRes = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents, orderId, currency: 'aud' })
      })
      if (!piRes.ok) {
        const piErr = await piRes.json().catch(() => ({}))
        throw new Error(piErr?.error || 'Failed to create payment')
      }
      const { clientSecret, paymentIntentId } = await piRes.json()
      setStripeClientSecret(clientSecret)
      setStripeOrderId(orderId)
      setStripePaymentIntentId(paymentIntentId)
      setStripeOrderNumber(orderNumber)
      setPaymentStep('card-form')
    } catch (e) {
      warning('Card payment', e instanceof Error ? e.message : 'Could not start card payment.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCardPaymentSuccess = useCallback(() => {
    if (!stripeOrderId || !stripeOrderNumber) return
    const receiptNoCard = formatReceiptNo(receiptSequence)
    setReceiptSequence((prev) => prev + 1)
    setTimeout(() => printReceipt(stripeOrderId, receiptNoCard), 500)
    setOrders(prev => [{
      id: stripeOrderId,
      orderNumber: stripeOrderNumber,
      items: cart,
      total,
      subtotalExGst,
      totalGst,
      discount,
      tip,
      paymentMethod: 'card',
      paymentStatus: 'captured',
      orderType,
      tableNumber,
      customerName,
      createdAt: new Date().toISOString(),
      status: 'completed'
    }, ...prev])
    setTransactions(prev => [{
      id: `txn-${Date.now()}`,
      orderId: stripeOrderId,
      orderNumber: stripeOrderNumber,
      amount: total,
      paymentMethod: 'card',
      paymentStatus: 'captured',
      createdAt: new Date().toISOString(),
      items: cart.length
    }, ...prev])
    success('Payment complete', `Order #${stripeOrderNumber} paid by card.`)
    setCart([])
    setTableNumber('')
    setCustomerName('')
    setCashierName('')
    setDiscount(null)
    setTip(0)
    setTipPercentage(null)
    setOrderNumber(prev => prev + 1)
    setShowPaymentModal(false)
    setPaymentStep('method')
    setStripeClientSecret(null)
    setStripeOrderId(null)
    setStripePaymentIntentId(null)
    setStripeOrderNumber(0)
    setPaymentMethod('card')
    setMixCardAmount('')
    setMixCashAmount('')
  }, [stripeOrderId, stripeOrderNumber, cart, total, subtotalExGst, totalGst, discount, tip, orderType, tableNumber, customerName, printReceipt, success, receiptSequence, formatReceiptNo])

  const handlePayment = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)

    try {
      const paymentStatus = 'captured'
      const paymentData = {
        paymentId: `test-${paymentMethod}-${Date.now()}`,
        status: 'COMPLETED',
        message: 'Payment bypassed for testing'
      }

      // Billing an existing order (loaded via "Proceed to billing" from ready order): PATCH to completed, no new order
      if (orderIdForBilling) {
        const receiptNoBilling = formatReceiptNo(receiptSequence)
        setReceiptSequence((prev) => prev + 1)
        try {
          const res = await fetch(`/api/orders/${orderIdForBilling}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed', receiptNo: receiptNoBilling })
          })
          if (!res.ok) throw new Error('Update failed')
          success('Billing complete', 'Order marked as completed.')
          fetchPendingOrders()
          alert(`✅ Billing complete.\n\nOrder marked as completed. Receipt printed.`)
        } catch (e) {
          warning('Could not complete order', e instanceof Error ? e.message : 'Failed to update order')
        }
        setTimeout(() => printReceipt(orderIdForBilling, receiptNoBilling), 500)
        const txnId = `txn-${Date.now()}`
        setTransactions(prev => [{
          id: txnId,
          orderId: orderIdForBilling,
          orderNumber: orderNumber,
          amount: total,
          paymentMethod,
          paymentStatus,
          createdAt: new Date().toISOString(),
          items: cart.length
        }, ...prev])
        setCart([])
        setTableNumber('')
        setCustomerName('')
        setCashierName('')
        setDiscount(null)
        setTip(0)
        setTipPercentage(null)
        setOrderIdForBilling(null)
        setOrderNumber(prev => prev + 1)
        setShowPaymentModal(false)
        setPaymentMethod('card')
        setMixCardAmount('')
        setMixCashAmount('')
        setIsProcessing(false)
        return
      }

      // New order from POS: create order in backend
      const orderId = `POS-${Date.now()}-${orderNumber}`
      const receiptNoForPrint = formatReceiptNo(receiptSequence)
      setReceiptSequence((prev) => prev + 1)
      try {
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: defaultRestaurantId || (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID : '') || '',
            customerName: customerName?.trim() || (orderType === 'dine-in' ? `Table ${tableNumber}` : 'Walk-in'),
            customerEmail: 'pos@restaurant.local',
            customerPhone: 'N/A',
            items: cart.map((item) => ({
              menuItemId: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.finalPrice,
              customizations: item.customizations
            })),
            total,
            status: 'pending',
            orderType,
            tableNumber: orderType === 'dine-in' ? tableNumber : null,
            paymentStatus,
            squarePaymentId: paymentData.paymentId,
            receiptNo: receiptNoForPrint
          })
        })

        if (!orderResponse.ok) {
          const errData = await orderResponse.json().catch(() => ({}))
          const errMsg = errData?.error || `Server returned ${orderResponse.status}`
          warning('Order saved locally', `Backend sync failed: ${errMsg}. Order stored offline.`)
          setTimeout(() => printReceipt(undefined, receiptNoForPrint), 500)
        } else {
          const data = await orderResponse.json().catch(() => ({}))
          success('Payment complete', `Order #${orderNumber} saved`, {
            actionHref: data.orderId ? `/orders` : undefined,
            actionLabel: 'View orders',
          })
          setTimeout(() => printReceipt(data?.orderId, receiptNoForPrint), 500)
        }
      } catch (orderError) {
        console.warn('Order API error, continuing with local storage:', orderError)
        const errMsg = orderError instanceof Error ? orderError.message : 'Network or server error'
        warning('Order saved locally', `Could not sync to server: ${errMsg}. Order stored offline.`)
        setTimeout(() => printReceipt(undefined, receiptNoForPrint), 500)
      }

      const newOrder = {
        id: orderId,
        orderNumber,
        items: cart,
        total,
        subtotalExGst,
        totalGst,
        discount,
        tip,
        paymentMethod,
        paymentStatus,
        orderType,
        tableNumber,
        customerName,
        createdAt: new Date().toISOString(),
        status: 'completed'
      }

      const newTransaction = {
        id: `txn-${Date.now()}`,
        orderId,
        orderNumber,
        amount: total,
        paymentMethod,
        paymentStatus,
        createdAt: new Date().toISOString(),
        items: cart.length
      }

      setOrders(prev => [newOrder, ...prev])
      setTransactions(prev => [newTransaction, ...prev])

      alert(`✅ Order Processed Successfully!\n\nOrder #${orderNumber}\nSubtotal (incl. GST): A$${subtotalInclGst.toFixed(2)}\nGST included (10%): A$${totalGst.toFixed(2)}\nTOTAL: A$${total.toFixed(2)}\nPayment Method: ${paymentMethod.toUpperCase()} (BYPASSED FOR TESTING)\n\nReceipt will be printed automatically.`)

      setCart([])
      setTableNumber('')
      setCustomerName('')
      setCashierName('')
      setDiscount(null)
      setTip(0)
      setTipPercentage(null)
      setOrderNumber(prev => prev + 1)
      setShowPaymentModal(false)
      setPaymentMethod('card')
      setMixCardAmount('')
      setMixCashAmount('')
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus search on Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      
      if (e.key === 'Escape') {
        if (showCustomizationModal) {
          setShowCustomizationModal(false)
          setSelectedItem(null)
        } else if (showPaymentModal) {
          setShowPaymentModal(false)
        } else if (showDiscountModal) {
          setShowDiscountModal(false)
        } else if (showClearConfirm) {
          setShowClearConfirm(false)
        } else if (showItemModal) {
          closeItemModal()
        }
      }
      
      // Quick payment
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && cart.length > 0 && !showCustomizationModal && !showPaymentModal) {
        setShowPaymentModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showCustomizationModal, showPaymentModal, showDiscountModal, showClearConfirm, showItemModal, cart])

  const customizationPrice = selectedItem ? calculateCustomizationPrice() : 0
  const selectedItemBasePrice = selectedItem && selectedItem.sizes?.length
    ? (selectedSizeByItemId[selectedItem.id] ?? selectedItem.sizes[0]).price
    : selectedItem?.basePrice ?? 0
  const itemPriceExGst = selectedItem ? selectedItemBasePrice + customizationPrice : 0
  const itemGstAmount = itemPriceExGst * GST_RATE
  const itemFinalPrice = itemPriceExGst + itemGstAmount

  // Item management functions
  const handleAddItem = () => {
    setEditingItem(null)
    setItemFormData({
      name: '',
      description: '',
      basePrice: 0,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      isAvailable: true,
      popular: false,
      categoryId: categories[0]?.id ?? '',
    })
    setShowItemModal(true)
  }

  const handleEditItem = (item: POSSubItem) => {
    setEditingItem(item)
    const categoryId = categories.find((c) => c.subItems.some((s) => s.id === item.id))?.id ?? categories[0]?.id ?? ''
    const removeOptions: CustomizationOption[] = []
    const extras: CustomizationOption[] = []
    if (item.customizations?.length) {
      for (const g of item.customizations) {
        if (g.type === 'remove' || g.id === 'remove_options') {
          removeOptions.push(...(g.options || []).map((o) => ({ id: o.id, name: o.name, price: 0 })))
        } else if (g.type === 'extra' || g.id === 'extras') {
          extras.push(...(g.options || []).map((o) => ({ id: o.id, name: o.name, price: Number(o.price) || 0 })))
        }
      }
    }
    setItemFormData({
      ...item,
      categoryId,
      removeOptions: removeOptions.length > 0 ? removeOptions : undefined,
      extras: extras.length > 0 ? extras : undefined,
    })
    setShowItemModal(true)
  }

  const handleSaveItem = async (data: Partial<POSSubItem> & { categoryId?: string; newCategoryName?: string; newCategoryColor?: string; removeOptions?: CustomizationOption[]; extras?: CustomizationOption[]; sizes?: { name: string; price: number }[] }) => {
    const categoryId = data.categoryId ?? categories[0]?.id ?? ''
    const name = (data.name ?? '').trim()
    const description = (data.description ?? '').trim()
    const basePrice = Number(data.basePrice) || 0
    const image = (data.image ?? '').trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
    const isAvailable = data.isAvailable !== false
    const popular = data.popular === true
    const removeOptions = (data.removeOptions ?? []).filter((o) => (o.name ?? '').trim())
    const extras = (data.extras ?? []).filter((o) => (o.name ?? '').trim())
    const sizes = data.sizes && Array.isArray(data.sizes) ? data.sizes.filter((s) => s && typeof s.name === 'string') : undefined
    const customizations: CustomizationGroup[] = []
    if (removeOptions.length > 0) {
      customizations.push({ id: 'remove_options', name: 'Remove options', type: 'remove', options: removeOptions.map((o, i) => ({ id: o.id || `rem_${i}`, name: o.name.trim(), price: 0 })) })
    }
    if (extras.length > 0) {
      customizations.push({ id: 'extras', name: 'Extras', type: 'extra', options: extras.map((o, i) => ({ id: o.id || `ext_${i}`, name: o.name.trim(), price: Number(o.price) || 0 })) })
    }

    const isNewCategory = categoryId === '__new__' && (data.newCategoryName ?? '').trim()
    const newCatName = isNewCategory ? (data.newCategoryName ?? '').trim() : ''

    // When POS is linked to a restaurant, sync to API (Restaurant Dashboard is source of truth; POS can add/edit)
    if (restaurantIdProp && defaultRestaurantId) {
      try {
        if (editingItem) {
          const res = await fetch(`/api/menu-items/${editingItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              description,
              price: basePrice,
              category: categories.find((c) => c.subItems.some((s) => s.id === editingItem.id))?.name ?? 'Other',
              image,
              isAvailable,
              customizations,
              sizes: sizes?.length ? sizes : undefined,
            }),
          })
          if (!res.ok) throw new Error('Update failed')
          success('Item updated', 'Menu synced to Restaurant Dashboard.')
        } else {
          const res = await fetch('/api/menu-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantId: defaultRestaurantId,
              name,
              description,
              price: basePrice,
              category: isNewCategory ? newCatName : (categories.find((c) => c.id === categoryId)?.name ?? 'Other'),
              image,
              isAvailable,
              customizations,
            }),
          })
          if (!res.ok) throw new Error('Create failed')
          success('Item added', 'Menu synced to Restaurant Dashboard.')
        }
        fetchMenuFromApi(defaultRestaurantId)
      } catch (e) {
        warning('Sync failed', e instanceof Error ? e.message : 'Could not save to Restaurant Dashboard.')
        return
      }
      setShowItemModal(false)
      setEditingItem(null)
      setItemFormData({})
      return
    }

    if (editingItem) {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          subItems: cat.subItems.map((s) =>
            s.id === editingItem.id
              ? { ...s, name, description, basePrice, image, isAvailable, popular, customizations: customizations.length > 0 ? customizations : undefined, sizes }
              : s
          ),
        }))
      )
    } else if (isNewCategory) {
      const newCatId = `cat_${Date.now()}`
      const colorOpt = CATEGORY_COLOR_OPTIONS.find((o) => o.value === (data.newCategoryColor ?? newCategoryColor)) ?? CATEGORY_COLOR_OPTIONS[0]
      const newItem: POSSubItem = {
        id: `item_${Date.now()}`,
        name,
        description,
        basePrice,
        image,
        isAvailable,
        popular,
        customizations: customizations.length > 0 ? customizations : undefined,
        sizes,
      }
      setCategories((prev) => [
        ...prev,
        { id: newCatId, name: newCatName, icon: UtensilsCrossed, color: colorOpt.color, bgColor: colorOpt.bgColor, subItems: [newItem] },
      ])
    } else {
      const newItem: POSSubItem = {
        id: `item_${Date.now()}`,
        name,
        description,
        basePrice,
        image,
        isAvailable,
        popular,
        customizations: customizations.length > 0 ? customizations : undefined,
        sizes,
      }
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? { ...cat, subItems: [...cat.subItems, newItem] }
            : cat
        )
      )
    }
    setShowItemModal(false)
    setEditingItem(null)
    setItemFormData({})
  }

  const closeItemModal = () => {
    setShowItemModal(false)
    setEditingItem(null)
    setItemFormData({})
  }

  // Reorder categories (drag-and-drop on Items screen)
  const moveCategory = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= categories.length) return
    setCategories((prev) => {
      const next = [...prev]
      const [removed] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, removed)
      return next
    })
  }

  // Reorder item within a category (drag-and-drop on Items screen)
  const moveItemInCategory = (categoryId: string, fromIndex: number, toIndex: number) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat
        const items = [...cat.subItems]
        if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return cat
        const [removed] = items.splice(fromIndex, 1)
        items.splice(toIndex, 0, removed)
        return { ...cat, subItems: items }
      })
    )
  }

  // Update category color (Items screen header or new category in form)
  const setCategoryColor = (categoryId: string, colorValue: string) => {
    const opt = CATEGORY_COLOR_OPTIONS.find((o) => o.value === colorValue) ?? CATEGORY_COLOR_OPTIONS[0]
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, color: opt.color, bgColor: opt.bgColor } : c))
    )
  }

  // Gate: when linked to restaurant, check enabled + 4-digit PIN
  if (restaurantIdProp) {
    if (posAccess === null) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-100 p-4">
          <Card className="p-8 max-w-md text-center">
            <p className="text-gray-600">Loading POS…</p>
          </Card>
        </div>
      )
    }
    if (!posAccess.posEnabled) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-100 p-4">
          <Card className="p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">POS disabled</h2>
            <p className="text-gray-600">System Control has turned off POS for this restaurant.</p>
          </Card>
        </div>
      )
    }
    if (!posPinVerified) {
      const handlePosPinSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const pin = posPinInput.replace(/\D/g, '').slice(0, 4)
        if (pin.length !== 4) { setPosPinError('Enter 4 digits'); return }
        setPosPinError('')
        const res = await fetch(`/api/restaurants/${restaurantIdProp}/verify-pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, type: 'pos' }) })
        const data = await res.json().catch(() => ({}))
        if (data.valid) setPosPinVerified(true)
        else setPosPinError('Wrong PIN')
      }
      return (
        <POSKeyboardProvider>
          <div className="fixed inset-0 flex items-center justify-center bg-gray-100 p-4">
            <Card className="p-8 max-w-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">POS access</h2>
              <p className="text-sm text-gray-500 mb-4">Enter 4-digit PIN</p>
              <form onSubmit={handlePosPinSubmit} className="space-y-3">
                <POSInput
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={posPinInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setPosPinInput(v)
                    setPosPinError('')
                  }}
                  placeholder="••••"
                  keyboardType="number"
                  className="w-full rounded-md border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest"
                  autoComplete="off"
                />
                {posPinError && <p className="text-sm text-red-600">{posPinError}</p>}
                <Button type="submit" className="w-full">Unlock POS</Button>
              </form>
            </Card>
          </div>
        </POSKeyboardProvider>
      )
    }
  }

  return (
    <POSKeyboardProvider>
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* Compact Header */}
      <div className="bg-white border-b-2 border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">POS System</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">Order #{orderNumber}</span>
                {cart.length > 0 && (
                  <Badge variant="info" className="text-xs">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-300" />
            <div className="text-right">
              <p className="text-xs text-gray-500">Total (incl GST)</p>
              <p className="text-xl font-bold text-orange-600">A${total.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter className="mr-1" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Conditional Section Rendering */}
        {activeSection === 'menu' && (
          <>
            {/* Left Panel - Menu (separate from cart) */}
            <div className="w-[65%] min-w-0 flex-shrink-0 flex flex-col min-h-0 bg-white border-r-2 border-gray-200">
          {/* Search and Categories */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gray-50">
            <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <POSInput
                ref={searchInputRef}
                placeholder="Search items... (Ctrl+K)"
                className="pl-10 h-12 text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
            
            {/* Category Buttons - Larger for touch */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-6 py-4 rounded-xl text-base font-bold whitespace-nowrap transition-all min-w-[120px] active:scale-95",
                  !selectedCategory
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                )}
              >
                All
              </button>
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "px-6 py-4 rounded-xl text-base font-bold whitespace-nowrap transition-all min-w-[140px] flex items-center justify-center gap-2 active:scale-95",
                      selectedCategory === category.id
                        ? `${category.bgColor} text-white shadow-lg scale-105`
                        : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 hover:text-gray-700'
                    )}
                  >
                    <Icon className={cn("w-6 h-6", selectedCategory === category.id ? "text-white" : "text-gray-700")} />
                    {category.name}
                  </button>
                )
              })}
            </div>
          </div>

            {/* Bento Box Categories View */}
          {!searchQuery && !selectedCategory && (
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-gray-50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                  const Icon = category.icon
                  const itemCount = getCategoryItemCount(category.id)
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left border-2 border-transparent hover:border-orange-500 group",
                        category.bgColor
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-4 rounded-xl", category.bgColor)}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <Badge variant="info" className="text-xs">
                          {itemCount} items
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Click to view {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items Grid - Show when category selected or searching */}
          {(selectedCategory || searchQuery) && (
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {selectedCategory && (
                <div className="mb-4 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">
                    {categories.find(cat => cat.id === selectedCategory)?.name}
                  </h2>
                  <Badge variant="info">
                    {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-orange-500 hover:shadow-xl transition-all group relative flex flex-col h-full"
                  >
                    {item.popular && (
                      <Badge variant="warning" className="absolute top-2 right-2 z-10 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                    <div
                      onClick={(e) => handleItemClick(item, e)}
                      className="flex-1 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-orange-600 line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-500 mb-1 line-clamp-2">{item.description}</p>
                        {(item.sizes?.length > 0 || (item.customizations && item.customizations.length > 0)) && (
                          <p className="text-[10px] sm:text-xs text-gray-400 mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {item.sizes && item.sizes.length > 0 && (
                              <span>
                                {item.sizes.map((s) => s.name === 'Small' ? 'sm' : s.name === 'Medium' ? 'md' : s.name === 'Large' ? 'lg' : s.name.toLowerCase()).join(' · ')}
                              </span>
                            )}
                            {item.sizes?.length > 0 && item.customizations && item.customizations.length > 0 && <span className="text-gray-300">·</span>}
                            {item.customizations && item.customizations.length > 0 && (
                              <span className="text-red-500 font-normal">options</span>
                            )}
                          </p>
                        )}
                        {(!item.sizes?.length && (!item.customizations || item.customizations.length === 0)) && <div className="mb-2" />}
                        {item.sizes && item.sizes.length > 0 ? (
                          <>
                            <p className="text-xl font-bold text-orange-600 mb-1">
                              A${(Math.min(...item.sizes.map(s => s.price)) * (1 + GST_RATE)).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-bold text-orange-600 mb-1">A${(item.basePrice * (1 + GST_RATE)).toFixed(2)}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleCustomizeClick(item, e)}
                      className="customize-button w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold py-5 px-4 transition-all text-lg hover:from-orange-600 hover:to-orange-700 active:scale-95 shadow-2xl border-t-4 border-orange-400 mt-auto flex items-center justify-center gap-2 uppercase tracking-wide"
                    >
                      <Plus className="w-6 h-6" />
                      Customize
                    </button>
                  </div>
              ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Cart: full width of column, full height to bottom for more items */}
        <div className="w-[35%] min-w-[280px] flex-shrink-0 flex flex-col min-h-0 bg-gray-50 border-l-2 border-gray-200">
          {/* Clear order - top right of cart */}
          <div className="flex justify-end px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
            <Button
              variant={cart.length > 0 ? 'danger' : 'ghost'}
              size="sm"
              onClick={openClearConfirm}
              disabled={cart.length === 0}
              title={cart.length === 0 ? 'Cart is empty' : 'Clear current order'}
              className={cn(
                'text-sm font-semibold',
                cart.length > 0 && 'shadow-sm',
                cart.length === 0 && 'opacity-60 cursor-not-allowed'
              )}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear order
            </Button>
          </div>
          {orderIdForBilling && (
            <div className="px-4 py-2 bg-green-100 border-b border-green-300 text-green-800 text-sm font-medium flex-shrink-0">
              Billing for customer order — complete checkout to mark as completed.
            </div>
          )}
          {/* Barcode scan - always visible for quick add */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ScanBarcode className="w-4 h-4 inline mr-2 text-orange-600" />
              Scan barcode
            </label>
            <div className="flex gap-2">
              <POSInput
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan or type barcode, then Enter"
                value={barcodeScanValue}
                onChange={(e) => setBarcodeScanValue(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="flex-1 font-mono text-sm"
                autoComplete="off"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBarcodeScan}
                className="shrink-0"
                title="Look up and add item"
              >
                Add
              </Button>
            </div>
          </div>
          {/* Cart Items - Scrollable (more padding for space) */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Cart is empty</p>
                <p className="text-sm text-gray-400 mt-2">Select items to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg px-4 py-3 min-h-[52px] border border-gray-200 shadow-sm">
                    {/* Inline: name, quantity, price, remove */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm min-w-0 flex-1 truncate" title={item.name}>
                        {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ''}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(item.id, item.quantity - 1); }}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer touch-manipulation select-none"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4 pointer-events-none" />
                        </button>
                        <span className="w-7 text-center font-bold text-sm tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(item.id, item.quantity + 1); }}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer touch-manipulation select-none"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4 pointer-events-none" />
                        </button>
                      </div>
                      <p className="font-bold text-orange-600 text-sm tabular-nums w-16 text-right flex-shrink-0">
                        A${(item.finalPrice * item.quantity).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromCart(item.id); }}
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-red-500 hover:text-white hover:bg-red-500 border-2 border-red-200 bg-red-50 transition-colors active:scale-95 cursor-pointer touch-manipulation relative z-10"
                        title="Remove"
                        aria-label="Remove"
                      >
                        <X className="w-5 h-5 stroke-[2.5] pointer-events-none" />
                      </button>
                    </div>
                    {item.customizations.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1.5 space-y-0.5">
                        {item.customizations.map((c) => {
                          const opts = c.optionNames.filter(Boolean).join(', ')
                          if (!opts) return null
                          const isRemove = (c.groupName || '').toLowerCase().includes('remove')
                          if (isRemove) return <p key={c.groupId} className="truncate">Remove: {opts}</p>
                          const addLabel = c.totalPrice > 0 ? `Add: ${opts} (+A$${c.totalPrice.toFixed(2)})` : `Add: ${opts}`
                          return <p key={c.groupId} className="truncate">{addLabel}</p>
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
          </>
        )}

        {/* Orders Section - 2 columns: Online orders | POS / In-house orders */}
        {activeSection === 'orders' && (
          <div className="w-full flex flex-col bg-white overflow-hidden min-h-0">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Orders</h2>
              <div className="flex flex-wrap items-center gap-3">
                <POSInput
                  placeholder="Search orders..."
                  className="flex-1 min-w-[180px] max-w-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Badge variant="info">{pendingOrdersFromApi.length} online</Badge>
                  <Badge variant="default">{orders.length} POS</Badge>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 overflow-hidden">
              {/* Left column: Online orders */}
              <div className="flex flex-col min-h-0 bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                  <h3 className="text-base font-semibold text-gray-900">Online orders</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Placed online → accept in Dashboard, then bill here.</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {pendingOrdersLoading ? (
                  <p className="text-gray-500 text-sm">Loading…</p>
                ) : pendingOrdersFromApi.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500 font-medium text-sm">No online orders</p>
                    <p className="text-xs text-gray-400 mt-1">Orders accepted in Restaurant Dashboard appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Sort: ready first (ready for billing), then preparing, accepted, pending */}
                    {[...pendingOrdersFromApi]
                      .sort((a, b) => {
                        const orderStatus = (s: string) => (s === 'ready' ? 0 : s === 'preparing' ? 1 : s === 'accepted' ? 2 : 3)
                        return orderStatus(a.status) - orderStatus(b.status)
                      })
                      .map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          'bg-white border-2 rounded-lg p-4 shadow-sm',
                          order.status === 'ready' ? 'border-green-400 bg-green-50/50' : 'border-orange-200'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-base font-bold text-gray-900">#{order.id.slice(-8)}</h3>
                              <Badge variant="info" className="capitalize">{order.orderType || 'dine-in'}</Badge>
                              {order.status === 'ready' && (
                                <Badge variant="success">Ready for billing</Badge>
                              )}
                              {order.status !== 'ready' && (
                                <Badge variant="warning" className="capitalize">{order.status}</Badge>
                              )}
                              {order.orderType === 'dine-in' && order.tableNumber && (
                                <Badge variant="warning">T{order.tableNumber}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('en-AU')}</p>
                            <p className="text-xs text-gray-600 truncate" title={order.customerName || '—'}>{order.customerName || '—'}</p>
                            {order.specialRequests && (
                              <p className="text-xs text-amber-800 bg-amber-50 mt-1 px-2 py-0.5 rounded">Seating: {order.specialRequests}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-orange-600">A${Number(order.total).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{order.items.length} items</p>
                            {!['completed', 'rejected'].includes(order.status) && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => handleProceedToBilling(order.id)}
                              >
                                Proceed to billing
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 mt-2">
                          <div className="space-y-1">
                            {order.items.map((item: { quantity: number; name: string; price: number; customizations?: { id: string; type?: string; options?: { name: string; price?: number }[] }[] }, idx: number) => (
                              <div key={idx} className="text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-700">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-gray-600">A${(priceInclGst(item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.customizations && item.customizations.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-0.5 ml-4 space-y-0.5">
                                    {item.customizations.map((g) => {
                                      const opts = (g.options || []).map((o) => o.name).filter(Boolean).join(', ')
                                      if (!opts) return null
                                      if ((g.type || '').toLowerCase() === 'remove') {
                                        return <div key={g.id}>Remove: {opts}</div>
                                      }
                                      const pricePart = (g.options || []).some((o) => Number(o?.price) > 0)
                                        ? ` (+$${(g.options || []).reduce((s, o) => s + Number(o?.price || 0), 0).toFixed(2)})`
                                        : ''
                                      return <div key={g.id}>Extras: {opts}{pricePart}</div>
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>

              {/* Right column: POS / In-house orders */}
              <div className="flex flex-col min-h-0 bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                  <h3 className="text-base font-semibold text-gray-900">POS / In-house orders</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Orders taken and completed at the POS today.</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {orders.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500 font-medium text-sm">No POS orders yet</p>
                    <p className="text-xs text-gray-400 mt-1">Orders you complete in POS will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order: { id: string; orderNumber?: number; createdAt?: string; tableNumber?: string; customerName?: string; paymentMethod?: string; total?: number; items?: { quantity: number; name: string; finalPrice: number }[]; status?: string }) => (
                      <div key={order.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-bold text-gray-900">#{order.orderNumber ?? order.id.slice(-8)}</h3>
                              <Badge variant="success">{order.status ?? 'completed'}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleString('en-AU') : '—'}
                            </p>
                            {order.tableNumber && (
                              <p className="text-xs text-gray-600">Table {order.tableNumber}</p>
                            )}
                            <p className="text-xs text-gray-600 truncate" title={order.customerName || 'Walk-in'}>{order.customerName || 'Walk-in'}</p>
                            <p className="text-xs text-gray-500">{(order.paymentMethod as string)?.toUpperCase() || 'N/A'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-orange-600">A${Number(order.total ?? 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{order.items?.length ?? 0} items</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 mt-2">
                          <div className="space-y-1">
                            {(order.items ?? []).map((item: { quantity: number; name: string; finalPrice: number; customizations?: { groupName: string; optionNames: string[]; totalPrice: number }[] }, idx: number) => (
                              <div key={idx} className="text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-700">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-gray-600">A${(item.finalPrice * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.customizations && item.customizations.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-0.5 ml-4 space-y-0.5">
                                    {item.customizations.map((c, i) => {
                                      const opts = (c.optionNames || []).filter(Boolean).join(', ')
                                      if (!opts) return null
                                      const isRemove = (c.groupName || '').toLowerCase().includes('remove')
                                      if (isRemove) return <div key={i}>Remove: {opts}</div>
                                      const pricePart = (c.totalPrice ?? 0) > 0 ? ` (+$${c.totalPrice.toFixed(2)})` : ''
                                      return <div key={i}>Add: {opts}{pricePart}</div>
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* More Section: main grid, or Transactions, or Items (with back) */}
        {activeSection === 'more' && (
          <div className="w-full flex flex-col bg-white overflow-hidden">
            {moreSubSection === 'main' ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">More</h2>
                  <p className="text-sm text-gray-600">Transactions, items, and settings</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setMoreSubSection('transactions')}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <TrendingUp className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">Transactions</h3>
                      <p className="text-sm text-gray-600">View payment history and transactions</p>
                      {transactions.length > 0 && (
                        <p className="text-xs text-orange-600 mt-2">{transactions.length} transactions</p>
                      )}
                    </button>
                    <button
                      onClick={() => setMoreSubSection('items')}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <ChefHat className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">Menu Items</h3>
                      <p className="text-sm text-gray-600">Manage POS menu items</p>
                    </button>
                    <button
                      onClick={() => setMoreSubSection('printTest')}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <Printer className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">Print Test Receipt</h3>
                      <p className="text-sm text-gray-600">Print a test receipt to check printer</p>
                    </button>
                    <button
                      onClick={() => setMoreSubSection('reports')}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <BarChart3 className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">View Reports</h3>
                      <p className="text-sm text-gray-600">Sales reports and analytics</p>
                    </button>
                    <button
                      onClick={() => setMoreSubSection('dailySummary')}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <Receipt className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">Daily Summary</h3>
                      <p className="text-sm text-gray-600">View today's sales summary</p>
                    </button>
                    <button
                      onClick={() => setMoreSubSection('settings')}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <Settings className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">System Settings</h3>
                      <p className="text-sm text-gray-600">Language, currency, time</p>
                    </button>
                    <button
                      onClick={() => { setMoreSubSection('support'); setSupportSent(false); setSupportMessage('') }}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all"
                    >
                      <Headphones className="w-8 h-8 text-orange-600 mb-3" />
                      <h3 className="font-bold text-gray-900 mb-1">Support</h3>
                      <p className="text-sm text-gray-600">Technical help & issues → System Control</p>
                    </button>
                  </div>
                </div>
              </>
            ) : moreSubSection === 'transactions' ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                  <button
                    onClick={() => setMoreSubSection('main')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <POSInput
                        placeholder="Search transactions..."
                        className="flex-1 max-w-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Badge variant="info">{transactions.length} transactions</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No transactions yet</p>
                      <p className="text-sm text-gray-400 mt-2">Transactions will appear here after payment</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((txn) => (
                        <div key={txn.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">Transaction #{txn.id.slice(-8)}</h3>
                                <Badge variant={txn.paymentStatus === 'captured' ? 'success' : 'warning'}>
                                  {txn.paymentStatus}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">Order #{txn.orderNumber}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(txn.createdAt).toLocaleString('en-AU')}
                              </p>
                              <p className="text-sm text-gray-600">Payment Method: {txn.paymentMethod?.toUpperCase() || 'N/A'}</p>
                              <p className="text-sm text-gray-600">Items: {txn.items}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">A${txn.amount.toFixed(2)}</p>
                              <p className="text-xs text-gray-500 mt-1">Paid</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : moreSubSection === 'reports' ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                  <button onClick={() => setMoreSubSection('main')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">View Reports</h2>
                    <p className="text-sm text-gray-600">Sales and transaction analytics</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-bold text-gray-900 mb-2">Total Transactions</h3>
                      <p className="text-3xl font-bold text-orange-600">{transactions.length}</p>
                      <p className="text-sm text-gray-500 mt-1">All time (this session)</p>
                    </div>
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-bold text-gray-900 mb-2">Total Revenue</h3>
                      <p className="text-3xl font-bold text-green-600">A${transactions.reduce((s, t) => s + t.amount, 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-500 mt-1">From completed payments</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Detailed reports and exports can be viewed in Restaurant Dashboard and System Control.</p>
                </div>
              </>
            ) : moreSubSection === 'printTest' ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                  <button onClick={() => setMoreSubSection('main')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Print Test Receipt</h2>
                    <p className="text-sm text-gray-600">Check printer with a sample receipt</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <p className="text-sm text-gray-600 mb-4">Print a test receipt to verify your printer is working. Uses sample data.</p>
                  <Button onClick={() => printReceipt()} variant="primary" size="lg">
                    <Printer className="w-5 h-5 mr-2" />
                    Print Test Receipt
                  </Button>
                </div>
              </>
            ) : moreSubSection === 'dailySummary' ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                  <button onClick={() => setMoreSubSection('main')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Daily Summary</h2>
                    <p className="text-sm text-gray-600">Today&apos;s sales overview</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-sm text-gray-500 mb-2">{new Date().toLocaleDateString('en-AU', { weekday: 'long', dateStyle: 'full' })}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-bold text-gray-900 mb-2">Transactions Today</h3>
                      <p className="text-3xl font-bold text-orange-600">
                        {transactions.filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString()).length}
                      </p>
                    </div>
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-bold text-gray-900 mb-2">Revenue Today</h3>
                      <p className="text-3xl font-bold text-green-600">
                        A${transactions.filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString()).reduce((s, t) => s + t.amount, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : moreSubSection === 'settings' ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                  <button onClick={() => setMoreSubSection('main')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">System Settings</h2>
                    <p className="text-sm text-gray-600">Language, currency, time zone</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={posLanguage}
                      onChange={(e) => setPosLanguage(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ar">Arabic</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Display language (translator). Full translation can be added per language.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={posCurrency}
                      onChange={(e) => setPosCurrency(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="AUD">AUD (A$)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time zone</label>
                    <select
                      value={posTimezone}
                      onChange={(e) => setPosTimezone(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="Australia/Sydney">Australia/Sydney</option>
                      <option value="Australia/Melbourne">Australia/Melbourne</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Current time: {new Date().toLocaleString('en-AU', { timeZone: posTimezone })}</p>
                  </div>
                </div>
              </>
            ) : moreSubSection === 'support' ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-4">
                  <button onClick={() => setMoreSubSection('main')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Support</h2>
                    <p className="text-sm text-gray-600">Send issue or technical help → appears in System Control</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {supportSent ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                      <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-800">Message sent</p>
                      <p className="text-sm text-green-700 mt-1">Your message is visible in System Control → Support (Help desk).</p>
                      <Button variant="ghost" className="mt-4" onClick={() => { setSupportSent(false); setSupportMessage('') }}>Send another</Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select
                          value={supportType}
                          onChange={(e) => setSupportType(e.target.value as 'issue' | 'technical')}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="issue">Issue / Bug</option>
                          <option value="technical">Technical help</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                        <textarea
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          placeholder="Describe your issue or request technical help..."
                          rows={4}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <Button
                        onClick={async () => {
                          if (!supportMessage.trim()) return
                          setSupportSending(true)
                          try {
                            const res = await fetch('/api/support', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ message: supportMessage.trim(), type: supportType, source: 'pos' }),
                            })
                            if (res.ok) setSupportSent(true)
                          } finally {
                            setSupportSending(false)
                          }
                        }}
                        disabled={!supportMessage.trim() || supportSending}
                        variant="primary"
                      >
                        {supportSending ? 'Sending...' : 'Send to System Control (Help desk)'}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* moreSubSection === 'items' */
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setMoreSubSection('main')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Menu Items</h2>
                      <p className="text-sm text-gray-600">Manage all POS menu items</p>
                    </div>
                  </div>
                  <Button onClick={handleAddItem} variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <p className="text-sm text-gray-500 mb-4">Drag categories or items to reorder. Use the color dots to set category color.</p>
                  <div className="space-y-4">
                    {categories.map((category, catIndex) => (
                      <div
                        key={category.id}
                        className={cn(
                          'mb-8 rounded-xl border-2 transition-shadow',
                          dragCategoryIndex === catIndex ? 'border-orange-400 bg-orange-50/50 shadow-lg' : 'border-transparent'
                        )}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          const raw = e.dataTransfer.getData('text/plain')
                          if (raw.startsWith('category:')) {
                            const from = parseInt(raw.slice(9), 10)
                            if (!Number.isNaN(from)) moveCategory(from, catIndex)
                          }
                          setDragCategoryIndex(null)
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span
                            className="cursor-grab active:cursor-grabbing touch-none p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Drag to reorder category"
                            draggable
                            onDragStart={(e) => {
                              setDragCategoryIndex(catIndex)
                              e.dataTransfer.setData('text/plain', `category:${catIndex}`)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => setDragCategoryIndex(null)}
                          >
                            <GripVertical className="w-5 h-5" />
                          </span>
                          <div className={cn('p-3 rounded-lg', category.bgColor)}>
                            <category.icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                          <Badge variant="info">{category.subItems.length} items</Badge>
                          <div className="flex items-center gap-1 ml-2" title="Category color">
                            {CATEGORY_COLOR_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                title={opt.value}
                                className={cn(
                                  'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                                  opt.bgColor,
                                  category.bgColor === opt.bgColor ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'
                                )}
                                onClick={() => setCategoryColor(category.id, opt.value)}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {category.subItems.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              className={cn(
                                'bg-gray-50 border-2 border-gray-200 rounded-xl p-4 transition-shadow',
                                dragItem?.categoryId === category.id && dragItem?.itemIndex === itemIndex && 'border-orange-400 shadow-md'
                              )}
                              draggable
                              onDragStart={(e) => {
                                setDragItem({ categoryId: category.id, itemIndex })
                                e.dataTransfer.setData('text/plain', `item:${category.id}:${itemIndex}`)
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                e.dataTransfer.dropEffect = 'move'
                              }}
                              onDragEnd={() => setDragItem(null)}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const raw = e.dataTransfer.getData('text/plain')
                                if (raw.startsWith('item:')) {
                                  const [, cid, idxStr] = raw.split(':')
                                  const fromIdx = parseInt(idxStr, 10)
                                  if (cid === category.id && !Number.isNaN(fromIdx)) moveItemInCategory(category.id, fromIdx, itemIndex)
                                }
                                setDragItem(null)
                              }}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 flex items-start gap-2">
                                  <span
                                    className="cursor-grab active:cursor-grabbing touch-none mt-0.5 text-gray-400 hover:text-gray-600 shrink-0"
                                    title="Drag to reorder item"
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-gray-900 mb-1">{item.name}</h4>
                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                    <p className="text-lg font-bold text-orange-600">A${(item.basePrice * (1 + GST_RATE)).toFixed(2)}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      {item.popular && <Badge variant="warning" className="text-xs">Popular</Badge>}
                                      {item.isAvailable ? (
                                        <Badge variant="success" className="text-xs">Available</Badge>
                                      ) : (
                                        <Badge variant="danger" className="text-xs">Unavailable</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg ml-2" />
                                )}
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                  className="flex-1"
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <span className="text-xs text-gray-500 self-center">Delete items in Restaurant Dashboard</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Customization Modal */}
      <Dialog open={showCustomizationModal} onOpenChange={setShowCustomizationModal}>
        <DialogContent
          title={`Customize ${selectedItem?.name}`}
          onClose={() => {
            setShowCustomizationModal(false)
            setSelectedItem(null)
          }}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {selectedItem && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedItem.name}</h3>
                    <p className="text-sm text-gray-600">{selectedItem.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {selectedItem.sizes?.length ? 'Size / Base (incl GST)' : 'Base Price (incl GST)'}
                    </p>
                    <p className="text-lg font-bold text-orange-600">
                      A${(selectedItemBasePrice * (1 + GST_RATE)).toFixed(2)}
                      {selectedItem.sizes?.length && (selectedSizeByItemId[selectedItem.id] ?? selectedItem.sizes[0]) && (
                        <span className="block text-sm font-normal text-gray-600">
                          ({(selectedSizeByItemId[selectedItem.id] ?? selectedItem.sizes[0]).name})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {selectedItem.sizes && selectedItem.sizes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500 mb-2">Size (incl GST)</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.sizes.map((size) => {
                        const selected = (selectedSizeByItemId[selectedItem.id] ?? selectedItem.sizes[0]).name === size.name
                        return (
                          <button
                            key={size.name}
                            type="button"
                            onClick={() => setSelectedSizeByItemId((prev) => ({ ...prev, [selectedItem.id]: size }))}
                            className={cn(
                              'inline-flex items-center px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                              selected ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                            )}
                          >
                            <span>{size.name}</span>
                            <span className="ml-2 font-semibold">A${(size.price * (1 + GST_RATE)).toFixed(2)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {(() => {
                const customizations = getDefaultCustomizations(selectedItem.id, selectedItem)
                if (customizations.length === 0) {
                  return (
                    <Button onClick={addToCartWithCustomizations} variant="primary" size="lg" className="w-full h-12">
                      Add to Cart
                    </Button>
                  )
                }

                return (
                  <>
                    {customizations.map((group) => {
                      const selected = selectedCustomizations[group.id] || []
                      return (
                        <div key={group.id} className="mb-6">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            {group.name}
                            {group.maxSelections === 1 && (
                              <span className="ml-2 text-xs text-gray-500">(Select one)</span>
                            )}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {group.options.map((option) => {
                              const isSelected = selected.includes(option.id)
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => toggleCustomization(group.id, option.id, group.maxSelections)}
                                  className={cn(
                                    "flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
                                    isSelected
                                      ? 'border-orange-500 bg-orange-50'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  )}
                                >
                                  <div className="flex items-center">
                                    <div
                                      className={cn(
                                        "w-6 h-6 rounded border-2 mr-3 flex items-center justify-center",
                                        isSelected
                                          ? 'border-orange-500 bg-orange-500'
                                          : 'border-gray-300'
                                      )}
                                    >
                                      {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className={cn("font-medium", isSelected ? 'text-orange-600' : 'text-gray-900')}>
                                      {option.name}
                                    </span>
                                  </div>
                                  {option.price > 0 && (
                                    <span className={cn("text-sm font-semibold", isSelected ? 'text-orange-600' : 'text-gray-600')}>
                                      +A${option.price.toFixed(2)}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border-t-2 border-gray-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Subtotal (incl. GST)</span>
                        <span className="text-gray-900">A${itemFinalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">GST included (10%)</span>
                        <span className="text-gray-900">A${itemGstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                        <span>TOTAL</span>
                        <span className="text-orange-600">A${itemFinalPrice.toFixed(2)}</span>
                      </div>
                    </div>

              <Button
                      onClick={addToCartWithCustomizations}
                      variant="primary"
                size="lg"
                      className="w-full h-12 text-base font-bold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add to Cart - A${itemFinalPrice.toFixed(2)}
                    </Button>
                  </>
                )
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open)
          if (!open) {
            setCashTendered('')
            setPaymentStep('method')
            setStripeClientSecret(null)
            setStripeOrderId(null)
            setStripePaymentIntentId(null)
            setStripeOrderNumber(0)
          }
        }}
      >
        <DialogContent
          title={paymentStep === 'card-form' ? 'Pay with card' : 'Select Payment Method'}
          className="max-w-md max-h-[90vh] overflow-y-auto"
          onClose={() => {
            setShowPaymentModal(false)
            setCashTendered('')
            setPaymentStep('method')
            setStripeClientSecret(null)
            setStripeOrderId(null)
            setStripePaymentIntentId(null)
            setStripeOrderNumber(0)
          }}
        >
          <div className="space-y-4">
            {paymentStep === 'card-form' && posStripePromise && stripeClientSecret && stripeOrderId && stripePaymentIntentId ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Pay with your card.
                  </p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setPaymentStep('method'); setStripeClientSecret(null); setStripeOrderId(null); setStripePaymentIntentId(null); setStripeOrderNumber(0) }}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Total: <strong className="text-orange-600">A${total.toFixed(2)}</strong></p>
                <Elements key={stripePaymentIntentId} stripe={posStripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: 'stripe' } }}>
                  <POSStripePayForm
                    orderId={stripeOrderId}
                    paymentIntentId={stripePaymentIntentId}
                    amountDisplay={`A$${total.toFixed(2)}`}
                    onSuccess={handleCardPaymentSuccess}
                    onError={(msg) => warning('Payment failed', msg)}
                  />
                </Elements>
              </div>
            ) : (
              <>
            {/* Order type: Pickup / Dine In / Delivery (no table number) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order type</label>
              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
                <TabsList className="w-full grid grid-cols-3 h-12">
                  <TabsTrigger value="pickup" className="text-sm font-semibold">Pickup</TabsTrigger>
                  <TabsTrigger value="dine-in" className="text-sm font-semibold">Dine In</TabsTrigger>
                  <TabsTrigger value="delivery" className="text-sm font-semibold">Delivery</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="mt-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <POSInput
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="border-0 bg-transparent p-0 h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Discount & Notes - after order type */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDiscountModal(true)}
                  className="w-full justify-center"
                >
                  <Percent className="w-4 h-4 mr-2" />
                  {discount ? `Discount applied: -A$${discountAmount.toFixed(2)}` : 'Apply discount'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cashier name</label>
                <POSInput
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="e.g. Staff name"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Card, Cash, or Mix Pay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('card'); setCashTendered(''); setMixCardAmount(''); setMixCashAmount('') }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    paymentMethod === 'card'
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <CreditCard className="w-8 h-8 mx-auto mb-1 text-gray-600" />
                  <p className="font-bold text-gray-900 text-sm">Card</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('cash'); setMixCardAmount(''); setMixCashAmount('') }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    paymentMethod === 'cash'
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <DollarSign className="w-8 h-8 mx-auto mb-1 text-gray-600" />
                  <p className="font-bold text-gray-900 text-sm">Cash</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('mix'); setCashTendered(''); setMixCardAmount(''); setMixCashAmount('') }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    paymentMethod === 'mix'
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Wallet className="w-8 h-8 mx-auto mb-1 text-gray-600" />
                  <p className="font-bold text-gray-900 text-sm">Mix Pay</p>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1">Order summary</h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST included (10%)</span>
                  <span>A${totalGst.toFixed(2)}</span>
                </div>
                {discount && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>Discount</span>
                    <span>-A${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {surchargeApplied && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{surchargeApplied.label} ({surchargeApplied.percent}%)</span>
                    <span>A${surchargeAmount.toFixed(2)}</span>
                  </div>
                )}
                {(paymentMethod === 'card' || paymentMethod === 'mix') && posCardSurchargeAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Card surcharge ({posSurcharge.posCardSurchargePercent}%)</span>
                    <span>A${posCardSurchargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                  <span>Total</span>
                  <span className="text-orange-600">A${totalBeforeCardSurcharge.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Amount to pay when Card or Mix (surcharge included in total; no separate surcharge line) */}
            {(paymentMethod === 'card' || paymentMethod === 'mix') && posCardSurchargeAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between text-lg font-bold text-amber-900">
                  <span>Amount to pay</span>
                  <span>A${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Cash: amount received and change */}
            {paymentMethod === 'cash' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-800">Cash received (A$)</label>
                <POSInput
                  type="number"
                  keyboardType="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 100"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="text-lg font-semibold tabular-nums"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCashTendered(total.toFixed(2))}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm font-medium hover:bg-amber-100"
                  >
                    Exact (A${total.toFixed(2)})
                  </button>
                  {[20, 50, 100].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCashTendered(String(n))}
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm font-medium hover:bg-amber-100"
                    >
                      A${n}
                    </button>
                  ))}
                </div>
                {(() => {
                  const received = parseFloat(cashTendered) || 0
                  const change = Math.max(0, received - total)
                  const short = total - received
                  if (received <= 0) {
                    return <p className="text-sm text-gray-500">Enter amount received to see change.</p>
                  }
                  if (received < total) {
                    return (
                      <p className="text-sm font-semibold text-amber-800">
                        Amount due: A${short.toFixed(2)}
                      </p>
                    )
                  }
                  return (
                    <p className="text-lg font-bold text-green-700">
                      Change to give: A${change.toFixed(2)}
                    </p>
                  )
                })()}
              </div>
            )}

            {/* Mix Pay: card amount + cash amount = total */}
            {paymentMethod === 'mix' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-700">Split payment: card (gateway) + cash. Total: <strong>A${total.toFixed(2)}</strong></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Card (A$)</label>
                    <POSInput
                      type="number"
                      keyboardType="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 40"
                      value={mixCardAmount}
                      onChange={(e) => {
                        setMixCardAmount(e.target.value)
                        const card = parseFloat(e.target.value) || 0
                        if (card <= total && card >= 0) setMixCashAmount((total - card).toFixed(2))
                      }}
                      className="text-lg font-semibold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Cash (A$)</label>
                    <POSInput
                      type="number"
                      keyboardType="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 60"
                      value={mixCashAmount}
                      onChange={(e) => {
                        setMixCashAmount(e.target.value)
                        const cash = parseFloat(e.target.value) || 0
                        if (cash <= total && cash >= 0) setMixCardAmount((total - cash).toFixed(2))
                      }}
                      className="text-lg font-semibold tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setMixCardAmount(total.toFixed(2)); setMixCashAmount('0.00') }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-medium hover:bg-gray-100"
                  >
                    All card
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMixCashAmount(total.toFixed(2)); setMixCardAmount('0.00') }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-medium hover:bg-gray-100"
                  >
                    All cash
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMixCardAmount((total / 2).toFixed(2)); setMixCashAmount((total / 2).toFixed(2)) }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-medium hover:bg-gray-100"
                  >
                    50/50
                  </button>
                </div>
                {(() => {
                  const card = parseFloat(mixCardAmount) || 0
                  const cash = parseFloat(mixCashAmount) || 0
                  const sum = card + cash
                  const diff = Math.abs(sum - total)
                  const isValid = diff < 0.01 && card >= 0 && cash >= 0
                  if (sum <= 0) return <p className="text-sm text-gray-500">Enter card and/or cash amounts.</p>
                  if (!isValid) return <p className="text-sm font-semibold text-amber-800">Card + Cash must equal total (A${total.toFixed(2)}). Current: A${sum.toFixed(2)}</p>
                  return <p className="text-sm font-semibold text-green-700">✓ Split valid: A${card.toFixed(2)} card + A${cash.toFixed(2)} cash = A${total.toFixed(2)}</p>
                })()}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash received for cash portion (A$) — optional, for change</label>
                  <POSInput
                    type="number"
                    keyboardType="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 70 if change needed"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="text-base tabular-nums"
                  />
                  {(() => {
                    const cashPortion = parseFloat(mixCashAmount) || 0
                    const received = parseFloat(cashTendered) || 0
                    const change = Math.max(0, received - cashPortion)
                    if (received <= 0 || cashPortion <= 0) return null
                    if (received < cashPortion) return <p className="text-sm text-amber-700 mt-1">Cash portion due: A${(cashPortion - received).toFixed(2)}</p>
                    return <p className="text-sm font-semibold text-green-700 mt-1">Change to give: A${change.toFixed(2)}</p>
                  })()}
                </div>
              </div>
            )}

            <Button
              onClick={paymentMethod === 'card' ? handleStartCardPayment : handlePayment}
              variant="primary"
              size="lg"
              className="w-full h-14 text-lg font-bold"
              disabled={
                isProcessing ||
                (paymentMethod === 'card' && !posStripePromise) ||
                (paymentMethod === 'mix' && (() => {
                  const card = parseFloat(mixCardAmount) || 0
                  const cash = parseFloat(mixCashAmount) || 0
                  return Math.abs((card + cash) - total) >= 0.01 || card < 0 || cash < 0
                })())
              }
              isLoading={isProcessing}
            >
              {isProcessing
                ? 'Processing...'
                : paymentMethod === 'card'
                  ? (posStripePromise ? 'Continue to card payment' : 'Card (Stripe not configured)')
                  : paymentMethod === 'mix'
                    ? 'Process Mix Payment'
                    : 'Process Cash Payment'}
            </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear order confirmation */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent
          title="Clear order?"
          description={`${cart.reduce((s, i) => s + i.quantity, 0)} item(s) will be removed. Table, customer name, and notes will be reset.`}
          onClose={() => setShowClearConfirm(false)}
          className="max-w-sm"
        >
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm text-gray-600">
              This cannot be undone. Start a new order after clearing.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={clearCart} className="min-w-[120px]">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Item Modal - same form as Restaurant Dashboard; POS cannot delete options or items */}
      <Dialog open={showItemModal} onOpenChange={(open) => !open && closeItemModal()}>
        <DialogContent
          title={editingItem ? 'Edit Item' : 'Add Item'}
          description={editingItem ? 'Update menu item details' : 'Add a new item to the POS menu. Delete options or items only in Restaurant Dashboard.'}
          onClose={closeItemModal}
          className="max-w-md max-h-[90vh] overflow-y-auto"
        >
          {!editingItem && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">New category color (when you create a new category)</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.value}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                      opt.bgColor,
                      newCategoryColor === opt.value ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'
                    )}
                    onClick={() => setNewCategoryColor(opt.value)}
                  />
                ))}
              </div>
            </div>
          )}
          <MenuItemForm
            initialData={editingItem ? (() => {
              const cat = categories.find((c) => c.subItems.some((s) => s.id === editingItem.id))
              return {
                id: editingItem.id,
                name: editingItem.name,
                description: editingItem.description,
                price: editingItem.basePrice,
                category: cat?.name ?? 'Other',
                image: editingItem.image,
                isAvailable: editingItem.isAvailable,
                customizations: editingItem.customizations,
                sizes: editingItem.sizes,
              } as Partial<MenuItem>
            })() : undefined}
            categoryOptions={categories.map((c) => c.name)}
            allowDeleteOptions={false}
            onSubmit={(data) => {
              let removeOptions: CustomizationOption[] = []
              let extras: CustomizationOption[] = []
              if (data.customizations?.length) {
                for (const g of data.customizations) {
                  if (g.type === 'remove') removeOptions = g.options.map((o) => ({ id: o.id, name: o.name, price: 0 }))
                  if (g.type === 'extra') extras = g.options.map((o) => ({ id: o.id, name: o.name, price: o.price }))
                }
              }
              const catName = (data.category ?? 'Other').trim()
              const existingCat = categories.find((c) => c.name === catName)
              const categoryId = existingCat ? existingCat.id : '__new__'
              const newCategoryName = existingCat ? undefined : (catName || undefined)
              handleSaveItem({
                name: data.name,
                description: data.description,
                basePrice: Number(data.price) ?? 0,
                image: data.image,
                isAvailable: data.isAvailable,
                categoryId,
                newCategoryName,
                newCategoryColor: categoryId === '__new__' ? newCategoryColor : undefined,
                removeOptions,
                extras,
                sizes: data.sizes,
              })
            }}
            onCancel={closeItemModal}
          />
        </DialogContent>
      </Dialog>

      {/* Discount Modal */}
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent
          title="Apply Discount"
          onClose={() => setShowDiscountModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDiscount({ type: 'percentage', value: 0 })}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    discount?.type === 'percentage'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  Percentage
                </button>
                <button
                  onClick={() => setDiscount({ type: 'fixed', value: 0 })}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    discount?.type === 'fixed'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  Fixed Amount
                </button>
        </div>
      </div>
            {discount && (
              <>
                <POSInput
                  label={discount.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                  type="number"
                  keyboardType="number"
                  value={String(discount.value)}
                  onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                />
                <POSInput
                  label="Discount Name (Optional)"
                  value={discount.name || ''}
                  onChange={(e) => setDiscount({ ...discount, name: e.target.value })}
                  placeholder="e.g., Student Discount"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setShowDiscountModal(false)}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDiscount(null)
                      setShowDiscountModal(false)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom bar: same 65% / 35% split as cart so price + Pay align with cart column */}
      <div className="bg-white border-t-2 border-gray-200 flex-shrink-0 flex min-h-[72px]">
        {/* Left 65%: menu buttons (aligns with menu/content area) */}
        <div className="w-[65%] min-w-0 flex-shrink-0 flex items-center px-4 py-3 border-r-2 border-gray-200">
          <div className="grid grid-cols-3 gap-2 w-full max-w-xl">
            <button
              onClick={() => setActiveSection('menu')}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-2 sm:py-3 sm:px-4 transition-colors rounded-lg min-h-[56px] sm:min-h-[64px]",
                activeSection === 'menu' ? 'text-orange-600 bg-orange-50/50' : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
              )}
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Home</span>
            </button>
            <button
              onClick={() => setActiveSection('orders')}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-2 sm:py-3 sm:px-4 transition-colors rounded-lg relative min-h-[56px] sm:min-h-[64px]",
                activeSection === 'orders' ? 'text-orange-600 bg-orange-50/50' : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
              )}
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Orders</span>
              {(pendingOrdersFromApi.length > 0 || orders.length > 0) && (
                <Badge variant="danger" className="absolute top-1 right-2 text-xs px-1.5 py-0.5 min-w-[18px] text-center">
                  {pendingOrdersFromApi.length > 0 ? pendingOrdersFromApi.length : orders.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => { setMoreSubSection('main'); setActiveSection('more') }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-2 sm:py-3 sm:px-4 transition-colors rounded-lg min-h-[56px] sm:min-h-[64px]",
                activeSection === 'more' ? 'text-orange-600 bg-orange-50/50' : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
              )}
            >
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">More</span>
            </button>
          </div>
        </div>

        {/* Right 35%: Pay button (with total) left, Order summary stacked right */}
        <div className="w-[35%] min-w-[280px] flex-shrink-0 flex items-center justify-between gap-3 sm:gap-4 px-4 py-3 bg-gray-50">
          <Button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            size="lg"
            className="min-h-[64px] sm:min-h-[72px] px-5 sm:px-8 text-lg sm:text-xl font-bold shadow-lg flex-shrink-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2"
          >
            <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0" />
            <span>Pay A${total.toFixed(2)}</span>
          </Button>
          <div className="text-right flex flex-col gap-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase">Order summary</p>
            <p className="text-sm text-gray-700">GST (10%): A${totalGst.toFixed(2)}</p>
            {discount && (
              <p className="text-sm text-green-600 font-medium">Discount: -A${discountAmount.toFixed(2)}</p>
            )}
            {surchargeApplied && (
              <p className="text-sm text-gray-600">{surchargeApplied.label}: A${surchargeAmount.toFixed(2)}</p>
            )}
            <p className="text-sm font-semibold text-gray-900">Total: A${totalBeforeCardSurcharge.toFixed(2)}</p>
            {(paymentMethod === 'card' || paymentMethod === 'mix') && posCardSurchargeAmount > 0 && (
              <p className="text-base font-bold text-orange-600">Amount to pay: A${total.toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </POSKeyboardProvider>
  )
}
