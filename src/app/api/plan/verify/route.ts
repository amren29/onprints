import { NextRequest, NextResponse } from 'next/server'

const MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL

const PLAN_FEES: Record<string, number> = {
  starter: 100,
  growth: 60,
  pro: 20,
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('stripe_session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing stripe_session_id' }, { status: 400 })
    }

    // Mock mode — parse plan/billing from the mock session ID
    if (MOCK) {
      // Mock session ID format: mock-{plan}-{billing}-{timestamp}
      const mockMatch = sessionId.match(/^mock-(\w+)-(\w+)-/)
      if (!mockMatch) {
        return NextResponse.json({ verified: false, reason: 'Invalid mock session' })
      }

      const [, plan, billing] = mockMatch
      const now = new Date()
      const expiresAt = new Date(now)
      if (billing === 'annually') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      return NextResponse.json({
        verified: true,
        plan,
        billing,
        planStartedAt: now.toISOString(),
        planExpiresAt: expiresAt.toISOString(),
      })
    }

    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()

    // Retrieve Checkout Session with subscription expanded
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ verified: false, reason: 'Payment not completed' })
    }

    const subscription = session.subscription as import('stripe').Stripe.Subscription | null
    if (!subscription) {
      return NextResponse.json({ verified: false, reason: 'No subscription found' })
    }

    const plan = subscription.metadata.plan
    const billing = subscription.metadata.billing

    if (!plan || !billing) {
      return NextResponse.json({ verified: false, reason: 'Missing subscription metadata' })
    }

    const now = new Date()
    const expiresAt = new Date(now)
    if (billing === 'annually') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    return NextResponse.json({
      verified: true,
      plan,
      billing,
      planStartedAt: now.toISOString(),
      planExpiresAt: expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('Plan verify error:', err)
    const message = err instanceof Error ? err.message : 'Failed to verify payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
