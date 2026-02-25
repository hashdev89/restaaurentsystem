import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json()
    const { status, estimatedReadyTime, receiptNo } = body

    const updateData: { updated_at: string; status?: string; estimated_ready_time?: string; receipt_no?: string } = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
    }

    if (estimatedReadyTime) {
      updateData.estimated_ready_time = estimatedReadyTime
    }
    if (typeof receiptNo === 'string' && receiptNo.trim()) {
      updateData.receipt_no = receiptNo.trim()
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.orderId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ order: data })
  } catch (error: unknown) {
    console.error('Update order error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

