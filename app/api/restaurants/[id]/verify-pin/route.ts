import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'

/** POST body: { pin: string, type: 'pos' | 'kds' }. Returns { valid: boolean }. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
    const type = body.type === 'pos' || body.type === 'kds' ? body.type : null
    if (!pin || !type) {
      return NextResponse.json({ error: 'pin and type (pos|kds) are required' }, { status: 400 })
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ valid: false })
    }
    const col = type === 'pos' ? 'pos_pin_hash' : 'kds_pin_hash'
    const { data, error } = await supabase
      .from('restaurants')
      .select(col)
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ valid: false })
    const hash = (data as { pos_pin_hash?: string | null; kds_pin_hash?: string | null })[col === 'pos_pin_hash' ? 'pos_pin_hash' : 'kds_pin_hash']
    if (!hash || typeof hash !== 'string') return NextResponse.json({ valid: false })
    const valid = verifyPassword(pin, hash)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
