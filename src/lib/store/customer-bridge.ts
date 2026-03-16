import { upsertCustomerFromForm } from '@/lib/db/customers'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

/**
 * Upsert an online store customer into the admin customer directory (Supabase).
 * If found by name → update their info.
 * If not found → create new Individual customer.
 */
export async function upsertOnlineCustomer(
  contact: { name: string; email: string; phone: string; company: string },
  orderTotal: number,
) {
  if (!contact.email.trim()) return

  try {
    await upsertCustomerFromForm(SHOP_ID, {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      billing_address: '',
      sst_no: '',
      customer_type: 'Individual',
    })
  } catch {
    // Silently fail — non-critical for checkout flow
  }
}
