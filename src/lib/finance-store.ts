'use client'

// ── Types ─────────────────────────────────────────────
export type Payment = {
  id: string
  client: string
  invoiceId: string
  method: string
  amountDue: number
  amountPaid: number
  status: 'Captured' | 'Pending' | 'Failed'
  date: string
  ref: string
  notes: string
  attachment: string
  attachmentData?: string  // base64 data URL
}

export type WalletEntry = {
  id: string
  agent: string
  date: string
  type: 'credit' | 'debit'
  category: string
  description: string
  amount: number
  balance: number
}

// ── Storefront Membership / Topup Approvals ──────────
export type MembershipRequest = {
  id: string
  customerName: string
  customerEmail: string
  tierId: string
  tierName: string
  price: number
  paymentMethod: 'online' | 'bank-transfer'
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive'
  receiptFileName?: string
  receiptData?: string
  submittedAt: string
  reviewedAt?: string
}

export type TopupRequest = {
  id: string
  agentName: string
  agentEmail: string
  amount: number
  paymentMethod: 'online' | 'bank-transfer'
  status: 'pending' | 'approved' | 'rejected'
  receiptFileName?: string
  submittedAt: string
  reviewedAt?: string
}

export type AffiliateOrder = {
  id: string
  orderId: string
  customerName: string
  affiliateCode: string
  affiliateName: string
  orderTotal: number
  orderDate: string
}

export type Affiliate = {
  id: string
  name: string
  email: string
  code: string
  commissionRate: number
  assignedProducts: string[]
  status: 'active' | 'inactive'
  createdAt: string
}

export type AffiliatePayout = {
  id: string
  affiliateId: string
  affiliateName: string
  affiliateCode: string
  commissionRate: number
  orderIds: string[]
  orderTotal: number
  commissionAmount: number
  paidAt: string
  notes?: string
  // Legacy
  walletEntryId?: string
}

export type PayoutRequest = {
  id: string
  affiliateId: string
  affiliateName: string
  affiliateCode: string
  commissionRate: number
  orderIds: string[]
  orderTotal: number
  commissionAmount: number
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  reviewedAt?: string
  adminNotes?: string
}

export type WithdrawalRequest = {
  id: string
  userEmail: string
  userName: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  reviewedAt?: string
  adminNotes?: string
}

// ── localStorage helpers ───────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}
function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Sequential ID generators ──────────────────────────
function nextId(prefix: string, key: string): string {
  const items = read<{ id: string }[]>(key, [])
  const maxNum = items.reduce((max, item) => {
    const m = item.id.match(new RegExp(`^${prefix}-(\\d+)$`))
    return m ? Math.max(max, parseInt(m[1])) : max
  }, 0)
  return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`
}

// ── Keys ──────────────────────────────────────────────
const K = {
  init: 'fin.init',
  payments: 'fin.payments',
  wallet: 'fin.wallet',
  membershipRequests: 'fin.membership-requests',
  topupRequests: 'fin.topup-requests',
  affiliateOrders: 'fin.affiliate-orders',
  affiliates: 'fin.affiliates',
  affiliatePayouts: 'fin.affiliate-payouts',
  payoutRequests: 'fin.payout-requests',
  withdrawalRequests: 'fin.withdrawal-requests',
}

// ── Seed data ─────────────────────────────────────────
export function initFinanceData() {
  if (read<string>(K.init, '') === 'v12') return

  // Preserve existing data, only seed missing keys
  if (!localStorage.getItem(K.payments)) write(K.payments, [])
  if (!localStorage.getItem(K.wallet)) write(K.wallet, [])
  if (!localStorage.getItem(K.membershipRequests)) write(K.membershipRequests, [])
  if (!localStorage.getItem(K.topupRequests)) write(K.topupRequests, [])
  if (!localStorage.getItem(K.affiliateOrders)) write(K.affiliateOrders, [])
  if (!localStorage.getItem(K.affiliates)) write(K.affiliates, [])
  if (!localStorage.getItem(K.affiliatePayouts)) write(K.affiliatePayouts, [])
  if (!localStorage.getItem(K.payoutRequests)) write(K.payoutRequests, [])
  if (!localStorage.getItem(K.withdrawalRequests)) write(K.withdrawalRequests, [])
  write(K.init, 'v12')
}

// ── Payment CRUD ──────────────────────────────────────
export function getPayments(): Payment[] { return read(K.payments, []) }
export function getPaymentById(id: string): Payment | null { return getPayments().find(p => p.id === id) ?? null }
export function createPayment(data: Omit<Payment, 'id'>): Payment {
  const pay = { ...data, id: nextId('PAY', K.payments) }
  write(K.payments, [...getPayments(), pay])
  return pay
}
export function updatePayment(id: string, updates: Partial<Payment>) {
  write(K.payments, getPayments().map(p => p.id === id ? { ...p, ...updates } : p))
}
export function deletePayment(id: string) {
  write(K.payments, getPayments().filter(p => p.id !== id))
}

// ── Wallet CRUD ───────────────────────────────────────
export function getWalletEntries(): WalletEntry[] { return read(K.wallet, []) }
export function getWalletEntryById(id: string): WalletEntry | null { return getWalletEntries().find(e => e.id === id) ?? null }
export function createWalletEntry(data: Omit<WalletEntry, 'id' | 'balance'>): WalletEntry {
  const entries = getWalletEntries()
  const lastBalance = entries.length > 0 ? entries[0].balance : 0
  const balance = data.type === 'credit' ? lastBalance + data.amount : lastBalance - data.amount
  const entry = { ...data, id: nextId('WE', K.wallet), balance }
  write(K.wallet, [entry, ...entries])
  recalcBalances()
  return entry
}
export function updateWalletEntry(id: string, updates: Partial<WalletEntry>) {
  write(K.wallet, getWalletEntries().map(e => e.id === id ? { ...e, ...updates } : e))
  recalcBalances()
}
export function deleteWalletEntry(id: string) {
  write(K.wallet, getWalletEntries().filter(e => e.id !== id))
  recalcBalances()
}

function recalcBalances() {
  const entries = getWalletEntries()
  if (entries.length === 0) return
  const reversed = [...entries].reverse()
  let bal = 0
  for (const e of reversed) {
    bal = e.type === 'credit' ? bal + e.amount : bal - e.amount
    e.balance = bal
  }
  write(K.wallet, reversed.reverse())
}

// ── Financial calculation helpers ─────────────────────
export interface FinancialInput {
  items: { total: number }[]
  discount: number
  discountType: 'rm' | 'percent'
  sstEnabled: boolean
  sstRate: number
  rounding: number
  shippingCost: number
}

export function calcFinancialTotals(input: FinancialInput) {
  const subtotal = parseFloat(input.items.reduce((s, i) => s + i.total, 0).toFixed(2))
  const discountAmt = parseFloat(
    (input.discountType === 'percent' ? subtotal * (input.discount / 100) : input.discount).toFixed(2)
  )
  const afterDiscount = parseFloat((subtotal - discountAmt).toFixed(2))
  const sstAmt = input.sstEnabled
    ? parseFloat((afterDiscount * (input.sstRate / 100)).toFixed(2))
    : 0
  const shippingCost = parseFloat((input.shippingCost ?? 0).toFixed(2))
  const beforeRounding = parseFloat((afterDiscount + sstAmt + shippingCost).toFixed(2))
  const grandTotal = parseFloat((beforeRounding + input.rounding).toFixed(2))
  return { subtotal, discountAmt, afterDiscount, sstAmt, shippingCost, beforeRounding, grandTotal }
}

// ── Helpers ───────────────────────────────────────────
export const fmt = (n: number) => `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

// ── Membership Request CRUD ──────────────────────────
export function getMembershipRequests(): MembershipRequest[] { return read(K.membershipRequests, []) }
export function getMembershipRequestById(id: string): MembershipRequest | null { return getMembershipRequests().find(r => r.id === id) ?? null }
export function createMembershipRequest(data: Omit<MembershipRequest, 'id'>): MembershipRequest {
  const req = { ...data, id: nextId('MR', K.membershipRequests) }
  write(K.membershipRequests, [...getMembershipRequests(), req])
  return req
}
export function updateMembershipRequest(id: string, updates: Partial<MembershipRequest>) {
  write(K.membershipRequests, getMembershipRequests().map(r => r.id === id ? { ...r, ...updates } : r))
}
export function deleteMembershipRequest(id: string) {
  write(K.membershipRequests, getMembershipRequests().filter(r => r.id !== id))
}

// ── Topup Request CRUD ───────────────────────────────
export function getTopupRequests(): TopupRequest[] { return read(K.topupRequests, []) }
export function createTopupRequest(data: Omit<TopupRequest, 'id'>): TopupRequest {
  const req = { ...data, id: nextId('TR', K.topupRequests) }
  write(K.topupRequests, [...getTopupRequests(), req])
  return req
}
export function updateTopupRequest(id: string, updates: Partial<TopupRequest>) {
  write(K.topupRequests, getTopupRequests().map(r => r.id === id ? { ...r, ...updates } : r))
}
export function deleteTopupRequest(id: string) {
  write(K.topupRequests, getTopupRequests().filter(r => r.id !== id))
}

// ── Affiliate Order CRUD ─────────────────────────────
export function getAffiliateOrders(): AffiliateOrder[] { return read(K.affiliateOrders, []) }
export function createAffiliateOrder(data: Omit<AffiliateOrder, 'id'>): AffiliateOrder {
  const ao = { ...data, id: nextId('AO', K.affiliateOrders) }
  write(K.affiliateOrders, [...getAffiliateOrders(), ao])
  return ao
}

// ── Affiliate CRUD ───────────────────────────────────
import { setStoreUserAffiliateCode } from '@/lib/store/auth-store'

export function getAffiliates(): Affiliate[] { return read(K.affiliates, []) }
export function getAffiliateById(id: string): Affiliate | null { return getAffiliates().find(a => a.id === id) ?? null }
export function createAffiliate(data: Omit<Affiliate, 'id'>): Affiliate {
  const aff = { ...data, id: nextId('AF', K.affiliates) }
  write(K.affiliates, [...getAffiliates(), aff])
  if (aff.email) setStoreUserAffiliateCode(aff.email, aff.code)
  return aff
}
export function updateAffiliate(id: string, updates: Partial<Affiliate>) {
  const prev = getAffiliateById(id)
  write(K.affiliates, getAffiliates().map(a => a.id === id ? { ...a, ...updates } : a))
  const updated = getAffiliateById(id)
  if (updated?.email) setStoreUserAffiliateCode(updated.email, updated.code)
  if (prev && prev.email !== updated?.email) setStoreUserAffiliateCode(prev.email, undefined)
}
export function deleteAffiliate(id: string) {
  const aff = getAffiliateById(id)
  write(K.affiliates, getAffiliates().filter(a => a.id !== id))
  if (aff?.email) setStoreUserAffiliateCode(aff.email, undefined)
}

// ── Affiliate Payout CRUD ────────────────────────────
export function getAffiliatePayouts(): AffiliatePayout[] { return read(K.affiliatePayouts, []) }
export function createAffiliatePayout(data: Omit<AffiliatePayout, 'id'>): AffiliatePayout {
  const payout = { ...data, id: nextId('AP', K.affiliatePayouts) }
  write(K.affiliatePayouts, [...getAffiliatePayouts(), payout])
  return payout
}
export function deleteAffiliatePayout(id: string) {
  write(K.affiliatePayouts, getAffiliatePayouts().filter(p => p.id !== id))
}
export function getPaidAffiliateOrderIds(): Set<string> {
  const payouts = getAffiliatePayouts()
  const ids = new Set<string>()
  for (const p of payouts) { for (const oid of p.orderIds) ids.add(oid) }
  return ids
}

// ── Payout Request CRUD ────────────────────────
export function getPayoutRequests(): PayoutRequest[] { return read(K.payoutRequests, []) }
export function createPayoutRequest(data: Omit<PayoutRequest, 'id'>): PayoutRequest {
  const req = { ...data, id: nextId('PR', K.payoutRequests) }
  write(K.payoutRequests, [...getPayoutRequests(), req])
  return req
}
export function updatePayoutRequest(id: string, updates: Partial<PayoutRequest>) {
  write(K.payoutRequests, getPayoutRequests().map(r => r.id === id ? { ...r, ...updates } : r))
}
export function deletePayoutRequest(id: string) {
  write(K.payoutRequests, getPayoutRequests().filter(r => r.id !== id))
}

/** Returns order IDs that are NOT paid and NOT in any pending payout request */
export function getUnrequestedUnpaidOrderIds(affiliateCode: string): string[] {
  const paidIds = getPaidAffiliateOrderIds()
  const pendingRequests = getPayoutRequests().filter(r => r.affiliateCode === affiliateCode && r.status === 'pending')
  const pendingRequestedIds = new Set<string>()
  for (const r of pendingRequests) { for (const oid of r.orderIds) pendingRequestedIds.add(oid) }
  const allOrders = getAffiliateOrders().filter(o => o.affiliateCode === affiliateCode)
  return allOrders.filter(o => !paidIds.has(o.id) && !pendingRequestedIds.has(o.id)).map(o => o.id)
}
/** Get unpaid affiliate orders for a given code */
export function getUnpaidAffiliateOrders(affiliateCode: string): AffiliateOrder[] {
  const paidIds = getPaidAffiliateOrderIds()
  return getAffiliateOrders().filter(o => o.affiliateCode === affiliateCode && !paidIds.has(o.id))
}

export function executeAffiliatePayout(
  affiliate: Affiliate,
  orderIds: string[],
  orders: AffiliateOrder[]
): { payout: AffiliatePayout } {
  const included = orders.filter(o => orderIds.includes(o.id))
  const orderTotal = Math.round(included.reduce((s, o) => s + o.orderTotal, 0) * 100) / 100
  const commissionAmount = Math.round(orderTotal * (affiliate.commissionRate / 100) * 100) / 100
  const now = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })

  const payout = createAffiliatePayout({
    affiliateId: affiliate.id,
    affiliateName: affiliate.name,
    affiliateCode: affiliate.code,
    commissionRate: affiliate.commissionRate,
    orderIds,
    orderTotal,
    commissionAmount,
    paidAt: now,
  })

  return { payout }
}

// ── Withdrawal Request CRUD ─────────────────────────
export function getWithdrawalRequests(): WithdrawalRequest[] { return read(K.withdrawalRequests, []) }
export function createWithdrawalRequest(data: Omit<WithdrawalRequest, 'id'>): WithdrawalRequest {
  const req = { ...data, id: nextId('WR', K.withdrawalRequests) }
  write(K.withdrawalRequests, [...getWithdrawalRequests(), req])
  return req
}
export function updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>) {
  write(K.withdrawalRequests, getWithdrawalRequests().map(r => r.id === id ? { ...r, ...updates } : r))
}
export function deleteWithdrawalRequest(id: string) {
  write(K.withdrawalRequests, getWithdrawalRequests().filter(r => r.id !== id))
}
