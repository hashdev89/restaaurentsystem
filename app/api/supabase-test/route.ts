import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** GET /api/supabase-test - Verify Supabase connection and tables exist */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local' },
        { status: 500 }
      )
    }

    // Test 1: Query restaurants (table exists and readable)
    const { data: restaurants, error: errRest } = await supabase
      .from('restaurants')
      .select('id, name')
      .limit(1)

    if (errRest) {
      return NextResponse.json(
        { ok: false, error: 'Supabase query failed', details: errRest.message },
        { status: 500 }
      )
    }

    // Test 2: Query orders (table exists)
    const { error: errOrders } = await supabase.from('orders').select('id').limit(1)
    if (errOrders) {
      return NextResponse.json(
        { ok: false, error: 'Orders table check failed', details: errOrders.message },
        { status: 500 }
      )
    }

    // Test 3: Query tables
    const { error: errTables } = await supabase.from('tables').select('id').limit(1)
    if (errTables) {
      return NextResponse.json(
        { ok: false, error: 'Tables table check failed', details: errTables.message },
        { status: 500 }
      )
    }

    // Test 4: Query inventory (from migrations)
    const { error: errInventory } = await supabase.from('inventory').select('id').limit(1)
    if (errInventory) {
      return NextResponse.json(
        { ok: false, error: 'Inventory table check failed (run supabase-migrations.sql)', details: errInventory.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Supabase connection successful',
      tables: ['restaurants', 'orders', 'tables', 'inventory'],
      restaurantCount: Array.isArray(restaurants) ? restaurants.length : 0
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
