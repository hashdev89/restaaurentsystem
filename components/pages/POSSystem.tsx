'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Receipt,
  Printer,
  User,
  Hash,
  Percent,
  MessageSquare,
  Star,
  Zap,
  ArrowLeft,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useNotification } from '../providers/NotificationProvider'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Dialog, DialogContent } from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { cn } from '@/lib/utils'
import { OrderType, Order } from '@/types'
import { MOCK_RESTAURANTS } from './RestaurantList'
import { normalizeOrders, type SupabaseOrderRow } from '@/lib/orders'

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

interface POSSubItem {
  id: string
  name: string
  description: string
  basePrice: number
  isAvailable: boolean
  popular?: boolean
  image: string
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
}

type PaymentMethod = 'card' | 'cash'
type DiscountType = 'percentage' | 'fixed'

interface Discount {
  type: DiscountType
  value: number
  name?: string
}

// GST constant (Australian GST is 10%)
const GST_RATE = 0.1

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
        id: 'add_toppings',
        name: 'Add Toppings',
        type: 'add',
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
        id: 'remove_items',
        name: 'Remove Items',
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
        id: 'add_toppings',
        name: 'Add Toppings',
        type: 'add',
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
        id: 'remove_items',
        name: 'Remove Items',
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
        type: 'add',
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

export function POSSystem() {
  const { success, warning } = useNotification()
  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<POSSubItem | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('dine-in')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCustomizationModal, setShowCustomizationModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({})
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [discount, setDiscount] = useState<Discount | null>(null)
  const [tip, setTip] = useState(0)
  const [tipPercentage, setTipPercentage] = useState<number | null>(null)
  const [orderNumber, setOrderNumber] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [activeSection, setActiveSection] = useState<'menu' | 'orders' | 'transactions' | 'items' | 'more'>('menu')
  const [orders, setOrders] = useState<any[]>([])
  const [apiOrders, setApiOrders] = useState<Order[]>([])
  const [apiOrdersLoading, setApiOrdersLoading] = useState(false)
  const lastPendingIdsRef = useRef<Set<string>>(new Set())
  const [transactions, setTransactions] = useState<any[]>([])
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<POSSubItem | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  // Categories state so we can add/edit/delete items (initialized from POS_CATEGORIES)
  const [categories, setCategories] = useState<POSCategory[]>(() =>
    POS_CATEGORIES.map(cat => ({ ...cat, subItems: cat.subItems.map(s => ({ ...s })) }))
  )

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
  }, [selectedCategory, searchQuery])

  // Get available item count for each category
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

  const total = useMemo(() => 
    subtotalInclGst - discountAmount + tip, [subtotalInclGst, discountAmount, tip]
  )

  // Quick add to cart (no customization) - increments quantity if item exists
  const quickAddToCart = useCallback((item: POSSubItem) => {
    const category = categories.find(cat => 
      cat.subItems.some(subItem => subItem.id === item.id)
    )

    setCart((prev) => {
      // Check if exact same item (same base item, no customizations) already exists
      const existingItem = prev.find(
        cartItem => 
          cartItem.name === item.name && 
          cartItem.basePrice === item.basePrice &&
          cartItem.customizations.length === 0
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
      // basePrice is ex GST, calculate GST and price incl GST
      const priceExGst = item.basePrice
      const gstAmount = priceExGst * GST_RATE
      const priceInclGst = priceExGst + gstAmount

      const cartItem: CartItem = {
        id: `${item.id}-${Date.now()}`,
        name: item.name,
        description: item.description,
        basePrice: item.basePrice, // ex GST
        quantity: 1,
        categoryName: category?.name || 'Other',
        customizations: [],
        finalPrice: priceInclGst, // incl GST
        gstAmount: gstAmount
      }

      return [...prev, cartItem]
    })
  }, [])

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
    
    // Direct add to cart (increments quantity if exists)
    quickAddToCart(item)
  }, [quickAddToCart])

  // Handle customize button click
  const handleCustomizeClick = useCallback((item: POSSubItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedItem(item)
    setSelectedCustomizations({})
    setShowCustomizationModal(true)
  }, [])

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
    // basePrice and customizations are ex GST
    const priceExGst = selectedItem.basePrice + customizationPrice
    const gstAmount = priceExGst * GST_RATE
    const priceInclGst = priceExGst + gstAmount

    const cartItem: CartItem = {
      id: `${selectedItem.id}-${Date.now()}`,
      name: selectedItem.name,
      description: selectedItem.description,
      basePrice: selectedItem.basePrice, // ex GST
      quantity: 1,
      categoryName: category?.name || 'Other',
      customizations: finalCustomizations,
      finalPrice: priceInclGst, // incl GST
      gstAmount: gstAmount
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

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('Clear current order?')) {
      setCart([])
      setTableNumber('')
      setCustomerName('')
      setOrderNotes('')
      setDiscount(null)
      setTip(0)
      setTipPercentage(null)
    }
  }

  // Print receipt function for standard POS thermal printers
  const printReceipt = useCallback(() => {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600')
    if (!receiptWindow) return

    const currentDate = new Date().toLocaleString('en-AU', {
      dateStyle: 'short',
      timeStyle: 'short'
    })

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - Order #${orderNumber}</title>
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
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
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
      margin: 10px 0;
      padding: 5px 0;
      border-bottom: 1px dashed #000;
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
      padding-bottom: 5px;
      border-bottom: 1px dotted #ccc;
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
      padding-top: 5px;
      border-top: 1px dashed #000;
      margin-top: 10px;
    }
    .payment-info {
      margin: 15px 0;
      padding: 10px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
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
      padding-top: 10px;
      border-top: 1px dashed #000;
      font-size: 10px;
    }
    .divider {
      text-align: center;
      margin: 10px 0;
      font-size: 14px;
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
    <div class="header">
      <div class="business-name">RESTAURANT POS</div>
      <div class="business-info">123 Main Street</div>
      <div class="business-info">Sydney, NSW 2000</div>
      <div class="business-info">Phone: (02) 1234 5678</div>
      <div class="business-info">ABN: 12 345 678 901</div>
    </div>

    <div class="order-info">
      <div class="order-info-row">
        <span>Order #:</span>
        <span><strong>${orderNumber}</strong></span>
      </div>
      <div class="order-info-row">
        <span>Date:</span>
        <span>${currentDate}</span>
      </div>
      <div class="order-info-row">
        <span>Type:</span>
        <span>${orderType === 'dine-in' ? 'Dine In' : orderType === 'pickup' ? 'Pickup' : 'Delivery'}</span>
      </div>
      ${orderType === 'dine-in' && tableNumber ? `
      <div class="order-info-row">
        <span>Table:</span>
        <span><strong>${tableNumber}</strong></span>
      </div>
      ` : ''}
      ${customerName ? `
      <div class="order-info-row">
        <span>Customer:</span>
        <span>${customerName}</span>
      </div>
      ` : ''}
    </div>

    <div class="divider">━━━━━━━━━━━━━━━━━━━━</div>

    <div class="items">
      ${cart.map(item => {
        const itemPriceExGst = item.basePrice + item.customizations.reduce((sum, c) => sum + c.totalPrice, 0)
        const itemGst = item.gstAmount
        const itemPriceInclGst = item.finalPrice
        return `
        <div class="item-row">
          <div class="item-name">${item.quantity}x ${item.name}</div>
          ${item.customizations.length > 0 ? `
          <div class="item-details">
            ${item.customizations.map(c => `  ${c.groupName}: ${c.optionNames.join(', ')}`).join('<br>')}
          </div>
          ` : ''}
          <div class="item-qty-price">
            <span>@ A$${itemPriceInclGst.toFixed(2)} (incl GST)</span>
            <span><strong>A$${(itemPriceInclGst * item.quantity).toFixed(2)}</strong></span>
          </div>
        </div>
        `
      }).join('')}
    </div>

    <div class="divider">━━━━━━━━━━━━━━━━━━━━</div>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal (ex GST):</span>
        <span>A$${subtotalExGst.toFixed(2)}</span>
      </div>
      <div class="total-row gst">
        <span>GST (10%):</span>
        <span>A$${totalGst.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Subtotal (incl GST):</span>
        <span>A$${subtotalInclGst.toFixed(2)}</span>
      </div>
      ${discount ? `
      <div class="total-row" style="color: green;">
        <span>Discount${discount.name ? ` (${discount.name})` : ''}:</span>
        <span>-A$${discountAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      ${tip > 0 ? `
      <div class="total-row">
        <span>Tip${tipPercentage ? ` (${tipPercentage}%)` : ''}:</span>
        <span>A$${tip.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row final">
        <span>TOTAL:</span>
        <span>A$${total.toFixed(2)}</span>
      </div>
    </div>

    <div class="payment-info">
      <div class="payment-row">
        <span>Payment Method:</span>
        <span><strong>${paymentMethod === 'card' ? 'CARD' : 'CASH'}</strong></span>
      </div>
      <div class="payment-row">
        <span>Amount Paid:</span>
        <span><strong>A$${total.toFixed(2)}</strong></span>
      </div>
      <div class="payment-row">
        <span>Status:</span>
        <span><strong>PAID</strong></span>
      </div>
    </div>

    ${orderNotes ? `
    <div class="notes">
      <strong>Notes:</strong><br>
      ${orderNotes}
    </div>
    ` : ''}

    <div class="footer">
      <div>Thank you for your visit!</div>
      <div style="margin-top: 5px;">GST included in prices</div>
      <div style="margin-top: 10px; font-size: 9px;">
        This is a computer-generated receipt.<br>
        No signature required.
      </div>
    </div>

    <div class="divider">━━━━━━━━━━━━━━━━━━━━</div>
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
  }, [cart, orderNumber, orderType, tableNumber, customerName, subtotalExGst, totalGst, subtotalInclGst, discount, discountAmount, tip, tipPercentage, total, paymentMethod, orderNotes])

  const handleTip = (percentage: number) => {
    setTipPercentage(percentage)
    const tipAmount = (subtotalInclGst - discountAmount) * (percentage / 100)
    setTip(tipAmount)
  }

  const removeTip = () => {
    setTip(0)
    setTipPercentage(null)
  }

  const handlePayment = async () => {
    if (cart.length === 0) return
    if (orderType === 'dine-in' && !tableNumber) {
      alert('Please enter a table number')
      return
    }

    setIsProcessing(true)

    try {
      const orderId = `POS-${Date.now()}-${orderNumber}`
      
      // BYPASS PAYMENT GATEWAY FOR TESTING
      // Skip actual payment API call and create mock payment response
      const paymentData = {
        paymentId: `test-${paymentMethod}-${Date.now()}`,
        status: 'COMPLETED',
        message: 'Payment bypassed for testing'
      }

      // Determine payment status - always captured for testing
      const paymentStatus = 'captured'

      // Try to create order in backend, but continue even if it fails (for testing)
      try {
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          restaurantId: MOCK_RESTAURANTS[0].id,
          customerName: customerName || (orderType === 'dine-in' ? `Table ${tableNumber}` : 'Walk-in'),
          customerEmail: '',
          customerPhone: '',
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
            paymentStatus: paymentStatus,
            squarePaymentId: paymentData.paymentId
          })
        })

        // Continue even if order creation fails (for testing without backend)
        if (!orderResponse.ok) {
          warning('Order saved locally', 'Backend sync failed. Order stored offline.')
        } else {
          const data = await orderResponse.json().catch(() => ({}))
          success('Payment complete', `Order #${orderNumber} saved`, {
            actionHref: data.orderId ? `/orders` : undefined,
            actionLabel: 'View orders',
          })
        }
      } catch (orderError) {
        // Continue even if order API fails (for testing)
        console.warn('Order API error, continuing with local storage:', orderError)
        warning('Order saved locally', 'Could not sync to server. Order stored offline.')
      }

      // Print receipt automatically after successful payment
      setTimeout(() => {
        printReceipt()
      }, 500)

      // Add to orders and transactions
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

      alert(`✅ Order Processed Successfully!\n\nOrder #${orderNumber}\nSubtotal (ex GST): A$${subtotalExGst.toFixed(2)}\nGST (10%): A$${totalGst.toFixed(2)}\nTotal (incl GST): A$${total.toFixed(2)}\nPayment Method: ${paymentMethod.toUpperCase()} (BYPASSED FOR TESTING)\n\nReceipt will be printed automatically.`)
      
      setCart([])
      setTableNumber('')
      setCustomerName('')
      setOrderNotes('')
      setDiscount(null)
      setTip(0)
      setTipPercentage(null)
      setOrderNumber(prev => prev + 1)
      setShowPaymentModal(false)
      setPaymentMethod('card')
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
        }
      }
      
      // Quick payment
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && cart.length > 0 && !showCustomizationModal && !showPaymentModal) {
        setShowPaymentModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showCustomizationModal, showPaymentModal, showDiscountModal, cart])

  const POS_RESTAURANT_ID = MOCK_RESTAURANTS[0].id
  const fetchApiOrders = useCallback(async () => {
    try {
      setApiOrdersLoading(true)
      const res = await fetch(`/api/orders?restaurantId=${POS_RESTAURANT_ID}`)
      if (!res.ok) return
      const data = await res.json()
      const list = (data.orders || []) as SupabaseOrderRow[]
      const normalized = normalizeOrders(list)
      const pendingIds = new Set(normalized.filter((o) => o.status === 'pending').map((o) => o.id))
      const prev = lastPendingIdsRef.current
      const newPending = [...pendingIds].filter((id) => !prev.has(id))
      lastPendingIdsRef.current = pendingIds
      setApiOrders(normalized)
      if (newPending.length > 0) {
        success('New order', `${newPending.length} new order(s) received. Check Orders.`, {
          actionHref: undefined,
          actionLabel: undefined
        })
      }
    } catch (e) {
      console.error('POS fetch orders error:', e)
    } finally {
      setApiOrdersLoading(false)
    }
  }, [success])

  useEffect(() => {
    fetchApiOrders()
    const interval = setInterval(fetchApiOrders, 8000)
    return () => clearInterval(interval)
  }, [fetchApiOrders])

  const updateApiOrderStatus = useCallback(
    async (orderId: string, status: Order['status']) => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
        if (!res.ok) throw new Error('Update failed')
        setApiOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
        if (status === 'accepted') success('Order accepted', 'Order sent to kitchen.')
        else if (status === 'completed') success('Order completed', 'Ready for billing.')
      } catch (e) {
        warning('Update failed', e instanceof Error ? e.message : 'Could not update order')
      }
    },
    [success, warning]
  )

  const addToCartByBarcode = useCallback(
    async (barcode: string) => {
      const code = String(barcode).trim()
      if (!code) return
      try {
        const res = await fetch(`/api/inventory?restaurantId=${POS_RESTAURANT_ID}&barcode=${encodeURIComponent(code)}`)
        if (!res.ok) return
        const data = await res.json()
        const items = data.items ?? []
        const invItem = items[0]
        if (!invItem) {
          warning('Barcode not found', `No item with barcode "${code}". Add it in Dashboard → Stock.`)
          return
        }
        const qty = Number(invItem.quantity) ?? 0
        if (qty < 1) {
          warning('Out of stock', `${invItem.name} has 0 quantity. Restock in Dashboard → Stock.`)
          return
        }
        const price = Number(invItem.price) ?? 0
        const priceExGst = price / (1 + GST_RATE)
        const gstAmount = priceExGst * GST_RATE
        const cartItem: CartItem = {
          id: `inv_${invItem.id}-${Date.now()}`,
          name: invItem.name,
          description: 'Barcode item',
          basePrice: priceExGst,
          quantity: 1,
          categoryName: 'Barcode',
          customizations: [],
          finalPrice: price,
          gstAmount
        }
        setCart((prev) => {
          const existing = prev.find((c) => c.name === invItem.name && c.categoryName === 'Barcode' && c.basePrice === priceExGst)
          if (existing) {
            return prev.map((c) => (c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c))
          }
          return [...prev, cartItem]
        })
        const newQty = Math.max(0, qty - 1)
        await fetch(`/api/inventory/${invItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty })
        })
        success('Added', `${invItem.name} added to cart. Stock: ${newQty}`)
        setBarcodeInput('')
      } catch (e) {
        console.error('Barcode add error:', e)
        warning('Error', 'Could not add barcode item.')
      }
    },
    [success, warning]
  )

  const customizationPrice = selectedItem ? calculateCustomizationPrice() : 0
  const itemPriceExGst = selectedItem ? selectedItem.basePrice + customizationPrice : 0
  const itemGstAmount = itemPriceExGst * GST_RATE
  const itemFinalPrice = itemPriceExGst + itemGstAmount

  // Item form state for Add/Edit modal
  type ItemFormData = {
    categoryId: string
    name: string
    description: string
    basePrice: number
    image: string
    isAvailable: boolean
    popular: boolean
    customizations: CustomizationGroup[]
  }
  const defaultItemForm = (): ItemFormData => ({
    categoryId: categories[0]?.id ?? 'burgers',
    name: '',
    description: '',
    basePrice: 0,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    isAvailable: true,
    popular: false,
    customizations: []
  })
  const [itemForm, setItemForm] = useState<ItemFormData | null>(null)

  const openAddItemModal = () => {
    setEditingItem(null)
    setItemForm(defaultItemForm())
    setShowItemModal(true)
  }

  const openEditItemModal = (item: POSSubItem) => {
    const category = categories.find(cat => cat.subItems.some(s => s.id === item.id))
    const cust = getDefaultCustomizations(item.id, item)
    const customizations = cust.map(g => ({
      ...g,
      options: g.options.map(o => ({ ...o }))
    }))
    setEditingItem(item)
    setItemForm({
      categoryId: category?.id ?? categories[0]?.id ?? 'burgers',
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      image: item.image,
      isAvailable: item.isAvailable,
      popular: item.popular ?? false,
      customizations
    })
    setShowItemModal(true)
  }

  const handleAddItem = openAddItemModal
  const handleEditItem = openEditItemModal

  const handleDeleteItem = (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    setCategories(prev =>
      prev.map(cat => ({
        ...cat,
        subItems: cat.subItems.filter(s => s.id !== itemId)
      }))
    )
    success('Item removed', 'Item has been deleted from the menu.')
  }

  const addCustomizationGroup = () => {
    if (!itemForm) return
    const id = `grp_${Date.now()}`
    setItemForm({
      ...itemForm,
      customizations: [
        ...itemForm.customizations,
        { id, name: 'New group', type: 'add', options: [] }
      ]
    })
  }

  const updateCustomizationGroup = (groupIndex: number, updates: Partial<CustomizationGroup>) => {
    if (!itemForm) return
    const next = [...itemForm.customizations]
    next[groupIndex] = { ...next[groupIndex], ...updates }
    setItemForm({ ...itemForm, customizations: next })
  }

  const removeCustomizationGroup = (groupIndex: number) => {
    if (!itemForm) return
    setItemForm({
      ...itemForm,
      customizations: itemForm.customizations.filter((_, i) => i !== groupIndex)
    })
  }

  const addCustomizationOption = (groupIndex: number) => {
    if (!itemForm) return
    const id = `opt_${Date.now()}`
    const next = [...itemForm.customizations]
    next[groupIndex] = {
      ...next[groupIndex],
      options: [...next[groupIndex].options, { id, name: 'New option', price: 0 }]
    }
    setItemForm({ ...itemForm, customizations: next })
  }

  const updateCustomizationOption = (groupIndex: number, optionIndex: number, updates: Partial<CustomizationOption>) => {
    if (!itemForm) return
    const next = [...itemForm.customizations]
    const opts = [...next[groupIndex].options]
    opts[optionIndex] = { ...opts[optionIndex], ...updates }
    next[groupIndex] = { ...next[groupIndex], options: opts }
    setItemForm({ ...itemForm, customizations: next })
  }

  const removeCustomizationOption = (groupIndex: number, optionIndex: number) => {
    if (!itemForm) return
    const next = [...itemForm.customizations]
    next[groupIndex] = {
      ...next[groupIndex],
      options: next[groupIndex].options.filter((_, i) => i !== optionIndex)
    }
    setItemForm({ ...itemForm, customizations: next })
  }

  const handleSaveItem = () => {
    if (!itemForm) return
    const { name, description, basePrice, image, isAvailable, popular, categoryId, customizations } = itemForm
    if (!name.trim()) {
      warning('Missing name', 'Please enter an item name.')
      return
    }
    if (basePrice < 0) {
      warning('Invalid price', 'Base price must be 0 or greater.')
      return
    }

    const payload: POSSubItem = {
      id: editingItem?.id ?? `custom_${Date.now()}`,
      name: name.trim(),
      description: (description || '').trim(),
      basePrice: Number(basePrice) || 0,
      image: image || defaultItemForm().image,
      isAvailable,
      popular,
      customizations: customizations.length ? customizations : undefined
    }

    if (editingItem) {
      const oldCategoryId = categories.find(cat => cat.subItems.some(s => s.id === editingItem.id))?.id
      setCategories(prev =>
        prev.map(cat => {
          if (cat.id === oldCategoryId && cat.id === categoryId) {
            return { ...cat, subItems: cat.subItems.map(s => (s.id === editingItem.id ? payload : s)) }
          }
          if (cat.id === oldCategoryId) {
            return { ...cat, subItems: cat.subItems.filter(s => s.id !== editingItem.id) }
          }
          if (cat.id === categoryId) {
            return { ...cat, subItems: [...cat.subItems, payload] }
          }
          return cat
        })
      )
      success('Item updated', `${name} has been updated.`)
    } else {
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId ? { ...cat, subItems: [...cat.subItems, payload] } : cat
        )
      )
      success('Item added', `${name} has been added to the menu.`)
    }
    setShowItemModal(false)
    setEditingItem(null)
    setItemForm(null)
  }

  // Get all items for Items section
  const allItems = useMemo(() => {
    return categories.flatMap(cat => 
      cat.subItems.map(item => ({
        ...item,
        categoryName: cat.name,
        categoryId: cat.id
      }))
    )
  }, [categories])

  return (
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
            <Button variant="ghost" size="sm" onClick={clearCart} disabled={cart.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conditional Section Rendering */}
        {activeSection === 'menu' && (
          <>
            {/* Left Panel - Menu (70%) */}
            <div className="w-[70%] flex flex-col bg-white border-r-2 border-gray-200">
          {/* Search and Categories */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gray-50">
            <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
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
              {filteredItems.map((item) => {
                const category = categories.find((cat) => cat.subItems.some((sub) => sub.id === item.id))
                const Icon = category?.icon || UtensilsCrossed
                return (
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
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                        <p className="text-xl font-bold text-orange-600 mb-1">A${(item.basePrice * (1 + GST_RATE)).toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mb-2">incl. GST</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleCustomizeClick(item, e)}
                      className="customize-button w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold py-5 px-4 transition-all text-lg hover:from-orange-600 hover:to-orange-700 active:scale-95 shadow-2xl border-t-4 border-orange-400 mt-auto flex items-center justify-center gap-2 uppercase tracking-wide"
                    >
                      <Plus className="w-6 h-6" />
                      Customize & Add
                    </button>
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Cart (30%) */}
        <div className="w-[30%] flex flex-col bg-gray-50 border-l-2 border-gray-200">
          {/* Barcode scan - add items from inventory */}
          {activeSection === 'menu' && (
            <div className="p-3 bg-white border-b border-gray-200">
              <label className="block text-xs font-medium text-gray-600 mb-1">Scan barcode (e.g. water bottles)</label>
              <div className="flex gap-2">
                <Input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan or type barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToCartByBarcode(barcodeInput)
                    }
                  }}
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addToCartByBarcode(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Cart is empty</p>
                <p className="text-sm text-gray-400 mt-2">Select items to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900 text-base">{item.name}</p>
                          {item.quantity > 1 && (
                            <Badge variant="info" className="text-xs">
                              x{item.quantity}
                            </Badge>
                          )}
                        </div>
                        {item.customizations.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.customizations.map((custom, idx) => (
                              <p key={idx} className="text-xs text-gray-600">
                                {custom.groupName}: {custom.optionNames.join(', ')}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">A${item.finalPrice.toFixed(2)} each (incl. GST)</p>
                        <p className="text-xs text-gray-400 mt-0.5">GST: A${(item.gstAmount * item.quantity).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0 p-2 active:scale-95 transition-transform"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="w-12 text-center font-bold text-xl">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="font-bold text-gray-900 text-xl">
                        A${(item.finalPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Actions - Fixed at bottom */}
          <div className="p-4 bg-white border-t-2 border-gray-200 flex-shrink-0 space-y-3">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDiscountModal(true)}
                className="h-14 text-base font-semibold"
              >
                <Percent className="w-5 h-5 mr-2" />
                Discount
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const notes = prompt('Order notes:', orderNotes)
                  if (notes !== null) setOrderNotes(notes)
                }}
                className="h-14 text-base font-semibold"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Notes
              </Button>
            </div>

              {/* Totals */}
            <div className="space-y-1.5 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-gray-600 text-sm">
                  <span>Subtotal (ex GST)</span>
                  <span>A${subtotalExGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>GST (10%)</span>
                <span>A${totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 text-sm font-semibold">
                  <span>Subtotal (incl GST)</span>
                  <span>A${subtotalInclGst.toFixed(2)}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-green-600 text-sm font-semibold">
                  <span>Discount {discount.name && `(${discount.name})`}</span>
                  <span>-A${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tip > 0 && (
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Tip {tipPercentage && `(${tipPercentage}%)`}</span>
                  <span>A${tip.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                  <span>Total (incl GST)</span>
                <span className="text-orange-600">A${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Tip Buttons - No tip + percentages, larger for touch */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={removeTip}
                className={cn(
                  "px-2 py-4 rounded-xl text-sm font-bold transition-all active:scale-95 min-h-[56px] flex items-center justify-center",
                  tip === 0
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                title="Remove tip"
              >
                No tip
              </button>
              {[15, 18, 20, 25].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handleTip(percent)}
                  className={cn(
                    "px-2 py-4 rounded-xl text-base font-bold transition-all active:scale-95 min-h-[56px]",
                    tipPercentage === percent
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* Payment Button - Large and prominent for touch */}
            <Button
              className="w-full h-16 text-xl font-bold shadow-lg"
              size="lg"
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
            >
              <CreditCard className="w-7 h-7 mr-2" />
              Pay A${total.toFixed(2)}
            </Button>

            {/* Print Receipt Button */}
            {cart.length > 0 && (
              <Button
                variant="secondary"
                className="w-full h-14 text-base font-semibold mt-3"
                onClick={printReceipt}
              >
                <Printer className="w-5 h-5 mr-2" />
                Print Receipt
              </Button>
            )}
          </div>
        </div>
          </>
        )}

        {/* Orders Section - Customer & API orders */}
        {activeSection === 'orders' && (
          <div className="w-full flex flex-col bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Orders</h2>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search orders..."
                  className="flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Badge variant="info">{apiOrders.length} orders</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {apiOrdersLoading && apiOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading orders...</p>
                </div>
              ) : apiOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No orders yet</p>
                  <p className="text-sm text-gray-400 mt-2">Customer orders and POS payments appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiOrders.map((order) => (
                    <div key={order.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                            <Badge
                              variant={
                                order.status === 'pending'
                                  ? 'warning'
                                  : order.status === 'ready'
                                    ? 'success'
                                    : order.status === 'completed'
                                      ? 'info'
                                      : 'info'
                              }
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleString('en-AU')}
                          </p>
                          {order.tableNumber && (
                            <p className="text-sm text-gray-600">Table: {order.tableNumber}</p>
                          )}
                          <p className="text-sm text-gray-600">Customer: {order.customerName || 'Walk-in'}</p>
                          <p className="text-sm text-gray-600">Payment: {order.paymentStatus?.toUpperCase() || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">A${order.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-500 mt-1">{order.items.length} items</p>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-gray-600">A${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => updateApiOrderStatus(order.id, 'rejected')}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateApiOrderStatus(order.id, 'accepted')}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                            </>
                          )}
                          {order.status === 'ready' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => updateApiOrderStatus(order.id, 'completed')}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Proceed to billing
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Section */}
        {activeSection === 'transactions' && (
          <div className="w-full flex flex-col bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Transactions</h2>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search transactions..."
                  className="flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Badge variant="info">{transactions.length} transactions</Badge>
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
          </div>
        )}

        {/* Items Management Section */}
        {activeSection === 'items' && (
          <div className="w-full flex flex-col bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu Items</h2>
                <p className="text-sm text-gray-600">Manage all POS menu items</p>
              </div>
              <Button onClick={handleAddItem} variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("p-3 rounded-lg", category.bgColor)}>
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                      <Badge variant="info">{category.subItems.length} items</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.subItems.map((item) => (
                        <div key={item.id} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
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
                              <Check className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="flex-1"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* More/Settings Section */}
        {activeSection === 'more' && (
          <div className="w-full flex flex-col bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">More Options</h2>
              <p className="text-sm text-gray-600">POS system settings and special functions</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all">
                  <Printer className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">Print Test Receipt</h3>
                  <p className="text-sm text-gray-600">Print a test receipt to check printer</p>
                </button>
                <button className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all">
                  <Receipt className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">View Reports</h3>
                  <p className="text-sm text-gray-600">Sales reports and analytics</p>
                </button>
                <button className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all">
                  <TrendingUp className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">Daily Summary</h3>
                  <p className="text-sm text-gray-600">View today's sales summary</p>
                </button>
                <button className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all">
                  <Clock className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">Shift Management</h3>
                  <p className="text-sm text-gray-600">Start/end shift, view shift reports</p>
                </button>
                <button className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all">
                  <User className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">Staff Management</h3>
                  <p className="text-sm text-gray-600">Manage staff and permissions</p>
                </button>
                <button className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all">
                  <Zap className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">System Settings</h3>
                  <p className="text-sm text-gray-600">Configure POS settings</p>
                </button>
              </div>
            </div>
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
                    <p className="text-sm text-gray-500">Base Price (incl GST)</p>
                    <p className="text-lg font-bold text-orange-600">A${(selectedItem.basePrice * (1 + GST_RATE)).toFixed(2)}</p>
                  </div>
                </div>
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
                        <span className="text-gray-600">Subtotal (ex GST)</span>
                        <span className="text-gray-900">A${itemPriceExGst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">GST (10%)</span>
                        <span className="text-gray-900">A${itemGstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                        <span>Total (incl GST)</span>
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
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent
          title="Select Payment Method"
          onClose={() => setShowPaymentModal(false)}
        >
          <div className="space-y-4">
            {/* Order type: Dine In / Pickup / Delivery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order type</label>
              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
                <TabsList className="w-full grid grid-cols-3 h-12">
                  <TabsTrigger value="dine-in" className="text-sm font-semibold">Dine In</TabsTrigger>
                  <TabsTrigger value="pickup" className="text-sm font-semibold">Pickup</TabsTrigger>
                  <TabsTrigger value="delivery" className="text-sm font-semibold">Delivery</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="mt-3 space-y-2">
                {orderType === 'dine-in' && (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <Input
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Table #"
                      className="border-0 bg-transparent p-0 h-8 text-sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="border-0 bg-transparent p-0 h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Card or Cash */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all",
                    paymentMethod === 'card'
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p className="font-bold text-gray-900">Card</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all",
                    paymentMethod === 'cash'
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p className="font-bold text-gray-900">Cash</p>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal (ex GST)</span>
                  <span>A${subtotalExGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST (10%)</span>
                  <span>A${totalGst.toFixed(2)}</span>
                </div>
                {discount && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>Discount</span>
                    <span>-A${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {tip > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tip</span>
                    <span>A${tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                  <span>Total (incl GST)</span>
                  <span className="text-orange-600">A${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              variant="primary"
              size="lg"
              className="w-full h-14 text-lg font-bold"
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              {isProcessing ? 'Processing...' : `Process ${paymentMethod === 'card' ? 'Card' : 'Cash'} Payment`}
              </Button>
          </div>
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
                <Input
                  label={discount.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                  type="number"
                  value={discount.value}
                  onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                />
                <Input
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

      {/* Add/Edit Item Modal */}
      {showItemModal && itemForm && (
        <Dialog open={showItemModal} onOpenChange={(open) => { if (!open) { setShowItemModal(false); setEditingItem(null); setItemForm(null) } }}>
          <DialogContent
            title={editingItem ? 'Edit Item' : 'Add Item'}
            onClose={() => { setShowItemModal(false); setEditingItem(null); setItemForm(null) }}
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-4">
              <Input
                label="Item name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g. Aussie Beef Burger"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Short description"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base price (ex GST) A$"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.basePrice === 0 ? '' : itemForm.basePrice}
                  onChange={(e) => setItemForm({ ...itemForm, basePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Input
                label="Image URL"
                value={itemForm.image}
                onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                placeholder="https://..."
              />
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.popular}
                    onChange={(e) => setItemForm({ ...itemForm, popular: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Popular</span>
                </label>
              </div>

              {/* Customization groups */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Customization options</h4>
                  <Button type="button" variant="secondary" size="sm" onClick={addCustomizationGroup}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add group
                  </Button>
                </div>
                {itemForm.customizations.length === 0 ? (
                  <p className="text-sm text-gray-500">No customization groups. Add a group (e.g. Add Toppings, Remove Items) and then add options with names and prices.</p>
                ) : (
                  <div className="space-y-4">
                    {itemForm.customizations.map((group, gIdx) => (
                      <div key={group.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Input
                            value={group.name}
                            onChange={(e) => updateCustomizationGroup(gIdx, { name: e.target.value })}
                            placeholder="Group name (e.g. Add Toppings)"
                            className="flex-1"
                          />
                          <select
                            value={group.type}
                            onChange={(e) => updateCustomizationGroup(gIdx, { type: e.target.value as 'add' | 'remove' | 'extra' })}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-32"
                          >
                            <option value="add">Add</option>
                            <option value="remove">Remove</option>
                            <option value="extra">Extra</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Max"
                            value={group.maxSelections ?? ''}
                            onChange={(e) => updateCustomizationGroup(gIdx, { maxSelections: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                            className="w-16"
                            title="Max selections (optional)"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomizationGroup(gIdx)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove group"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-2 ml-2">
                          {group.options.map((opt, oIdx) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <Input
                                value={opt.name}
                                onChange={(e) => updateCustomizationOption(gIdx, oIdx, { name: e.target.value })}
                                placeholder="Option name"
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={opt.price === 0 ? '' : opt.price}
                                onChange={(e) => updateCustomizationOption(gIdx, oIdx, { price: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-24"
                              />
                              <button
                                type="button"
                                onClick={() => removeCustomizationOption(gIdx, oIdx)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <Button type="button" variant="ghost" size="sm" onClick={() => addCustomizationOption(gIdx)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add option
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={() => { setShowItemModal(false); setEditingItem(null); setItemForm(null) }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveItem}>
                  {editingItem ? 'Update item' : 'Add item'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t-2 border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveSection('menu')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              activeSection === 'menu' ? 'text-orange-600' : 'text-gray-600 hover:text-orange-600'
            )}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-xs font-medium">Menu</span>
          </button>
          <button
            onClick={() => setActiveSection('orders')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors relative",
              activeSection === 'orders' ? 'text-orange-600' : 'text-gray-600 hover:text-orange-600'
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs font-medium">Orders</span>
            {orders.length > 0 && (
              <Badge variant="danger" className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5">
                {orders.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveSection('transactions')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors relative",
              activeSection === 'transactions' ? 'text-orange-600' : 'text-gray-600 hover:text-orange-600'
            )}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-medium">Transactions</span>
            {transactions.length > 0 && (
              <Badge variant="info" className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5">
                {transactions.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveSection('items')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              activeSection === 'items' ? 'text-orange-600' : 'text-gray-600 hover:text-orange-600'
            )}
          >
            <ChefHat className="w-5 h-5" />
            <span className="text-xs font-medium">Items</span>
          </button>
          <button
            onClick={() => setActiveSection('more')}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              activeSection === 'more' ? 'text-orange-600' : 'text-gray-600 hover:text-orange-600'
            )}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
