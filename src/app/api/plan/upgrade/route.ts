import { NextRequest, NextResponse } from 'next/server'

const PLAN_FEES: Record<string, number> = {
  starter: 100,
  growth: 60,
  pro: 20,
}

const SAASPRINT_BILLPLZ_EMAIL = process.env.SAASPRINT_BILLPLZ_EMAIL || 'platform@saasprint.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopId, newPlan } = body

    if (!shopId || !newPlan) {
      return NextResponse.json({ error: 'Missing shopId or newPlan' }, { status: 400 })
    }

    if (!PLAN_FEES[newPlan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { supabase } = await import('@/lib/supabase')

    const newFixedCut = PLAN_FEES[newPlan]

    // Get current shop data
    const { data: shop, error: fetchError } = await supabase
      .from('shops')
      .select('billplz_collection_id, bank_account_name, plan, stripe_subscription_id')
      .eq('id', shopId)
      .single()

    if (fetchError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (shop.plan === newPlan) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 })
    }

    // If shop has a Stripe subscription, update it via Stripe
    if (shop.stripe_subscription_id) {
      const { getStripe, getPriceId } = await import('@/lib/stripe')
      const stripe = getStripe()

      const subscription = await stripe.subscriptions.retrieve(shop.stripe_subscription_id)
      const currentItem = subscription.items.data[0]

      if (!currentItem) {
        return NextResponse.json({ error: 'No subscription item found' }, { status: 500 })
      }

      // Determine billing from current subscription metadata
      const billing = subscription.metadata.billing || 'monthly'
      const newPriceId = getPriceId(newPlan, billing)

      // Update Stripe subscription with new price and metadata
      await stripe.subscriptions.update(shop.stripe_subscription_id, {
        items: [{ id: currentItem.id, price: newPriceId }],
        metadata: { shopId, plan: newPlan, billing },
        proration_behavior: 'create_prorations',
      })

      // The webhook will handle updating the shop in the DB
      return NextResponse.json({
        success: true,
        plan: newPlan,
        platformFeeSen: newFixedCut,
      })
    }

    // Fallback: no Stripe subscription — update Billplz collection directly
    const { createCollection } = await import('@/lib/billplz')

    const collection = await createCollection(
      `${shop.bank_account_name || shopId} - ${newPlan}`,
      {
        email: SAASPRINT_BILLPLZ_EMAIL,
        fixed_cut: newFixedCut,
        variable_cut: 0,
        split_header: true,
      }
    )

    // Update shop with new plan and collection
    const { error: updateError } = await supabase
      .from('shops')
      .update({
        plan: newPlan,
        platform_fee_sen: newFixedCut,
        billplz_collection_id: collection.id,
      })
      .eq('id', shopId)

    if (updateError) {
      throw new Error(`Failed to update plan: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
      platformFeeSen: newFixedCut,
      collectionId: collection.id,
    })
  } catch (err) {
    console.error('Plan upgrade error:', err)
    const message = err instanceof Error ? err.message : 'Failed to upgrade plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
