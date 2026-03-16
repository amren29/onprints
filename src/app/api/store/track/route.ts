import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

    const shopId = process.env.NEXT_PUBLIC_SHOP_ID!

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Try lookup by id first, then fall back to seq_id
    let { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('id', orderId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data) {
      const fallback = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .eq('seq_id', orderId)
        .maybeSingle()

      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
      data = fallback.data
    }

    return NextResponse.json({ order: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
