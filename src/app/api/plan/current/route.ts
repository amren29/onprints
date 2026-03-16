import { NextRequest, NextResponse } from 'next/server'

const MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL

const PLAN_FEES: Record<string, number> = {
  starter: 100,
  growth: 60,
  pro: 20,
}

export async function GET(req: NextRequest) {
  try {
    const shopId = req.nextUrl.searchParams.get('shopId')

    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })
    }

    // Mock mode — no Supabase
    if (MOCK) {
      return NextResponse.json({
        plan: null,
        billing: null,
        planStartedAt: null,
        planExpiresAt: null,
        platformFeeSen: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      })
    }

    const { supabase } = await import('@/lib/supabase')

    const { data: shop, error } = await supabase
      .from('shops')
      .select('plan, plan_billing, plan_started_at, plan_expires_at, platform_fee_sen, stripe_subscription_id, stripe_customer_id')
      .eq('id', shopId)
      .single()

    if (error || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Optionally check Stripe subscription status if active
    let subscriptionStatus: string | null = null
    if (shop.stripe_subscription_id) {
      try {
        const { getStripe } = await import('@/lib/stripe')
        const stripe = getStripe()
        const sub = await stripe.subscriptions.retrieve(shop.stripe_subscription_id)
        subscriptionStatus = sub.status // active, past_due, canceled, etc.
      } catch {
        // Non-critical — proceed without status
      }
    }

    return NextResponse.json({
      plan: shop.plan || null,
      billing: shop.plan_billing || null,
      planStartedAt: shop.plan_started_at || null,
      planExpiresAt: shop.plan_expires_at || null,
      platformFeeSen: shop.platform_fee_sen ?? PLAN_FEES[shop.plan] ?? null,
      stripeSubscriptionId: shop.stripe_subscription_id || null,
      stripeCustomerId: shop.stripe_customer_id || null,
      subscriptionStatus,
    })
  } catch (err) {
    console.error('Plan current error:', err)
    const message = err instanceof Error ? err.message : 'Failed to get current plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
