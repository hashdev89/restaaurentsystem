# EasyMenu - Next.js

A comprehensive restaurant ordering system built with Next.js, Supabase, and Square API integration. Features include menu browsing, cart management, checkout with table/pickup selection, order tracking, Kitchen Display System (KDS), and Point of Sale (POS) system.

## Features

- ✅ **Menu Browsing** - Browse restaurants and menu items with search and filtering
- ✅ **Cart Management** - Add, remove, and update items in cart
- ✅ **Checkout** - Complete checkout with table/pickup/delivery selection
- ✅ **Order Tracking** - Real-time order status tracking
- ✅ **Kitchen Display System (KDS)** - Kitchen view for managing orders
- ✅ **Point of Sale (POS)** - In-store POS system for walk-in orders
- ✅ **Square Payment Integration** - Secure payment processing
- ✅ **Supabase Database** - PostgreSQL database with real-time capabilities
- ✅ **Australian Restaurants** - Pre-configured with Australian restaurant data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Payment**: Square API
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Square Developer account

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Square API Configuration
SQUARE_ACCESS_TOKEN=your_square_access_token
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your_square_application_id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your_square_location_id
NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
```

3. Set up Supabase database:

Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor to create the necessary tables. **Seed at least one restaurant** (e.g. insert into `restaurants` and note its UUID). Then set in `.env.local`:

```env
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=<that_restaurant_uuid>
```

This links customer/dashboard/POS/KDS to the same restaurant when using the default `rest_1` in the app.

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── orders/         # Order management endpoints
│   │   └── square/         # Square payment endpoints
│   ├── cart/               # Cart page
│   ├── checkout/           # Checkout page
│   ├── confirmation/       # Order confirmation page
│   ├── kitchen/            # Kitchen Display System
│   ├── orders/             # Order tracking page
│   ├── pos/                # Point of Sale system
│   └── restaurant/         # Restaurant pages
├── components/             # React components
│   ├── pages/              # Page components
│   ├── providers/          # Context providers
│   └── ui/                 # UI components
├── lib/                    # Utility libraries
│   ├── supabase.ts         # Supabase client
│   └── square.ts           # Square configuration
└── types/                  # TypeScript type definitions
```

## API Routes

### Orders

- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get orders (with optional filters)
- `PATCH /api/orders/[orderId]` - Update order status

### Square Payments

- `POST /api/square/payment` - Process payment authorization
- `POST /api/square/capture` - Capture authorized payment

## Database Schema

The system uses the following main tables:

- `restaurants` - Restaurant information
- `menu_items` - Menu items for each restaurant
- `orders` - Order records
- `order_items` - Individual items in each order
- `users` - User authentication and roles

See `supabase-schema.sql` for the complete schema.

## Features in Detail

### Menu Browsing

- Search restaurants by name or description
- Filter by location
- Sort by popularity, rating, or name
- View restaurant details and menu items
- Filter menu items by category

### Cart & Checkout

- Add items to cart with quantity management
- Calculate subtotal, GST (10%), and total
- Select order type (Dine In, Pickup, Delivery)
- Enter table number for dine-in orders
- Secure payment processing with Square

### Order Tracking

- View order status timeline
- Track estimated ready time
- Search orders by ID or customer name
- Real-time status updates

### Kitchen Display System (KDS)

- View orders by status (Accepted, Preparing, Ready)
- Update order status
- Display elapsed time for each order
- Table number and order type indicators

### Point of Sale (POS)

- Quick menu item selection
- Cart management
- Order type selection
- Process payments
- Generate receipts

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `SQUARE_ACCESS_TOKEN` | Square API access token |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | Square application ID |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Square location ID |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | `sandbox` or `production` |

## Deployment

1. Build the application:

```bash
npm run build
```

2. Deploy to Vercel, Netlify, or your preferred hosting platform.

3. Set environment variables in your hosting platform's dashboard.

## License

MIT
