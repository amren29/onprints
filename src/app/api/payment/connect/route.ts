import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createCollection } from '@/lib/billplz'

const PLAN_FEES: Record<string, number> = {
  starter: 100,
  growth: 60,
  pro: 20,
}

const SAASPRINT_BILLPLZ_EMAIL = process.env.SAASPRINT_BILLPLZ_EMAIL || 'platform@saasprint.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopId, bankName, bankAccountNo, bankAccountName, billplzEmail } = body

    if (!shopId || !bankName || !bankAccountNo || !bankAccountName || !billplzEmail) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Get shop's current plan to determine fixed_cut
    const { data: shop, error: fetchError } = await supabase
      .from('shops')
      .select('plan')
      .eq('id', shopId)
      .single()

    if (fetchError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const plan = shop.plan || 'starter'
    const fixedCut = PLAN_FEES[plan] ?? PLAN_FEES.starter

    // Create Billplz collection with split payment
    const collection = await createCollection(
      `${bankAccountName} - ${shopId}`,
      {
        email: SAASPRINT_BILLPLZ_EMAIL,
        fixed_cut: fixedCut,
        variable_cut: 0,
        split_header: true,
      }
    )

    // Save bank info and collection ID to Supabase
    const { error: updateError } = await supabase
      .from('shops')
      .update({
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_account_name: bankAccountName,
        billplz_email: billplzEmail,
        billplz_collection_id: collection.id,
        payment_enabled: true,
        bank_verified: true,
        platform_fee_sen: fixedCut,
      })
      .eq('id', shopId)

    if (updateError) {
      throw new Error(`Failed to save bank info: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      collectionId: collection.id,
      plan,
      platformFeeSen: fixedCut,
    })
  } catch (err) {
    console.error('Payment connect error:', err)
    const message = err instanceof Error ? err.message : 'Failed to connect bank account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
