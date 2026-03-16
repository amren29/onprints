import { NextRequest, NextResponse } from 'next/server'

const MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopId } = body

    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })
    }

    const baseUrl = process.env.BASE_URL || req.nextUrl.origin

    // Mock mode
    if (MOCK) {
      return NextResponse.json({ url: `${baseUrl}/settings?section=billing` })
    }

    const { supabase } = await import('@/lib/supabase')
    const { getStripe } = await import('@/lib/stripe')

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('stripe_customer_id')
      .eq('id', shopId)
      .single()

    if (shopError || !shop?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found for this shop' }, { status: 404 })
    }

    const stripe = getStripe()
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: shop.stripe_customer_id,
      return_url: `${baseUrl}/settings?section=billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    const message = err instanceof Error ? err.message : 'Failed to open billing portal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
