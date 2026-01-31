import { NextRequest, NextResponse } from 'next/server'
import { supabase, getServiceRoleClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

function toUser(row: { id: string; email: string; name: string | null; role: string; restaurant_id: string | null; created_at: string }) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    role: row.role as 'customer' | 'restaurant' | 'admin',
    restaurantId: row.restaurant_id ?? undefined,
    createdAt: row.created_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (restaurantId?.trim()) {
      query = query.eq('restaurant_id', restaurantId.trim())
    }

    const { data, error } = await query

    if (error) throw error

    const list = (data || []).map(toUser)
    return NextResponse.json({ users: list })
  } catch (err: unknown) {
    console.error('GET users error:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch users'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role, restaurantId, password } = body

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const insert: Record<string, unknown> = {
      email: String(email).trim().toLowerCase(),
      name: name ? String(name).trim() : null,
      role: role && ['customer', 'restaurant', 'admin'].includes(role) ? role : 'customer',
    }
    if (restaurantId) insert.restaurant_id = restaurantId
    if (password && typeof password === 'string' && password.length >= 6) {
      insert.password_hash = hashPassword(password)
    }

    const client = getServiceRoleClient() ?? supabase
    const { data, error } = await client
      .from('users')
      .insert(insert)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ user: toUser(data) }, { status: 201 })
  } catch (err: unknown) {
    console.error('POST users error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
