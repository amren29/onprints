export type PrintMethod = 'offset' | 'digital' | 'large-format'

export type ProductCategory =
  | 'cards'
  | 'marketing'
  | 'large-format'
  | 'stationery'
  | 'stickers'
  | 'signage'
  | 'stamps'
  | 'events'
  | 'merchandise'
  | 'documents'

export interface PrintSpecs {
  printMethod: PrintMethod
  bleedMm: number
  safeAreaMm: number
  minDpi: number
  trimWidthMm: number
  trimHeightMm: number
}

export interface QuantityTier {
  qty: number
  unitPrice: number
  productionDays: number
}

export interface SpecOption {
  key: string
  label: string
  options: string[]
  default: string
  displayType?: 'buttons' | 'dropdown' | 'image'
  /** Maps option label → image URL (for displayType: 'image') */
  optionImages?: Record<string, string>
}

export interface PricingMatrix {
  // key: "size|material|finishing|printSides|colorMode" -> quantity tiers
  [specKey: string]: QuantityTier[]
}

export interface OptionModifier {
  modifierType: 'add' | 'multiply'
  modifierValue: number
}

export interface VariantRow {
  id: string
  qty: number
  selectedSpecs: Record<string, string>
  optionSummary: string
  unitPrice: number
  rowTotal: number
}

export interface Product {
  id: string
  slug: string
  name: string
  category: ProductCategory
  description: string
  imageUrl: string
  specs: SpecOption[]
  quantities: number[]
  pricingMatrix: PricingMatrix
  /** Maps option label → modifier (e.g. "Matte Lamination" → { modifierType: 'add', modifierValue: 20 }) */
  optionModifiers?: Record<string, OptionModifier>
  printSpecs: PrintSpecs
  templateUrl?: string
  isActive: boolean
  /** Size mode: 'fixed' (default), 'custom' (user enters W×H), 'both' (fixed + custom option) */
  sizeMode?: 'fixed' | 'custom' | 'both'
  /** Sqft pricing config for custom sizes */
  sqftPricing?: { pricePerSqft: number; minCharge?: number }
  processDuration?: string
  productInfo?: {
    overview?: string
    printSpec?: string
    artworkGuidelines?: string
    processDuration?: string
    howToOrder?: string
    delivery?: string
  }
  bulkVariant?: boolean
  bulkVolumeTiers?: { qty: number; unitPrice: number }[]
  bulkOptionGroups?: {
    groupName: string
    selectionType: 'single' | 'multi'
    displayType: 'radio' | 'dropdown' | 'image'
    options: { label: string; modifierType: 'add' | 'multiply'; modifierValue: number }[]
  }[]
}

export interface CartItem {
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

export interface ArtworkAnalysis {
  widthPx: number
  heightPx: number
  dpi: number
  colorMode: 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown'
  fileFormat: string
  dimensionsMm: { width: number; height: number }
  qualityRating: 'poor' | 'acceptable' | 'excellent' | 'vector'
  warnings: string[]
}

// ── Canva ────────────────────────────────────────────────────────────────────

export interface CanvaTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
}

export interface CanvaDesign {
  id: string
  title: string
  thumbnail?: { url: string; width: number; height: number }
  url: string
  created_at: string
  updated_at: string
}

export interface CanvaExportJob {
  id: string
  status: 'in_progress' | 'completed' | 'failed'
  urls?: string[]
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'agent'

// Aligned with admin panel (frontend-onprints)
export type OrderStatus = 'Pending' | 'Confirmed' | 'Cancelled'
export type ProductionStatus = 'Queued' | 'In Progress' | 'Quality Check' | 'Completed' | 'Shipped' | 'Delivered' | '—'
export type OrderSource = 'manual' | 'online-store'

export interface Address {
  id: string
  label: string
  line1: string
  line2: string
  city: string
  postcode: string
  state: string
  isDefault: boolean
}

export interface SavedArtwork {
  id: string
  fileName: string
  fileSize: number
  imageUrl: string
  uploadedAt: string
  productSlug?: string
}

export interface OrderPayment {
  id: string
  date: string
  method: string
  ref: string
  amount: number
  status: 'Captured' | 'Pending' | 'Failed' | 'Paid'
  receiptData?: string
  receiptFileName?: string
}

export interface OrderTimeline {
  id: string
  date: string
  event: string
  by: string
}

export type CurrencyCode = 'MYR' | 'SGD' | 'USD'

export interface Order {
  id: string
  customer: string
  customerRef: string
  agent: string
  status: OrderStatus
  production: ProductionStatus
  created: string
  dueDate: string
  deliveryMethod: 'Delivery' | 'Self-Pickup'
  deliveryAddress: string
  notes: string
  source: OrderSource
  items: OrderItem[]
  payments: OrderPayment[]
  timeline: OrderTimeline[]

  affiliateRef?: string

  // ── Financial / Tax fields ──
  sstEnabled?: boolean
  sstRate?: number
  sstAmount?: number
  shippingCost?: number
  subtotal?: number
  grandTotal?: number
  currency?: CurrencyCode
}

export interface OrderItem {
  id: string
  name: string
  sku: string
  qty: number
  unitPrice: number
  total: number
  optionSummary?: string
  artworkFileName?: string
  artworkUrl?: string
  selectedSpecs?: Record<string, string>
  productSlug?: string
  bulkVariant?: boolean
  variantRows?: VariantRow[]
}

// ── Affiliate ───────────────────────────────────────────────────────────────

export interface AffiliateAttribution {
  refCode: string
  affiliateName: string
  affiliateId: string
  capturedAt: string
}

// ── Membership ──────────────────────────────────────────────────────────────

export interface MembershipTier {
  id: string
  name: string
  price: number
  discountRate: number
  durationMonths: number
  description?: string
}

export type MembershipStatus = 'active' | 'inactive' | 'suspended'

export interface UserMembership {
  tierId: string
  tierName: string
  discountRate: number
  startDate: string
  expiryDate: string
  status: MembershipStatus
}

// ── Membership Purchase ────────────────────────────────────────────────────

export interface MembershipPurchase {
  id: string
  userId: string
  tierId: string
  tierName: string
  price: number
  paymentMethod: 'online' | 'bank-transfer'
  paymentStatus: 'completed' | 'pending' | 'failed'
  paymentRef?: string
  receiptData?: string
  receiptFileName?: string
  purchasedAt: string
  activatedAt?: string
}

// ── Agent Wallet ───────────────────────────────────────────────────────────

export interface AgentWalletEntry {
  id: string
  date: string
  type: 'credit' | 'debit'
  category: 'topup-stripe' | 'topup-transfer' | 'order-debit' | 'adjustment' | 'commission' | 'payout-debit'
  description: string
  amount: number
  balance: number
  reference?: string
  receiptData?: string
  receiptFileName?: string
  status: 'completed' | 'pending'
}

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  phone: string
  company: string
  addresses: Address[]
  savedArtwork: SavedArtwork[]
  orders: Order[]
  canvaTokens?: CanvaTokens
  createdAt: string

  // Agent-only
  discountRate?: number // e.g. 0.20 for 20%

  // Affiliate
  affiliateCode?: string

  // Membership
  membership?: UserMembership
  membershipPurchases?: MembershipPurchase[]

  // Agent wallet
  walletBalance?: number
  walletEntries?: AgentWalletEntry[]
}
