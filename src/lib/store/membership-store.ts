import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MembershipTier } from '@/types/store'

interface MembershipStore {
  tiers: MembershipTier[]
  isHydrated: boolean
  setTiers: (tiers: MembershipTier[]) => void
  addTier: (tier: MembershipTier) => void
  updateTier: (id: string, updates: Partial<MembershipTier>) => void
  removeTier: (id: string) => void
}

const SEED_TIERS: MembershipTier[] = [
  {
    id: 'tier_essential',
    name: 'Essential',
    price: 99,
    discountRate: 0.05,
    durationMonths: 12,
    description: 'Perfect for occasional orders. Enjoy 5% off every purchase for a full year.',
  },
  {
    id: 'tier_bronze',
    name: 'Bronze',
    price: 199,
    discountRate: 0.10,
    durationMonths: 12,
    description: 'Great value for regular customers. Save 10% on all orders year-round.',
  },
  {
    id: 'tier_silver',
    name: 'Silver',
    price: 499,
    discountRate: 0.15,
    durationMonths: 12,
    description: 'For growing businesses. Unlock 15% savings on every order.',
  },
  {
    id: 'tier_gold',
    name: 'Gold',
    price: 999,
    discountRate: 0.20,
    durationMonths: 12,
    description: 'Premium tier for high-volume buyers. 20% discount on all purchases.',
  },
  {
    id: 'tier_platinum',
    name: 'Platinum',
    price: 1999,
    discountRate: 0.25,
    durationMonths: 12,
    description: 'Our best value tier. Maximum 25% discount on everything, all year.',
  },
]

export const useMembershipStore = create<MembershipStore>()(
  persist(
    (set) => ({
      tiers: SEED_TIERS,
      isHydrated: false,
      setTiers: (tiers: MembershipTier[]) => set({ tiers }),
      addTier: (tier: MembershipTier) =>
        set((state) => ({ tiers: [...state.tiers, tier] })),
      updateTier: (id: string, updates: Partial<MembershipTier>) =>
        set((state) => ({
          tiers: state.tiers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTier: (id: string) =>
        set((state) => ({ tiers: state.tiers.filter((t) => t.id !== id) })),
    }),
    {
      name: 'onprints-membership-tiers-v2',
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true
      },
    }
  )
)
