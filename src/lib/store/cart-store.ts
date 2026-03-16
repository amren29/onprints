import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OrderItem, VariantRow } from '@/types/store'
import { getStoreProductBySlug } from '@/lib/store/catalog-bridge'
import { calculatePrice } from '@/lib/store/pricing-engine'

export type CartItem = {
  id: string
  productId: string
  name: string
  slug: string
  qty: number
  unitPrice: number
  total: number
  selectedSpecs: Record<string, string>
  optionSummary: string
  artworkOption: 'upload' | 'canva' | ''
  artworkFileName: string
  artworkUrl?: string
  bulkVariant?: boolean
  variantRows?: VariantRow[]
}

export type ReorderResult = {
  added: number
  skipped: string[]
  priceChanged: boolean
}

type CartStore = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  reorderItems: (orderItems: OrderItem[]) => Promise<ReorderResult>
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQty: (id, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            // Skip qty updates for bulk variant items — user must edit via product page
            i.id === id && !i.bulkVariant ? { ...i, qty, total: i.unitPrice * qty } : i
          ),
        })),
      clearCart: () => set({ items: [] }),

      reorderItems: async (orderItems) => {
        const newCartItems: CartItem[] = []
        const skipped: string[] = []
        let priceChanged = false

        for (const item of orderItems) {
          // Find product by slug or sku
          const slug = item.productSlug || item.sku
          const product = await getStoreProductBySlug(slug)

          if (!product || !product.isActive) {
            skipped.push(item.name)
            continue
          }

          // Bulk variant reorder — preserve variant rows
          if (item.bulkVariant && item.variantRows?.length) {
            const totalQty = item.variantRows.reduce((s, r) => s + r.qty, 0)
            const grandTotal = item.variantRows.reduce((s, r) => s + r.rowTotal, 0)

            const cartItem: CartItem = {
              id: `reorder_bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              productId: product.id,
              name: item.name,
              slug: product.slug,
              qty: totalQty,
              unitPrice: 0,
              total: grandTotal,
              selectedSpecs: {},
              optionSummary: `${item.variantRows.length} variant${item.variantRows.length > 1 ? 's' : ''} · ${totalQty.toLocaleString()} pcs total`,
              artworkOption: '',
              artworkFileName: '',
              bulkVariant: true,
              variantRows: item.variantRows.map(r => ({ ...r })),
            }

            newCartItems.push(cartItem)
            continue
          }

          // Standard reorder
          const specs = item.selectedSpecs || {}
          const { unitPrice: currentPrice } = calculatePrice(product, specs, item.qty)

          if (Math.abs(currentPrice - item.unitPrice) > 0.005) {
            priceChanged = true
          }

          const cartItem: CartItem = {
            id: `reorder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            productId: product.id,
            name: item.name,
            slug: product.slug,
            qty: item.qty,
            unitPrice: currentPrice,
            total: parseFloat((currentPrice * item.qty).toFixed(2)),
            selectedSpecs: specs,
            optionSummary: item.optionSummary || '',
            artworkOption: item.artworkFileName ? 'upload' : '',
            artworkFileName: item.artworkFileName || '',
            artworkUrl: item.artworkUrl,
          }

          newCartItems.push(cartItem)
        }

        if (newCartItems.length > 0) {
          set((state) => ({ items: [...state.items, ...newCartItems] }))
        }

        return { added: newCartItems.length, skipped, priceChanged }
      },
    }),
    { name: 'saasprint-cart' }
  )
)
