import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

/** PATCH body: { posPin?: string, kdsPin?: string }. Each must be exactly 4 digits. Hashes and stores. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const posPin = typeof body.posPin === 'string' ? body.posPin.trim() : ''
    const kdsPin = typeof body.kdsPin === 'string' ? body.kdsPin.trim() : ''
    const updates: Record<string, string | null> = {}
    if (posPin !== '') {
      if (!/^\d{4}$/.test(posPin)) {
        return NextResponse.json({ error: 'POS PIN must be exactly 4 digits' }, { status: 400 })
      }
      updates.pos_pin_hash = hashPassword(posPin)
    }
    if (kdsPin !== '') {
      if (!/^\d{4}$/.test(kdsPin)) {
        return NextResponse.json({ error: 'KDS PIN must be exactly 4 digits' }, { status: 400 })
      }
      updates.kds_pin_hash = hashPassword(kdsPin)
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Provide posPin and/or kdsPin (4 digits each)' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select('id')
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('PATCH access-pins error:', err)
    return NextResponse.json({ error: 'Failed to save PINs' }, { status: 500 })
  }
}
