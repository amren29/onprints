import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole, Address, SavedArtwork, Order, CanvaTokens, UserMembership, MembershipPurchase, AgentWalletEntry } from '@/types/store'

// ── Admin utility functions (standalone, directly access localStorage) ───────
// These let admin pages read/write store user data without being logged in as that user.

const AUTH_STORAGE_KEY = 'onprints-auth-v2'

function readAuthStore(): { state: { users: User[]; currentUser: User | null } } {
  if (typeof window === 'undefined') return { state: { users: [], currentUser: null } }
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}') ?? { state: { users: [], currentUser: null } }
  } catch {
    return { state: { users: [], currentUser: null } }
  }
}

function writeAuthUsers(users: User[]) {
  if (typeof window === 'undefined') return
  const raw = readAuthStore()
  const currentUser = raw.state?.currentUser
  const updatedCurrent = currentUser ? users.find(u => u.id === currentUser.id) ?? null : null
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...raw, state: { ...raw.state, users, currentUser: updatedCurrent } }))
}

/** Find a store user by email */
export function getStoreUserByEmail(email: string): User | null {
  const { state } = readAuthStore()
  return state?.users?.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) ?? null
}

/** Find a store user by affiliate code */
export function getStoreUserByAffiliateCode(code: string): User | null {
  const { state } = readAuthStore()
  return state?.users?.find(u => u.affiliateCode === code) ?? null
}

/** Promote a store user to agent role with discount rate and init wallet.
 *  Clears any active membership — agent discount and membership are mutually exclusive. */
export function promoteStoreUserToAgent(email: string, discountRate: number) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    return {
      ...u,
      role: 'agent' as UserRole,
      discountRate,
      membership: undefined,
      walletBalance: u.walletBalance ?? 0,
      walletEntries: u.walletEntries ?? [],
    }
  })
  writeAuthUsers(users)
}

/** Approve a pending wallet topup entry in auth-store */
export function approveStoreTopup(email: string, entryId: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    const entries = u.walletEntries ?? []
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.status !== 'pending') return u
    const newBalance = (u.walletBalance ?? 0) + entry.amount
    return {
      ...u,
      walletBalance: newBalance,
      walletEntries: entries.map(e =>
        e.id === entryId ? { ...e, status: 'completed' as const, balance: newBalance } : e
      ),
    }
  })
  writeAuthUsers(users)
}

/** Credit a store user's wallet (admin-side, e.g. affiliate payout) */
export function creditStoreUserWallet(email: string, entry: Omit<AgentWalletEntry, 'balance'>) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    const newBalance = (u.walletBalance ?? 0) + entry.amount
    const entryWithBalance = { ...entry, balance: newBalance } as AgentWalletEntry
    return {
      ...u,
      walletBalance: newBalance,
      walletEntries: [...(u.walletEntries ?? []), entryWithBalance],
    }
  })
  writeAuthUsers(users)
}

export function debitStoreUserWallet(email: string, entry: Omit<AgentWalletEntry, 'balance'>) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    const newBalance = (u.walletBalance ?? 0) - entry.amount
    const entryWithBalance = { ...entry, balance: newBalance } as AgentWalletEntry
    return {
      ...u,
      walletBalance: newBalance,
      walletEntries: [...(u.walletEntries ?? []), entryWithBalance],
    }
  })
  writeAuthUsers(users)
}

/** Set affiliateCode on a store user */
export function setStoreUserAffiliateCode(email: string, code: string | undefined) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    return { ...u, affiliateCode: code }
  })
  writeAuthUsers(users)
}

/** Demote a store user from agent back to customer */
export function demoteStoreUserFromAgent(email: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    return {
      ...u,
      role: 'customer' as UserRole,
      discountRate: undefined,
    }
  })
  writeAuthUsers(users)
}

/** Activate a membership on a store user (called from admin approval).
 *  Skips activation if the user is an agent — agent discount and membership are mutually exclusive. */
export function activateStoreMembership(
  email: string,
  tierId: string,
  tierName: string,
  discountRate: number,
  durationMonths: number
) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const target = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())
  if (target?.role === 'agent') return // agents cannot have membership
  const now = new Date()
  const expiry = new Date(now)
  expiry.setMonth(expiry.getMonth() + durationMonths)
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    return {
      ...u,
      membership: {
        tierId,
        tierName,
        discountRate,
        startDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        status: 'active' as const,
      },
    }
  })
  writeAuthUsers(users)
}

/** Suspend a store user's membership */
export function suspendStoreMembership(email: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    if (!u.membership) return u
    return { ...u, membership: { ...u.membership, status: 'suspended' as const } }
  })
  writeAuthUsers(users)
}

/** Deactivate (set inactive) a store user's membership */
export function deactivateStoreMembership(email: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    if (!u.membership) return u
    return { ...u, membership: { ...u.membership, status: 'inactive' as const } }
  })
  writeAuthUsers(users)
}

/** Remove a store user's membership entirely */
export function deleteStoreMembership(email: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    return { ...u, membership: undefined }
  })
  writeAuthUsers(users)
}

/** Mark pending membership purchases as completed for a store user */
export function completeStoreMembershipPurchases(email: string, tierId: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    if (!u.membershipPurchases?.length) return u
    return {
      ...u,
      membershipPurchases: u.membershipPurchases.map(p =>
        p.tierId === tierId && p.paymentStatus === 'pending'
          ? { ...p, paymentStatus: 'completed' as const, activatedAt: new Date().toISOString() }
          : p
      ),
    }
  })
  writeAuthUsers(users)
}

/** Reject a pending wallet topup entry in auth-store */
export function rejectStoreTopup(email: string, entryId: string) {
  const { state } = readAuthStore()
  if (!state?.users) return
  const users = state.users.map(u => {
    if (u.email.toLowerCase() !== email.trim().toLowerCase()) return u
    const entries = u.walletEntries ?? []
    return {
      ...u,
      walletEntries: entries.filter(e => e.id !== entryId),
    }
  })
  writeAuthUsers(users)
}

// ── Demo accounts ────────────────────────────────────────────────────────────

const DEMO_USERS: User[] = []

// ── Store type ───────────────────────────────────────────────────────────────

type AuthStore = {
  users: User[]
  currentUser: User | null
  isHydrated: boolean

  signIn: (email: string, password: string) => { success: boolean; error?: string }
  signUp: (name: string, email: string, password: string, role?: UserRole) => { success: boolean; error?: string }
  signOut: () => void

  updateProfile: (updates: Partial<Pick<User, 'name' | 'phone' | 'company'>>) => void
  addAddress: (address: Address) => void
  updateAddress: (id: string, updates: Partial<Address>) => void
  removeAddress: (id: string) => void
  setDefaultAddress: (id: string) => void
  addSavedArtwork: (artwork: SavedArtwork) => void
  removeSavedArtwork: (id: string) => void
  addOrder: (order: Order) => void
  removeOrder: (orderId: string) => void
  updateOrderStatus: (orderId: string, updates: Partial<Order>) => void
  setCanvaTokens: (tokens: CanvaTokens) => void
  clearCanvaTokens: () => void

  // Membership
  setMembership: (membership: UserMembership) => void
  clearMembership: () => void
  addMembershipPurchase: (purchase: MembershipPurchase) => void

  // Wallet
  creditWallet: (entry: AgentWalletEntry) => void
  debitWallet: (entry: AgentWalletEntry) => void
}

// ── Helper to sync currentUser back to users array ───────────────────────────

function syncUser(state: { currentUser: User | null; users: User[] }, updated: User) {
  return {
    currentUser: updated,
    users: state.users.map((u) => (u.id === updated.id ? updated : u)),
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: DEMO_USERS,
      currentUser: null,
      isHydrated: false,

      signIn: (email, password) => {
        const user = get().users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        )
        if (!user) return { success: false, error: 'Invalid email or password' }
        set({ currentUser: user })
        return { success: true }
      },

      signUp: (name, email, password, role = 'customer') => {
        const exists = get().users.some(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        )
        if (exists) return { success: false, error: 'An account with this email already exists' }

        // Look up past guest orders from admin order store by matching email via customer directory
        let pastOrders: Order[] = []
        try {
          const { getOrders: getAdminOrders, initOrderData, updateOrder } = require('@/lib/order-store')
          initOrderData()

          // TODO: migrate customer lookup to Supabase
          const matchName = name

          const adminOrders = getAdminOrders() as import('@/lib/order-store').Order[]
          const guestOrders = adminOrders.filter((o: import('@/lib/order-store').Order) =>
            !o.customerRef &&
            o.source === 'online-store' &&
            o.customer.trim().toLowerCase() === matchName.trim().toLowerCase()
          )

          const userId = `usr_${Date.now()}`

          // Convert admin orders to store Order format and link them
          pastOrders = guestOrders.map((o: import('@/lib/order-store').Order) => {
            // Update admin order customerRef to link to new account
            updateOrder(o.id, { customerRef: userId })
            return {
              id: o.id,
              customer: o.customer,
              customerRef: userId,
              agent: o.agent,
              status: o.status as Order['status'],
              production: o.production as Order['production'],
              created: o.created,
              dueDate: o.dueDate,
              deliveryMethod: o.deliveryMethod,
              deliveryAddress: o.deliveryAddress,
              notes: o.notes,
              source: o.source as Order['source'],
              items: o.items.map((i: import('@/lib/order-store').OrderItem) => ({
                id: i.id, name: i.name, sku: i.sku, qty: i.qty,
                unitPrice: i.unitPrice, total: i.total,
                optionSummary: i.optionSummary,
                artworkFileName: i.artworkFileName, artworkUrl: i.artworkUrl,
                selectedSpecs: i.selectedSpecs, productSlug: i.productSlug,
                bulkVariant: i.bulkVariant, variantRows: i.variantRows,
              })),
              payments: o.payments ?? [],
              timeline: o.timeline ?? [],
              sstEnabled: o.sstEnabled,
              sstRate: o.sstRate,
              sstAmount: o.sstAmount,
              shippingCost: o.shippingCost,
              subtotal: o.subtotal,
              grandTotal: o.grandTotal,
              currency: o.currency,
            } as Order
          })

          const newUser: User = {
            id: userId,
            name,
            email,
            password,
            role,
            phone: '',
            company: '',
            addresses: [],
            savedArtwork: [],
            orders: pastOrders,
            createdAt: new Date().toISOString(),
          }
          set((state) => ({
            users: [...state.users, newUser],
            currentUser: newUser,
          }))
        } catch {
          // Fallback: create user without past orders
          const newUser: User = {
            id: `usr_${Date.now()}`,
            name,
            email,
            password,
            role,
            phone: '',
            company: '',
            addresses: [],
            savedArtwork: [],
            orders: [],
            createdAt: new Date().toISOString(),
          }
          set((state) => ({
            users: [...state.users, newUser],
            currentUser: newUser,
          }))
        }
        return { success: true }
      },

      signOut: () => set({ currentUser: null }),

      updateProfile: (updates) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = { ...state.currentUser, ...updates }
          return syncUser(state, updated)
        }),

      addAddress: (address) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            addresses: [...state.currentUser.addresses, address],
          }
          return syncUser(state, updated)
        }),

      updateAddress: (id, updates) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            addresses: state.currentUser.addresses.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
          }
          return syncUser(state, updated)
        }),

      removeAddress: (id) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            addresses: state.currentUser.addresses.filter((a) => a.id !== id),
          }
          return syncUser(state, updated)
        }),

      setDefaultAddress: (id) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            addresses: state.currentUser.addresses.map((a) => ({
              ...a,
              isDefault: a.id === id,
            })),
          }
          return syncUser(state, updated)
        }),

      addSavedArtwork: (artwork) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            savedArtwork: [...state.currentUser.savedArtwork, artwork],
          }
          return syncUser(state, updated)
        }),

      removeSavedArtwork: (id) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            savedArtwork: state.currentUser.savedArtwork.filter((a) => a.id !== id),
          }
          return syncUser(state, updated)
        }),

      addOrder: (order) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            orders: [order, ...state.currentUser.orders],
          }
          return syncUser(state, updated)
        }),

      removeOrder: (orderId) =>
        set((state) => {
          // Remove from all users (not just current user) so it's fully synced
          const updatedUsers = state.users.map((u) => ({
            ...u,
            orders: u.orders.filter((o) => o.id !== orderId),
          }))
          const updatedCurrent = state.currentUser
            ? { ...state.currentUser, orders: state.currentUser.orders.filter((o) => o.id !== orderId) }
            : null
          return { users: updatedUsers, currentUser: updatedCurrent }
        }),

      updateOrderStatus: (orderId, updates) =>
        set((state) => {
          const mapOrder = (o: Order) => o.id === orderId ? { ...o, ...updates } : o
          const updatedUsers = state.users.map((u) => ({
            ...u,
            orders: u.orders.map(mapOrder),
          }))
          const updatedCurrent = state.currentUser
            ? { ...state.currentUser, orders: state.currentUser.orders.map(mapOrder) }
            : null
          return { users: updatedUsers, currentUser: updatedCurrent }
        }),

      setCanvaTokens: (tokens) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = { ...state.currentUser, canvaTokens: tokens }
          return syncUser(state, updated)
        }),

      clearCanvaTokens: () =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = { ...state.currentUser, canvaTokens: undefined }
          return syncUser(state, updated)
        }),

      // ── Membership ─────────────────────────────────────────────────────

      setMembership: (membership) =>
        set((state) => {
          if (!state.currentUser) return state
          if (state.currentUser.role === 'agent') return state // agents cannot have membership
          const updated = { ...state.currentUser, membership }
          return syncUser(state, updated)
        }),

      clearMembership: () =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = { ...state.currentUser, membership: undefined }
          return syncUser(state, updated)
        }),

      addMembershipPurchase: (purchase) =>
        set((state) => {
          if (!state.currentUser) return state
          const updated = {
            ...state.currentUser,
            membershipPurchases: [...(state.currentUser.membershipPurchases ?? []), purchase],
          }
          return syncUser(state, updated)
        }),

      // ── Wallet ──────────────────────────────────────────────────────

      creditWallet: (entry) =>
        set((state) => {
          if (!state.currentUser) return state
          const newBalance = (state.currentUser.walletBalance ?? 0) + entry.amount
          const entryWithBalance = { ...entry, balance: newBalance }
          const updated = {
            ...state.currentUser,
            walletBalance: newBalance,
            walletEntries: [...(state.currentUser.walletEntries ?? []), entryWithBalance],
          }
          return syncUser(state, updated)
        }),

      debitWallet: (entry) =>
        set((state) => {
          if (!state.currentUser) return state
          const newBalance = (state.currentUser.walletBalance ?? 0) - entry.amount
          const entryWithBalance = { ...entry, balance: newBalance }
          const updated = {
            ...state.currentUser,
            walletBalance: newBalance,
            walletEntries: [...(state.currentUser.walletEntries ?? []), entryWithBalance],
          }
          return syncUser(state, updated)
        }),
    }),
    {
      name: 'onprints-auth-v2',
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true
      },
    }
  )
)
