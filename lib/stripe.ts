import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set. Add it to .env (use sk_test_... for testing).')
}

export const stripe = new Stripe(secretKey, { typescript: true })
