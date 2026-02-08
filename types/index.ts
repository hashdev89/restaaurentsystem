export interface User {
  id: string;
  email: string;
  role: 'customer' | 'restaurant' | 'admin';
  name?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  image: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  location: string;
  totalSeats?: number;
  availableSeats?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  priceRange?: 'budget' | 'moderate' | 'expensive' | 'premium';
  cuisineTypes?: string[];
  /** When false, POS for this restaurant is disabled (System Control). */
  posEnabled?: boolean;
  /** When false, KDS for this restaurant is disabled (System Control). */
  kdsEnabled?: boolean;
  /** When true, POS requires 4-digit PIN (set in Restaurant Dashboard). */
  posPinRequired?: boolean;
  /** When true, KDS requires 4-digit PIN (set in Restaurant Dashboard). */
  kdsPinRequired?: boolean;
  /** Sunday surcharge (e.g. 5–10%). */
  sundaySurchargeEnabled?: boolean;
  sundaySurchargePercent?: number;
  /** Public holiday surcharge (e.g. 10–15%). */
  publicHolidaySurchargeEnabled?: boolean;
  publicHolidaySurchargePercent?: number;
  /** Public holiday dates (YYYY-MM-DD) for automatic detection. */
  publicHolidayDates?: string[];
  /** Override for today: 'auto' | 'sunday' | 'public_holiday' | 'none'. */
  surchargeManualOverride?: 'auto' | 'sunday' | 'public_holiday' | 'none';
}

export type SeatStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number; // Number of seats
  status: SeatStatus;
  location?: string; // e.g., "Window", "Indoor", "Outdoor"
}

export interface SeatBooking {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string; // ISO date string
  bookingTime: string; // Time slot (e.g., "18:00")
  numberOfGuests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Single option within a customization group (e.g. "No onion" or "Extra cheese" with price). */
export interface MenuItemCustomizationOption {
  id: string;
  name: string;
  price: number;
}

/** Group of options for an item: Remove options (no charge) or Extras (optional price). */
export interface MenuItemCustomizationGroup {
  id: string;
  name: string;
  type: 'remove' | 'extra';
  options: MenuItemCustomizationOption[];
}

/** Size option with its own price (e.g. Small A$10, Medium A$12, Large A$14). */
export interface MenuItemSize {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isAvailable: boolean;
  /** Remove options and Extras defined in Restaurant Dashboard; POS uses these when adding item to order. */
  customizations?: MenuItemCustomizationGroup[];
  /** Optional sizes (e.g. Small, Medium, Large) each with a price. When set, customer chooses a size; price is the chosen size's price. */
  sizes?: MenuItemSize[];
}

/** Customer-selected extra (id + name + price for cart/order). */
export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
}

/** Per-item options for online orders: removes, extras, spice level, custom request. */
export interface CartItemOptions {
  selectedRemoves?: string[];
  selectedExtras?: SelectedExtra[];
  spiceLevel?: string;
  specialRequest?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  /** When item has sizes, the chosen size name (e.g. "Large") for display. */
  selectedSize?: string;
  /** Customer-selected remove option names (e.g. "No onion"). */
  selectedRemoves?: string[];
  /** Customer-selected extras with price (e.g. "Extra cheese" + A$2). */
  selectedExtras?: SelectedExtra[];
  /** Spice level: e.g. None, Mild, Medium, Hot, Extra Hot. */
  spiceLevel?: string;
  /** Free-text special request for this line. */
  specialRequest?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  /** Available customize options for this item (from menu_items); shown on order views. */
  customizations?: MenuItemCustomizationGroup[];
  /** Customer-selected options when ordering online. */
  selectedRemoves?: string[];
  selectedExtras?: { name: string; price: number }[];
  spiceLevel?: string;
  specialRequest?: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'rejected';
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed';
export type OrderType = 'dine-in' | 'pickup' | 'delivery';
export type TableNumber = string | null;

export interface Order {
  id: string;
  restaurantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  orderType: OrderType;
  tableNumber?: TableNumber;
  specialRequests?: string;
  createdAt: string;
  updatedAt?: string;
  paymentStatus: PaymentStatus;
  squarePaymentId?: string;
  estimatedReadyTime?: string;
}

