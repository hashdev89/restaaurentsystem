import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function toMenuItem(row: { id: string; restaurant_id: string; name: string; description: string | null; price: number; category: string; image: string | null; is_available: boolean }) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: row.category,
    image: row.image ?? '',
    isAvailable: row.is_available,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.description !== undefined) updates.description = body.description == null ? null : String(body.description).trim()
    if (body.price !== undefined) updates.price = Number(body.price)
    if (body.category !== undefined) updates.category = String(body.category).trim() || 'Other'
    if (body.image !== undefined) updates.image = body.image == null ? null : String(body.image).trim()
    if (body.isAvailable !== undefined) updates.is_available = body.isAvailable !== false
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ item: toMenuItem(data) })
  } catch (err: unknown) {
    console.error('PATCH menu-items error:', err)
    const message = err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error ? err.message : 'Failed to update menu item'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('DELETE menu-items error:', err)
    const message = err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error ? err.message : 'Failed to delete menu item'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
