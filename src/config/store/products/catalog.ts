import { Product, ProductCategory } from '@/types/store'

// @deprecated — All consumers should use the catalog bridge instead:
//   import { getStoreProducts, getStoreCategories, getStoreProductBySlug } from '@/lib/store/catalog-bridge'
// This static file is kept only as seed data for the admin catalog (sp_catalog).
// Do NOT import PRODUCTS, CATEGORIES, or getProductBySlug from this file in new code.

export const PRODUCTS: Product[] = [
  // ── CARDS ────────────────────────────────────────────────────────────────
  {
    id: 'business-cards-standard',
    slug: 'business-cards-standard',
    name: 'Business Cards',
    category: 'cards',
    description: 'Full-colour business cards on premium art card stock.',
    imageUrl: '/images/products/business-cards.jpg',
    isActive: true,
    templateUrl: '/templates/business-cards.pdf',
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['90×54mm', '85×55mm', '90×50mm'], default: '90×54mm' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['260gsm Art Card', '310gsm Art Card', '350gsm Art Card'], default: '310gsm Art Card' },
      { key: 'finishing', label: 'Finishing', options: ['None', 'Matte Lamination', 'Gloss Lamination', 'Spot UV'], default: 'None' },
      { key: 'printSides', label: 'Print Sides', options: ['Single Side', 'Double Side'], default: 'Single Side' },
      { key: 'colorMode', label: 'Color Mode', options: ['Full Color', 'Grayscale'], default: 'Full Color' },
    ],
    quantities: [100, 200, 300, 500, 1000, 2000, 5000],
    pricingMatrix: {
      default: [
        { qty: 100, unitPrice: 0.28, productionDays: 3 },
        { qty: 200, unitPrice: 0.20, productionDays: 3 },
        { qty: 300, unitPrice: 0.17, productionDays: 3 },
        { qty: 500, unitPrice: 0.14, productionDays: 4 },
        { qty: 1000, unitPrice: 0.10, productionDays: 4 },
        { qty: 2000, unitPrice: 0.08, productionDays: 5 },
        { qty: 5000, unitPrice: 0.06, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'offset', bleedMm: 3, safeAreaMm: 5, minDpi: 300, trimWidthMm: 90, trimHeightMm: 54 },
  },
  {
    id: 'pvc-id-cards',
    slug: 'pvc-id-cards',
    name: 'PVC ID / Membership Cards',
    category: 'cards',
    description: 'Durable full-colour PVC cards for membership, loyalty, and ID purposes.',
    imageUrl: '/images/products/pvc-cards.jpg',
    isActive: true,
    specs: [
      { key: 'printSides', label: 'Print Sides', options: ['Single Side', 'Double Side'], default: 'Double Side' },
    ],
    quantities: [50, 100, 200, 500],
    pricingMatrix: {
      default: [
        { qty: 50, unitPrice: 3.50, productionDays: 5 },
        { qty: 100, unitPrice: 2.80, productionDays: 5 },
        { qty: 200, unitPrice: 2.20, productionDays: 5 },
        { qty: 500, unitPrice: 1.80, productionDays: 7 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 2, safeAreaMm: 3, minDpi: 300, trimWidthMm: 85.6, trimHeightMm: 54 },
  },

  // ── MARKETING ────────────────────────────────────────────────────────────
  {
    id: 'flyers',
    slug: 'flyers',
    name: 'Flyers',
    category: 'marketing',
    description: 'Eye-catching flyers for promotions, events, and announcements.',
    imageUrl: '/images/products/flyers.jpg',
    isActive: true,
    templateUrl: '/templates/flyers-a5.pdf',
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['A6 (105×148mm)', 'A5 (148×210mm)', 'A4 (210×297mm)'], default: 'A5 (148×210mm)' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['130gsm Art Paper', '170gsm Art Paper', '250gsm Art Card'], default: '130gsm Art Paper' },
      { key: 'finishing', label: 'Finishing', options: ['None', 'Matte Lamination', 'Gloss Lamination'], default: 'None' },
      { key: 'printSides', label: 'Print Sides', options: ['Single Side', 'Double Side'], default: 'Single Side' },
    ],
    quantities: [100, 200, 500, 1000, 2000, 5000],
    pricingMatrix: {
      default: [
        { qty: 100, unitPrice: 0.45, productionDays: 3 },
        { qty: 200, unitPrice: 0.32, productionDays: 3 },
        { qty: 500, unitPrice: 0.22, productionDays: 4 },
        { qty: 1000, unitPrice: 0.16, productionDays: 4 },
        { qty: 2000, unitPrice: 0.12, productionDays: 5 },
        { qty: 5000, unitPrice: 0.09, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'offset', bleedMm: 3, safeAreaMm: 5, minDpi: 300, trimWidthMm: 148, trimHeightMm: 210 },
  },
  {
    id: 'brochures',
    slug: 'brochures',
    name: 'Brochures',
    category: 'marketing',
    description: 'Professional bi-fold or tri-fold brochures for product and company profiles.',
    imageUrl: '/images/products/brochures.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['A4 Bi-fold', 'A4 Tri-fold', 'A5 Bi-fold'], default: 'A4 Bi-fold' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['130gsm Art Paper', '170gsm Art Paper'], default: '130gsm Art Paper' },
      { key: 'finishing', label: 'Finishing', options: ['None', 'Matte Lamination', 'Gloss Lamination'], default: 'None' },
    ],
    quantities: [100, 200, 500, 1000, 2000],
    pricingMatrix: {
      default: [
        { qty: 100, unitPrice: 1.20, productionDays: 4 },
        { qty: 200, unitPrice: 0.90, productionDays: 4 },
        { qty: 500, unitPrice: 0.65, productionDays: 5 },
        { qty: 1000, unitPrice: 0.50, productionDays: 5 },
        { qty: 2000, unitPrice: 0.38, productionDays: 6 },
      ],
    },
    printSpecs: { printMethod: 'offset', bleedMm: 3, safeAreaMm: 5, minDpi: 300, trimWidthMm: 210, trimHeightMm: 297 },
  },
  {
    id: 'posters',
    slug: 'posters',
    name: 'Posters',
    category: 'marketing',
    description: 'High-impact posters for retail, events, and indoor display.',
    imageUrl: '/images/products/posters.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['A3 (297×420mm)', 'A2 (420×594mm)', 'A1 (594×841mm)'], default: 'A3 (297×420mm)' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['130gsm Art Paper', '170gsm Art Paper', '250gsm Art Card'], default: '170gsm Art Paper' },
      { key: 'finishing', label: 'Finishing', options: ['None', 'Matte Lamination', 'Gloss Lamination'], default: 'None' },
    ],
    quantities: [10, 25, 50, 100, 200, 500],
    pricingMatrix: {
      default: [
        { qty: 10, unitPrice: 4.50, productionDays: 3 },
        { qty: 25, unitPrice: 3.20, productionDays: 3 },
        { qty: 50, unitPrice: 2.50, productionDays: 4 },
        { qty: 100, unitPrice: 1.90, productionDays: 4 },
        { qty: 200, unitPrice: 1.50, productionDays: 5 },
        { qty: 500, unitPrice: 1.20, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 3, safeAreaMm: 5, minDpi: 150, trimWidthMm: 297, trimHeightMm: 420 },
  },

  // ── LARGE FORMAT ─────────────────────────────────────────────────────────
  {
    id: 'banners',
    slug: 'banners',
    name: 'Banners',
    category: 'large-format',
    description: 'Durable vinyl banners for outdoor and indoor events.',
    imageUrl: '/images/products/banners.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['1×2m', '1×3m', '2×3m', '2×4m', '3×5m', 'Custom'], default: '1×2m' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['PVC Vinyl', 'Mesh Banner', 'Backlit Film'], default: 'PVC Vinyl' },
      { key: 'finishing', label: 'Finishing', options: ['Hems & Eyelets', 'Hems Only', 'No Finishing'], default: 'Hems & Eyelets' },
    ],
    quantities: [1, 2, 5, 10, 20],
    pricingMatrix: {
      default: [
        { qty: 1, unitPrice: 35.00, productionDays: 2 },
        { qty: 2, unitPrice: 30.00, productionDays: 2 },
        { qty: 5, unitPrice: 26.00, productionDays: 3 },
        { qty: 10, unitPrice: 22.00, productionDays: 3 },
        { qty: 20, unitPrice: 18.00, productionDays: 4 },
      ],
    },
    printSpecs: { printMethod: 'large-format', bleedMm: 5, safeAreaMm: 10, minDpi: 72, trimWidthMm: 1000, trimHeightMm: 2000 },
  },
  {
    id: 'bunting',
    slug: 'bunting',
    name: 'Bunting',
    category: 'large-format',
    description: 'String of printed triangular flags for events and retail decorations.',
    imageUrl: '/images/products/bunting.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Flag Size', displayType: 'dropdown', options: ['Small (15×20cm)', 'Medium (20×28cm)', 'Large (30×40cm)'], default: 'Medium (20×28cm)' },
      { key: 'length', label: 'String Length', options: ['5m', '10m', '20m'], default: '10m' },
    ],
    quantities: [1, 2, 5, 10],
    pricingMatrix: {
      default: [
        { qty: 1, unitPrice: 45.00, productionDays: 3 },
        { qty: 2, unitPrice: 40.00, productionDays: 3 },
        { qty: 5, unitPrice: 35.00, productionDays: 4 },
        { qty: 10, unitPrice: 30.00, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'large-format', bleedMm: 5, safeAreaMm: 10, minDpi: 100, trimWidthMm: 200, trimHeightMm: 280 },
  },

  // ── STATIONERY ───────────────────────────────────────────────────────────
  {
    id: 'letterheads',
    slug: 'letterheads',
    name: 'Letterheads',
    category: 'stationery',
    description: 'Branded A4 letterheads on quality paper for professional correspondence.',
    imageUrl: '/images/products/letterheads.jpg',
    isActive: true,
    specs: [
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['80gsm Offset', '100gsm Offset', '120gsm Art Paper'], default: '100gsm Offset' },
      { key: 'colorMode', label: 'Color Mode', options: ['Full Color', 'Spot Color (1–2 colors)', 'Black Only'], default: 'Full Color' },
    ],
    quantities: [100, 250, 500, 1000, 2000],
    pricingMatrix: {
      default: [
        { qty: 100, unitPrice: 0.55, productionDays: 3 },
        { qty: 250, unitPrice: 0.38, productionDays: 3 },
        { qty: 500, unitPrice: 0.28, productionDays: 4 },
        { qty: 1000, unitPrice: 0.20, productionDays: 4 },
        { qty: 2000, unitPrice: 0.15, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'offset', bleedMm: 3, safeAreaMm: 10, minDpi: 300, trimWidthMm: 210, trimHeightMm: 297 },
  },
  {
    id: 'notepads',
    slug: 'notepads',
    name: 'Notepads',
    category: 'stationery',
    description: 'Custom-printed notepads with branded header. Available in A4, A5, or A6.',
    imageUrl: '/images/products/notepads.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['A4 (210×297mm)', 'A5 (148×210mm)', 'A6 (105×148mm)'], default: 'A5 (148×210mm)' },
      { key: 'sheets', label: 'Sheets per Pad', options: ['25 sheets', '50 sheets', '100 sheets'], default: '50 sheets' },
      { key: 'colorMode', label: 'Header Print', options: ['Full Color', 'Black Only'], default: 'Full Color' },
    ],
    quantities: [10, 25, 50, 100, 200],
    pricingMatrix: {
      default: [
        { qty: 10, unitPrice: 8.50, productionDays: 4 },
        { qty: 25, unitPrice: 6.50, productionDays: 4 },
        { qty: 50, unitPrice: 5.20, productionDays: 5 },
        { qty: 100, unitPrice: 4.00, productionDays: 5 },
        { qty: 200, unitPrice: 3.20, productionDays: 6 },
      ],
    },
    printSpecs: { printMethod: 'offset', bleedMm: 3, safeAreaMm: 5, minDpi: 300, trimWidthMm: 148, trimHeightMm: 210 },
  },

  // ── STICKERS & LABELS ────────────────────────────────────────────────────
  {
    id: 'sticker-labels',
    slug: 'sticker-labels',
    name: 'Sticker Labels',
    category: 'stickers',
    description: 'Custom-shape or rectangle sticker labels for products, packaging, and branding.',
    imageUrl: '/images/products/stickers.jpg',
    isActive: true,
    specs: [
      { key: 'shape', label: 'Shape', options: ['Rectangle', 'Square', 'Circle', 'Custom Cut'], default: 'Rectangle' },
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['50×50mm', '70×50mm', '100×70mm', '100×100mm'], default: '70×50mm' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['White Vinyl', 'Clear Vinyl', 'Holographic'], default: 'White Vinyl' },
      { key: 'finishing', label: 'Finishing', options: ['Gloss', 'Matte'], default: 'Gloss' },
    ],
    quantities: [100, 250, 500, 1000, 2000, 5000],
    pricingMatrix: {
      default: [
        { qty: 100, unitPrice: 0.35, productionDays: 3 },
        { qty: 250, unitPrice: 0.24, productionDays: 3 },
        { qty: 500, unitPrice: 0.18, productionDays: 4 },
        { qty: 1000, unitPrice: 0.14, productionDays: 4 },
        { qty: 2000, unitPrice: 0.10, productionDays: 5 },
        { qty: 5000, unitPrice: 0.08, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 2, safeAreaMm: 3, minDpi: 300, trimWidthMm: 70, trimHeightMm: 50 },
  },

  // ── SIGNAGE ──────────────────────────────────────────────────────────────
  {
    id: 'acrylic-signage',
    slug: 'acrylic-signage',
    name: 'Acrylic Signage',
    category: 'signage',
    description: 'Premium acrylic signs for offices, retail, and reception areas.',
    imageUrl: '/images/products/acrylic-signage.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['A5 (148×210mm)', 'A4 (210×297mm)', 'A3 (297×420mm)', 'Custom'], default: 'A4 (210×297mm)' },
      { key: 'thickness', label: 'Thickness', options: ['3mm', '5mm', '8mm'], default: '5mm' },
      { key: 'mounting', label: 'Mounting', options: ['None', 'Standoff Bolts', 'Double-sided Tape'], default: 'None' },
    ],
    quantities: [1, 2, 5, 10, 25],
    pricingMatrix: {
      default: [
        { qty: 1, unitPrice: 55.00, productionDays: 5 },
        { qty: 2, unitPrice: 48.00, productionDays: 5 },
        { qty: 5, unitPrice: 42.00, productionDays: 6 },
        { qty: 10, unitPrice: 36.00, productionDays: 7 },
        { qty: 25, unitPrice: 30.00, productionDays: 7 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 2, safeAreaMm: 5, minDpi: 300, trimWidthMm: 210, trimHeightMm: 297 },
  },

  // ── STAMPS ───────────────────────────────────────────────────────────────
  {
    id: 'rubber-stamps',
    slug: 'rubber-stamps',
    name: 'Rubber Stamps',
    category: 'stamps',
    description: 'Self-inking or traditional rubber stamps for business use.',
    imageUrl: '/images/products/rubber-stamps.jpg',
    isActive: true,
    specs: [
      { key: 'type', label: 'Type', options: ['Self-Inking', 'Traditional (with Pad)'], default: 'Self-Inking' },
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['28×60mm', '38×75mm', '47×80mm'], default: '38×75mm' },
      { key: 'inkColor', label: 'Ink Color', options: ['Black', 'Blue', 'Red', 'Green'], default: 'Blue' },
    ],
    quantities: [1, 2, 5, 10],
    pricingMatrix: {
      default: [
        { qty: 1, unitPrice: 28.00, productionDays: 3 },
        { qty: 2, unitPrice: 25.00, productionDays: 3 },
        { qty: 5, unitPrice: 22.00, productionDays: 4 },
        { qty: 10, unitPrice: 19.00, productionDays: 4 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 0, safeAreaMm: 3, minDpi: 300, trimWidthMm: 38, trimHeightMm: 75 },
  },

  // ── EVENTS & PROMO ───────────────────────────────────────────────────────
  {
    id: 'name-tags',
    slug: 'name-tags',
    name: 'Name Tags',
    category: 'events',
    description: 'Printed name tags and badges for events, conferences, and exhibitions.',
    imageUrl: '/images/products/name-tags.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['54×90mm', '60×90mm', '86×54mm'], default: '54×90mm' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['PVC', 'Card with Lamination'], default: 'PVC' },
      { key: 'clip', label: 'Attachment', options: ['Pin Clip', 'Alligator Clip', 'Lanyard Hole'], default: 'Pin Clip' },
    ],
    quantities: [25, 50, 100, 200, 500],
    pricingMatrix: {
      default: [
        { qty: 25, unitPrice: 2.50, productionDays: 3 },
        { qty: 50, unitPrice: 2.00, productionDays: 3 },
        { qty: 100, unitPrice: 1.60, productionDays: 4 },
        { qty: 200, unitPrice: 1.30, productionDays: 4 },
        { qty: 500, unitPrice: 1.00, productionDays: 5 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 2, safeAreaMm: 3, minDpi: 300, trimWidthMm: 54, trimHeightMm: 90 },
  },
  {
    id: 'event-tickets',
    slug: 'event-tickets',
    name: 'Event Tickets',
    category: 'events',
    description: 'Serialised event tickets with tear-off stub. Optional numbering available.',
    imageUrl: '/images/products/event-tickets.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['210×74mm (DL)', '148×105mm (A6)'], default: '210×74mm (DL)' },
      { key: 'material', label: 'Material', displayType: 'dropdown', options: ['170gsm Art Paper', '250gsm Art Card'], default: '170gsm Art Paper' },
      { key: 'numbering', label: 'Numbering', options: ['None', 'Sequential Numbering'], default: 'None' },
    ],
    quantities: [100, 250, 500, 1000, 2000],
    pricingMatrix: {
      default: [
        { qty: 100, unitPrice: 0.60, productionDays: 4 },
        { qty: 250, unitPrice: 0.45, productionDays: 4 },
        { qty: 500, unitPrice: 0.35, productionDays: 5 },
        { qty: 1000, unitPrice: 0.28, productionDays: 5 },
        { qty: 2000, unitPrice: 0.22, productionDays: 6 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 3, safeAreaMm: 5, minDpi: 300, trimWidthMm: 210, trimHeightMm: 74 },
  },

  // ── MERCHANDISE ──────────────────────────────────────────────────────────
  {
    id: 'mugs',
    slug: 'mugs',
    name: 'Mugs',
    category: 'merchandise',
    description: 'Custom-printed ceramic mugs. Great for corporate gifts and merchandise.',
    imageUrl: '/images/products/mugs.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['11oz Standard', '15oz Large'], default: '11oz Standard' },
      { key: 'printArea', label: 'Print Area', options: ['One Side', 'Full Wrap'], default: 'One Side' },
    ],
    quantities: [6, 12, 24, 48, 100],
    pricingMatrix: {
      default: [
        { qty: 6, unitPrice: 18.00, productionDays: 5 },
        { qty: 12, unitPrice: 15.00, productionDays: 5 },
        { qty: 24, unitPrice: 12.00, productionDays: 6 },
        { qty: 48, unitPrice: 10.00, productionDays: 7 },
        { qty: 100, unitPrice: 8.50, productionDays: 7 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 3, safeAreaMm: 5, minDpi: 150, trimWidthMm: 200, trimHeightMm: 90 },
  },
  {
    id: 'non-woven-bags',
    slug: 'non-woven-bags',
    name: 'Non-Woven Bags',
    category: 'merchandise',
    description: 'Eco-friendly non-woven shopping bags with custom print.',
    imageUrl: '/images/products/non-woven-bags.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['Small (25×30cm)', 'Medium (33×40cm)', 'Large (38×45cm)'], default: 'Medium (33×40cm)' },
      { key: 'color', label: 'Bag Color', options: ['White', 'Black', 'Red', 'Blue', 'Green'], default: 'White' },
      { key: 'printSides', label: 'Print Sides', options: ['One Side', 'Two Sides'], default: 'One Side' },
    ],
    quantities: [50, 100, 200, 500, 1000],
    pricingMatrix: {
      default: [
        { qty: 50, unitPrice: 3.80, productionDays: 5 },
        { qty: 100, unitPrice: 3.00, productionDays: 5 },
        { qty: 200, unitPrice: 2.40, productionDays: 6 },
        { qty: 500, unitPrice: 1.90, productionDays: 7 },
        { qty: 1000, unitPrice: 1.50, productionDays: 7 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 5, safeAreaMm: 10, minDpi: 150, trimWidthMm: 330, trimHeightMm: 400 },
  },

  // ── DOCUMENTS ────────────────────────────────────────────────────────────
  {
    id: 'document-printing',
    slug: 'document-printing',
    name: 'Document Printing',
    category: 'documents',
    description: 'Black & white or colour document printing. Ideal for reports and manuals.',
    imageUrl: '/images/products/document-printing.jpg',
    isActive: true,
    specs: [
      { key: 'size', label: 'Size', displayType: 'dropdown', options: ['A4', 'A3'], default: 'A4' },
      { key: 'colorMode', label: 'Color Mode', options: ['Black & White', 'Full Color'], default: 'Black & White' },
      { key: 'binding', label: 'Binding', options: ['None (Loose)', 'Staple', 'Comb Binding', 'Spiral Binding'], default: 'None (Loose)' },
      { key: 'paperWeight', label: 'Paper', options: ['80gsm', '100gsm'], default: '80gsm' },
    ],
    quantities: [10, 25, 50, 100, 250, 500],
    pricingMatrix: {
      default: [
        { qty: 10, unitPrice: 0.15, productionDays: 1 },
        { qty: 25, unitPrice: 0.12, productionDays: 1 },
        { qty: 50, unitPrice: 0.10, productionDays: 1 },
        { qty: 100, unitPrice: 0.08, productionDays: 2 },
        { qty: 250, unitPrice: 0.07, productionDays: 2 },
        { qty: 500, unitPrice: 0.06, productionDays: 2 },
      ],
    },
    printSpecs: { printMethod: 'digital', bleedMm: 0, safeAreaMm: 10, minDpi: 150, trimWidthMm: 210, trimHeightMm: 297 },
  },
]

export const CATEGORIES: { id: ProductCategory; label: string; description: string }[] = [
  { id: 'cards', label: 'Cards', description: 'Business cards, PVC, membership' },
  { id: 'marketing', label: 'Marketing', description: 'Flyers, brochures, posters' },
  { id: 'large-format', label: 'Large Format', description: 'Banners, bunting, canvas' },
  { id: 'stationery', label: 'Stationery', description: 'Letterheads, notepads, calendars' },
  { id: 'stickers', label: 'Stickers & Labels', description: 'Custom stickers and labels' },
  { id: 'signage', label: 'Signage', description: 'Acrylic and display signage' },
  { id: 'stamps', label: 'Stamps', description: 'Self-inking rubber stamps' },
  { id: 'events', label: 'Events & Promo', description: 'Name tags, tickets, lanyards' },
  { id: 'merchandise', label: 'Merchandise', description: 'Mugs, bags, and gifts' },
  { id: 'documents', label: 'Documents', description: 'Document and plan printing' },
]

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return PRODUCTS.filter((p) => p.category === category && p.isActive)
}
