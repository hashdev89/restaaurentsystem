# Payment Setup Guide

## Overview

The POS system supports multiple payment methods:
- **Cash Payments** - Works immediately, no configuration needed
- **Card Payments (Square)** - Requires Square API setup
- **Development Mode** - Mock payments for testing

## Quick Fix for Authorization Error

If you're getting "This request could not be authorized", you have 3 options:

### Option 1: Use Cash Payment (Recommended for Testing)
1. In the POS system, select **"Cash"** as payment method
2. Cash payments work immediately without any API configuration
3. Perfect for testing the POS system functionality

### Option 2: Enable Development Mode
Add this to your `.env.local` file:
```env
SQUARE_DEV_MODE=true
```

This enables mock payments for testing without Square API credentials.

### Option 3: Configure Square API Properly

## Square API Configuration

### For Sandbox/Testing:

1. **Get Square Sandbox Credentials:**
   - Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Create a new application
   - Get your **Sandbox Access Token**
   - Get your **Application ID**
   - Get your **Location ID** (from Sandbox Test Locations)

2. **Add to `.env.local`:**
```env
# Square Sandbox Configuration
SQUARE_ACCESS_TOKEN=EAAAl1f3YEhr3tMQbPuGGbV-1ndqDhxhiycnhpBGyVctkezk5YqnFv7XbRXlHfgE
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-DUu6GDAHASyjTuXe0D2hIA
NEXT_PUBLIC_SQUARE_LOCATION_ID=your_location_id_here
NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
```

### Important Notes for Square:

⚠️ **Card payments require Square Web Payments SDK integration**

The current implementation works for:
- ✅ **Cash payments** - Works immediately
- ✅ **Development mode** - Mock payments for testing
- ❌ **Card payments** - Requires Square Web Payments SDK on frontend

For production card payments, you need to:
1. Integrate Square Web Payments SDK in the frontend
2. Use the SDK to get a payment token
3. Send the token to the backend API

## Current Payment Flow

### Cash Payment:
1. Select "Cash" in payment modal
2. Payment is processed immediately (no API call needed)
3. Receipt is printed automatically

### Card Payment (Current):
1. Select "Card" in payment modal
2. If Square API is not configured → Uses development mode
3. If Square API is configured but no SDK → Shows helpful error message
4. For production, requires Square Web Payments SDK integration

### Development Mode:
- Automatically enabled when `NODE_ENV=development`
- Or manually enable with `SQUARE_DEV_MODE=true`
- Processes mock payments instantly
- Perfect for testing without API credentials

## Error Messages Explained

### "This request could not be authorized"
- **Cause**: Square API credentials missing or invalid
- **Solution**: Use Cash payment, enable DEV_MODE, or configure Square API properly

### "Please use Square Web Payments SDK"
- **Cause**: Card payment requires frontend SDK integration
- **Solution**: Use Cash payment for now, or integrate Square Web Payments SDK

## Testing the System

### Recommended Testing Flow:
1. **Start with Cash payments** - No setup required
2. **Test all POS features** - Menu, cart, receipts, etc.
3. **Enable DEV_MODE** - Test payment flow without real API
4. **Configure Square** - When ready for production card payments

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SQUARE_ACCESS_TOKEN` | No* | Square API access token |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | No* | Square application ID |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | No* | Square location ID |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | No | `sandbox` or `production` |
| `SQUARE_DEV_MODE` | No | Set to `true` for mock payments |

*Required only for real Square card payments. Cash payments work without these.

## Next Steps for Production Card Payments

1. Install Square Web Payments SDK:
```bash
npm install @square/web-sdk
```

2. Integrate SDK in payment modal
3. Get payment token from SDK
4. Send token to `/api/square/payment` endpoint

For now, **Cash payments work perfectly** for testing and production use!

