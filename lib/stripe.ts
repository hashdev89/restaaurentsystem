import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Returns the Stripe client. Only initializes (and validates STRIPE_SECRET_KEY) when first used at runtime.
 * This allows the Next.js build to succeed even when STRIPE_SECRET_KEY is not set (e.g. on Vercel before env vars are added).
 */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Add it to .env or Vercel Environment Variables (use sk_test_... for testing).')
  }
  stripeInstance = new Stripe(secretKey, { typescript: true })
  return stripeInstance
}
