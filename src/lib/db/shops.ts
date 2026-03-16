'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export async function createShop(data: {
  name: string
  phone?: string
  logoUrl?: string
  onboardingData?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated', shop: null }

  // Use admin client to bypass RLS for shop bootstrapping
  const admin = supabaseAdmin

  // Generate unique slug
  const baseSlug = slugify(data.name) || 'my-shop'
  let slug = baseSlug
  let attempt = 0
  while (attempt < 10) {
    const { data: existing } = await admin
      .from('shops')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // Create shop
  const { data: shop, error: shopErr } = await admin
    .from('shops')
    .insert({
      name: data.name,
      slug,
      logo_url: data.logoUrl || null,
      onboarding_data: data.onboardingData || {},
    })
    .select('id, slug')
    .single()

  if (shopErr) return { error: shopErr.message, shop: null }

  // Link user as owner
  const { error: memberErr } = await admin
    .from('shop_members')
    .insert({
      shop_id: shop.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberErr) return { error: memberErr.message, shop: null }

  return { error: null, shop }
}

export async function getShopBySlug(slug: string) {
  const admin = supabaseAdmin

  const { data, error } = await admin
    .from('shops')
    .select('id, slug, name, logo_url, currency, settings')
    .eq('slug', slug)
    .maybeSingle()

  if (error) return null
  return data
}

export async function getUserShop() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: membership } = await supabase
    .from('shop_members')
    .select('shop_id, role, shops(id, name, slug, logo_url, currency, plan_id, settings)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return null

  return {
    shopId: membership.shop_id,
    role: membership.role,
    shop: (membership as any).shops,
  }
}
