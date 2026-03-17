import { NextRequest, NextResponse } from 'next/server'

const PLAN_FEES: Record<string, number> = {
  starter: 100,
  growth: 60,
  pro: 20,
}

const ONPRINTS_BILLPLZ_EMAIL = process.env.ONPRINTS_BILLPLZ_EMAIL || 'platform@onprints.my'

export async function POST(req: NextRequest) {
  try {
    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    const { supabase } = await import('@/lib/supabase')

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const { shopId, plan, billing } = subscription.metadata

      if (!shopId || !plan) {
        console.warn('Stripe webhook: Missing metadata on subscription', subscription.id)
        return NextResponse.json({ received: true })
      }

      const now = new Date()
      const expiresAt = new Date(now)
      if (billing === 'annually') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      const newFixedCut = PLAN_FEES[plan] ?? PLAN_FEES.starter

      // Update shop plan
      await supabase
        .from('shops')
        .update({
          plan,
          plan_billing: billing || 'monthly',
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
          platform_fee_sen: newFixedCut,
          stripe_subscription_id: subscription.id,
        })
        .eq('id', shopId)

      // Recreate Billplz collection with new fixed_cut (for shop customer payments)
      const { data: shop } = await supabase
        .from('shops')
        .select('billplz_collection_id, bank_account_name')
        .eq('id', shopId)
        .single()

      if (shop?.billplz_collection_id) {
        try {
          const { createCollection } = await import('@/lib/billplz')
          const collection = await createCollection(
            `${shop.bank_account_name || shopId} - ${plan}`,
            {
              email: ONPRINTS_BILLPLZ_EMAIL,
              fixed_cut: newFixedCut,
              variable_cut: 0,
              split_header: true,
            }
          )
          await supabase
            .from('shops')
            .update({ billplz_collection_id: collection.id })
            .eq('id', shopId)
        } catch (collErr) {
          console.error('Failed to recreate Billplz collection:', collErr)
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const { shopId } = subscription.metadata

      if (shopId) {
        await supabase
          .from('shops')
          .update({ stripe_subscription_id: null })
          .eq('id', shopId)
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      console.warn('Stripe invoice payment failed:', invoice.id, 'customer:', invoice.customer)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    // Always return 200 to avoid Stripe retries on our errors
    return NextResponse.json({ received: true })
  }
}
