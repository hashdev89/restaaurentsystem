import { NextRequest, NextResponse } from 'next/server'
import { supabase, getServiceRoleClient } from '@/lib/supabase'
import { verifyPassword, signSession, getSessionCookieName, getSessionMaxAge } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const client = getServiceRoleClient() ?? supabase
    // Look up by email first so we can return a specific error
    const { data: userRow, error } = await client
      .from('users')
      .select('id, email, name, role, restaurant_id, password_hash')
      .eq('email', email)
      .maybeSingle()

    if (error) throw error
    if (!userRow) {
      return NextResponse.json(
        {
          error:
            'No account found for this email. Create a restaurant login in System Dashboard → Restaurants → Add or Edit restaurant → set "Login email" and "Login password" (min 8 characters), then Save.',
        },
        { status: 401 }
      )
    }
    if (userRow.role !== 'restaurant') {
      return NextResponse.json(
        {
          error:
            'This email is not set up as a restaurant account. In System Dashboard → Restaurants → Edit a restaurant → set "Login email" and "Login password" and Save.',
        },
        { status: 401 }
      )
    }
    if (!userRow.restaurant_id) {
      return NextResponse.json(
        {
          error:
            'This restaurant account is not linked to a restaurant. In System Dashboard → Restaurants → Edit the restaurant → set "Login email" for this account and Save.',
        },
        { status: 401 }
      )
    }

    const passwordHash = (userRow as { password_hash?: string | null }).password_hash
    if (!passwordHash || typeof passwordHash !== 'string') {
      return NextResponse.json(
        { error: 'No password set for this account. In System Dashboard → Restaurants → Edit this restaurant → set "Login password" and Save.' },
        { status: 401 }
      )
    }
    if (!verifyPassword(password, passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    const token = signSession({
      userId: userRow.id,
      restaurantId: userRow.restaurant_id,
      email: userRow.email,
    })

    const res = NextResponse.json({
      user: { id: userRow.id, email: userRow.email, name: userRow.name, role: userRow.role },
      restaurantId: userRow.restaurant_id,
    })

    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionMaxAge(),
      path: '/',
    })

    return res
  } catch (err: unknown) {
    console.error('Login error:', err)
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Login failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
