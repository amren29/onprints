import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Check env vars
  results.env = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasShopId: !!process.env.NEXT_PUBLIC_SHOP_ID,
    shopId: process.env.NEXT_PUBLIC_SHOP_ID || '(empty)',
  }

  // 2. Test Supabase connection with anon key
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data, error } = await supabase
      .from('products')
      .select('id, name, status, visibility')
      .eq('shop_id', process.env.NEXT_PUBLIC_SHOP_ID!)
      .limit(5)

    if (error) {
      results.supabase = { ok: false, error: error.message }
    } else {
      results.supabase = { ok: true, productCount: data.length, products: data }
    }
  } catch (err: any) {
    results.supabase = { ok: false, error: err.message }
  }

  return NextResponse.json(results)
}
