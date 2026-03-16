import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' })
  }
  return _stripe
}

/** Map plan + billing cycle to a Stripe Price ID from env vars */
export function getPriceId(plan: string, billing: string): string {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()}`
  const priceId = process.env[key]
  if (!priceId) throw new Error(`Missing env var: ${key}`)
  return priceId
}

/** Platform fee per transaction in sen, keyed by plan */
export const PLAN_FEES: Record<string, number> = {
  starter: 100, // RM 1.00
  growth: 60,   // RM 0.60
  pro: 20,      // RM 0.20
}
