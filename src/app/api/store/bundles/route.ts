import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const shopId = process.env.NEXT_PUBLIC_SHOP_ID!

    const [{ data: bundles, error: bErr }, { data: products, error: pErr }] = await Promise.all([
      supabase.from('bundles').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
    ])

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    return NextResponse.json({ bundles, products })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
