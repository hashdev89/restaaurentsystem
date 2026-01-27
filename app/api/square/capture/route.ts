import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId } = body

    // Capture the authorized payment
    const squareResponse = await fetch(
      `https://connect.squareup.com/v2/payments/${paymentId}/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify({})
      }
    )

    const data = await squareResponse.json()

    if (!squareResponse.ok) {
      return NextResponse.json(
        { error: data.errors?.[0]?.detail || 'Capture failed' },
        { status: squareResponse.status }
      )
    }

    return NextResponse.json({
      paymentId: data.payment?.id,
      status: data.payment?.status
    })
  } catch (error) {
    console.error('Square capture error:', error)
    return NextResponse.json(
      { error: 'Payment capture failed' },
      { status: 500 }
    )
  }
}

