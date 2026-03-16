import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const shopId = req.nextUrl.searchParams.get('shopId')
    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .select('bank_name, bank_account_name, bank_account_no, billplz_email, billplz_collection_id, payment_enabled, bank_verified, plan, platform_fee_sen')
      .eq('id', shopId)
      .single()

    if (error || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    return NextResponse.json({
      bankConnected: !!shop.billplz_collection_id,
      bankName: shop.bank_name || null,
      bankAccountName: shop.bank_account_name || null,
      bankAccountNo: shop.bank_account_no || null,
      billplzEmail: shop.billplz_email || null,
      paymentEnabled: shop.payment_enabled || false,
      plan: shop.plan || 'starter',
      platformFeeSen: shop.platform_fee_sen || 100,
    })
  } catch (err) {
    console.error('Payment status error:', err)
    const message = err instanceof Error ? err.message : 'Failed to get payment status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
