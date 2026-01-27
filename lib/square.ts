// Square API configuration
export const SQUARE_CONFIG = {
  applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '',
  locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '',
  environment: process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
}

// Square API endpoints
export const SQUARE_API_BASE = process.env.NEXT_PUBLIC_SQUARE_API_BASE || 'https://connect.squareup.com'

