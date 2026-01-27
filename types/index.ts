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

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isAvailable: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
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
  createdAt: string;
  updatedAt?: string;
  paymentStatus: PaymentStatus;
  squarePaymentId?: string;
  estimatedReadyTime?: string;
}

