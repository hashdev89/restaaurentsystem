import { NextRequest, NextResponse } from 'next/server'

export type SupportMessageType = 'issue' | 'technical'

export interface SupportMessage {
  id: string
  source: string
  type: SupportMessageType
  message: string
  createdAt: string
  status: 'new' | 'read' | 'resolved'
}

const store: SupportMessage[] = []

export async function GET() {
  const sorted = [...store].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return NextResponse.json({ messages: sorted })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, type = 'issue', source = 'pos' } = body
    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    const item: SupportMessage = {
      id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      source: String(source),
      type: type === 'technical' ? 'technical' : 'issue',
      message: text,
      createdAt: new Date().toISOString(),
      status: 'new',
    }
    store.push(item)
    return NextResponse.json({ message: item })
  } catch (e) {
    console.error('POST support error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to submit' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const idx = store.findIndex((m) => m.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (status === 'read' || status === 'resolved') store[idx].status = status
    return NextResponse.json({ message: store[idx] })
  } catch (e) {
    console.error('PATCH support error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update' },
      { status: 500 }
    )
  }
}
