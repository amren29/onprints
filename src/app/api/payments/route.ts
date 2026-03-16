import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get('shopId')
  if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get('shopId')
  if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 })

  const supabase = getSupabase()
  const input = await req.json()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'PAY', p_pad: 4 })
  if (seqErr) return NextResponse.json({ error: seqErr.message }, { status: 500 })

  const { data, error } = await supabase
    .from('payments')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      client: input.client ?? '',
      invoice_id: input.invoice_id ?? '',
      method: input.method ?? 'Cash',
      amount_due: input.amount_due ?? 0,
      amount_paid: input.amount_paid ?? 0,
      status: input.status ?? 'Pending',
      date: input.date ?? '',
      ref: input.ref ?? '',
      notes: input.notes ?? '',
      attachment: input.attachment ?? '',
      attachment_url: input.attachment_url ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get('shopId')
  const id = req.nextUrl.searchParams.get('id')
  if (!shopId || !id) return NextResponse.json({ error: 'shopId and id required' }, { status: 400 })

  const supabase = getSupabase()
  const updates = await req.json()

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get('shopId')
  const id = req.nextUrl.searchParams.get('id')
  if (!shopId || !id) return NextResponse.json({ error: 'shopId and id required' }, { status: 400 })

  const supabase = getSupabase()
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
