import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json()
    const { status, estimatedReadyTime } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
    }

    if (estimatedReadyTime) {
      updateData.estimated_ready_time = estimatedReadyTime
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
  } catch (error: any) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    )
  }
}

