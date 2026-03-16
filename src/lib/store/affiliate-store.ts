import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AffiliateAttribution } from '@/types/store'
// TODO [Batch H]: Replace finance-store getAffiliates with db/affiliates — needs async captureRef
import { getAffiliates } from '@/lib/finance-store'

const EXPIRY_DAYS = 30

interface AffiliateStore {
  attribution: (AffiliateAttribution & { expiresAt: number }) | null
  isHydrated: boolean
  captureRef: (code: string) => void
  getAttribution: () => AffiliateAttribution | null
  clearAttribution: () => void
}

export const useAffiliateStore = create<AffiliateStore>()(
  persist(
    (set, get) => ({
      attribution: null,
      isHydrated: false,

      captureRef: (code) => {
        const affiliate = getAffiliates().find(a => a.code.toUpperCase() === code.toUpperCase())
        if (!affiliate) return
        set({
          attribution: {
            refCode: affiliate.code,
            affiliateName: affiliate.name,
            affiliateId: affiliate.id,
            capturedAt: new Date().toISOString(),
            expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
          },
        })
      },

      getAttribution: () => {
        const attr = get().attribution
        if (!attr) return null
        if (Date.now() > attr.expiresAt) {
          set({ attribution: null })
          return null
        }
        return {
          refCode: attr.refCode,
          affiliateName: attr.affiliateName,
          affiliateId: attr.affiliateId,
          capturedAt: attr.capturedAt,
        }
      },

      clearAttribution: () => set({ attribution: null }),
    }),
    {
      name: 'saasprint-affiliate-v2',
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true
      },
    }
  )
)
