import { NextRequest, NextResponse } from 'next/server'

const MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL

const PLAN_PRICES: Record<string, Record<string, number>> = {
  starter: { monthly: 9900, annually: 99000 },
  growth: { monthly: 24900, annually: 249000 },
  pro: { monthly: 49900, annually: 499000 },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopId, plan, billing } = body

    if (!shopId || !plan || !billing) {
      return NextResponse.json({ error: 'Missing shopId, plan, or billing' }, { status: 400 })
    }

    if (!PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!['monthly', 'annually'].includes(billing)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    const baseUrl = process.env.BASE_URL || req.nextUrl.origin

    // Mock mode — skip Stripe & Supabase, simulate redirect back
    if (MOCK) {
      const fakeSessionId = `mock-${plan}-${billing}-${Date.now()}`
      const redirectUrl = `${baseUrl}/settings?section=billing&stripe_session_id=${fakeSessionId}`
      return NextResponse.json({ url: redirectUrl })
    }

    const { getStripe, getPriceId } = await import('@/lib/stripe')
    const { supabase } = await import('@/lib/supabase')
    const stripe = getStripe()

    // Get shop info
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('billplz_email, bank_account_name, name, stripe_customer_id, stripe_subscription_id')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    let customerId = shop.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: shop.billplz_email || undefined,
        name: shop.bank_account_name || shop.name || shopId,
        metadata: { shopId },
      })
      customerId = customer.id

      await supabase
        .from('shops')
        .update({ stripe_customer_id: customerId })
        .eq('id', shopId)
    }

    // If shop already has an active subscription, redirect to Customer Portal instead
    if (shop.stripe_subscription_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/settings?section=billing`,
      })
      return NextResponse.json({ url: portalSession.url })
    }

    // Create Stripe Checkout Session
    const priceId = getPriceId(plan, billing)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { shopId, plan, billing },
      },
      success_url: `${baseUrl}/settings?section=billing&stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?section=billing`,
      currency: 'myr',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Plan subscribe error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
