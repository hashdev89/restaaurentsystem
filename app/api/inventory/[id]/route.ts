import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quantity, name, price } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof quantity === 'number') updates.quantity = quantity
    if (typeof name === 'string') updates.name = name
    if (typeof price === 'number') updates.price = price

    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (error: unknown) {
    console.error('Update inventory error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
