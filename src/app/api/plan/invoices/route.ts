import { NextRequest, NextResponse } from 'next/server'

const MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(req: NextRequest) {
  try {
    const shopId = req.nextUrl.searchParams.get('shopId')

    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })
    }

    // Mock mode — return sample invoices
    if (MOCK) {
      return NextResponse.json({
        invoices: [
          {
            id: 'in_mock001',
            amount_paid: 24900,
            status: 'paid',
            created: Math.floor(new Date('2026-03-10T08:00:00Z').getTime() / 1000),
            hosted_invoice_url: '#',
            invoice_pdf: '#',
            lines: { data: [{ description: 'OnPrints Growth Plan — Monthly subscription' }] },
          },
          {
            id: 'in_mock002',
            amount_paid: 24900,
            status: 'paid',
            created: Math.floor(new Date('2026-02-10T08:00:00Z').getTime() / 1000),
            hosted_invoice_url: '#',
            invoice_pdf: '#',
            lines: { data: [{ description: 'OnPrints Growth Plan — Monthly subscription' }] },
          },
          {
            id: 'in_mock003',
            amount_paid: 9900,
            status: 'paid',
            created: Math.floor(new Date('2026-01-10T08:00:00Z').getTime() / 1000),
            hosted_invoice_url: '#',
            invoice_pdf: '#',
            lines: { data: [{ description: 'OnPrints Starter Plan — Monthly subscription' }] },
          },
        ],
      })
    }

    const { supabase } = await import('@/lib/supabase')
    const { getStripe } = await import('@/lib/stripe')

    // Get shop's Stripe customer ID
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('stripe_customer_id')
      .eq('id', shopId)
      .single()

    if (shopError || !shop?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
    }

    const stripe = getStripe()
    const invoices = await stripe.invoices.list({
      customer: shop.stripe_customer_id,
      limit: 20,
    })

    return NextResponse.json({ invoices: invoices.data })
  } catch (err) {
    console.error('Plan invoices error:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch invoices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
