import { NextRequest, NextResponse } from 'next/server'
import { supabase, getServiceRoleClient } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, password } = body

    const updates: Record<string, unknown> = {}
    if (typeof name === 'string') updates.name = name.trim() || null
    if (password && typeof password === 'string' && password.length >= 6) {
      updates.password_hash = hashPassword(password)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const client = getServiceRoleClient() ?? supabase
    const { data, error } = await client
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      user: {
        id: data.id,
        email: data.email,
        name: data.name ?? undefined,
        role: data.role,
        restaurantId: data.restaurant_id ?? undefined,
      },
    })
  } catch (err: unknown) {
    console.error('PATCH user error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
