import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getSessionCookieName } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value
    if (!token) {
      return NextResponse.json({ user: null, restaurantId: null }, { status: 200 })
    }

    const session = verifySession(token)
    if (!session) {
      return NextResponse.json({ user: null, restaurantId: null }, { status: 200 })
    }

    return NextResponse.json({
      user: { id: session.userId, email: session.email },
      restaurantId: session.restaurantId,
    })
  } catch {
    return NextResponse.json({ user: null, restaurantId: null }, { status: 200 })
  }
}
