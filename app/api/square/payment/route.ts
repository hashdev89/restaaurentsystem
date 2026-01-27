import { NextRequest, NextResponse } from 'next/server'

// Development mode - set to false in production
const DEV_MODE = process.env.NODE_ENV === 'development' || process.env.SQUARE_DEV_MODE === 'true'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, sourceId, orderId, paymentMethod } = body

    // Check if Square access token is configured
    const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN
    if (!squareAccessToken && !DEV_MODE) {
      return NextResponse.json(
        { error: 'Square API not configured. Please set SQUARE_ACCESS_TOKEN in environment variables.' },
        { status: 500 }
      )
    }

    // Development/Test Mode - Mock payment for testing
    if (DEV_MODE || paymentMethod === 'cash') {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return NextResponse.json({
        paymentId: `mock-${Date.now()}-${orderId}`,
        status: 'COMPLETED',
        message: paymentMethod === 'cash' ? 'Cash payment processed' : 'Mock payment processed (DEV MODE)'
      })
    }

    // Production Mode - Real Square API Integration
    // For Square, we need to use their Web Payments SDK on the frontend
    // This endpoint should receive a payment token from the SDK, not a source_id
    
    // If sourceId is 'card', it means we're using a test mode
    // In production, you should use Square's Web Payments SDK to get a payment token
    if (sourceId === 'card' || !sourceId) {
      // For POS systems, Square recommends using their Terminal API or Web Payments SDK
      // For now, we'll return an error with instructions
      return NextResponse.json(
        { 
          error: 'Please use Square Web Payments SDK or Square Terminal API for card payments. For testing, use Cash payment or enable DEV_MODE.',
          requiresSDK: true
        },
        { status: 400 }
      )
    }

    // Square API integration with proper payment token
    const squareResponse = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${squareAccessToken}`,
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify({
        source_id: sourceId,
        amount_money: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'AUD'
        },
        idempotency_key: orderId,
        autocomplete: true // Auto-complete for POS
      })
    })

    const data = await squareResponse.json()

    if (!squareResponse.ok) {
      const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.code || 'Payment failed'
      console.error('Square API Error:', JSON.stringify(data.errors, null, 2))
      
      return NextResponse.json(
        { 
          error: errorMessage,
          errors: data.errors,
          requiresSDK: errorMessage.includes('source_id') || errorMessage.includes('INVALID_REQUEST')
        },
        { status: squareResponse.status }
      )
    }

    return NextResponse.json({
      paymentId: data.payment?.id,
      status: data.payment?.status
    })
  } catch (error) {
    console.error('Square payment error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Payment processing failed',
        details: DEV_MODE ? 'Enable DEV_MODE or use Cash payment for testing' : undefined
      },
      { status: 500 }
    )
  }
}

