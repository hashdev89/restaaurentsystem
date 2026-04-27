import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type MenuItemRow = {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  price: number
  category: string
  image: string | null
  is_available: boolean
  customizations?: unknown
  sizes?: unknown
}

function toMenuItem(row: MenuItemRow) {
  const customizations = row.customizations != null && Array.isArray(row.customizations)
    ? (row.customizations as { id: string; name: string; type: string; options: { id: string; name: string; price: number }[] }[])
    : undefined
  const sizes = row.sizes != null && Array.isArray(row.sizes)
    ? (row.sizes as { name: string; price: number }[]).filter((s) => s && typeof s.name === 'string')
    : undefined
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: row.category,
    image: row.image ?? '',
    isAvailable: row.is_available,
    ...(customizations && customizations.length > 0 ? { customizations } : {}),
    ...(sizes && sizes.length > 0 ? { sizes } : {}),
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
    if (body.customizations !== undefined) updates.customizations = Array.isArray(body.customizations) ? body.customizations : null
    if (body.sizes !== undefined) updates.sizes = Array.isArray(body.sizes) ? body.sizes : null
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
    return NextResponse.json({ item: toMenuItem(data as MenuItemRow) })
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
    if (!error) return NextResponse.json({ ok: true, deleted: true })

    // If historical order_items reference this menu item, hard delete is blocked by FK.
    // Fall back to "archive" so it disappears from customer menu but history remains intact.
    const isForeignKeyViolation =
      (typeof error.code === 'string' && error.code === '23503') ||
      (typeof error.message === 'string' && error.message.includes('violates foreign key constraint'))

    if (isForeignKeyViolation) {
      const { error: archiveError } = await supabase
        .from('menu_items')
        .update({ is_available: false })
        .eq('id', id)

      if (archiveError) throw archiveError

      return NextResponse.json({
        ok: true,
        deleted: false,
        archived: true,
        message: 'Item is used in past orders, so it was archived instead of deleted.',
      })
    }

    throw error
  } catch (err: unknown) {
    console.error('DELETE menu-items error:', err)
    const message = err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error ? err.message : 'Failed to delete menu item'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
