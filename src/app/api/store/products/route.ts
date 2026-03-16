import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const shopId = req.nextUrl.searchParams.get('shopId') || process.env.NEXT_PUBLIC_SHOP_ID!

    const [{ data: products, error: pErr }, { data: categories, error: cErr }] = await Promise.all([
      supabase.from('products').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('shop_id', shopId).order('name'),
    ])

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    return NextResponse.json({ products, categories })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
