import { Product } from '@/types/store'

export const businessCardsStandard: Product = {
  id: 'business-cards-standard',
  slug: 'business-cards-standard',
  name: 'Business Cards — Standard',
  category: 'cards',
  description: 'Full-colour business cards on premium art card. Ideal for networking and brand identity.',
  imageUrl: '/images/products/business-cards.jpg',
  isActive: true,
  templateUrl: '/templates/business-cards-90x54mm.pdf',
  specs: [
    {
      key: 'size',
      label: 'Size',
      options: ['90×54mm', '85×55mm', '90×50mm'],
      default: '90×54mm',
    },
    {
      key: 'material',
      label: 'Material',
      options: ['260gsm Art Card', '310gsm Art Card', '350gsm Art Card'],
      default: '310gsm Art Card',
    },
    {
      key: 'finishing',
      label: 'Finishing',
      options: ['None', 'Matte Lamination', 'Gloss Lamination', 'Spot UV'],
      default: 'None',
    },
    {
      key: 'printSides',
      label: 'Print Sides',
      options: ['Single Side', 'Double Side'],
      default: 'Single Side',
    },
    {
      key: 'colorMode',
      label: 'Color Mode',
      options: ['Full Color', 'Grayscale'],
      default: 'Full Color',
    },
  ],
  quantities: [100, 200, 300, 500, 1000, 2000, 5000],
  // Pricing: base tiers for "90×54mm|310gsm Art Card|None|Single Side|Full Color"
  // Other spec combos multiply by a factor handled in the pricing engine
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
  printSpecs: {
    printMethod: 'offset',
    bleedMm: 3,
    safeAreaMm: 5,
    minDpi: 300,
    trimWidthMm: 90,
    trimHeightMm: 54,
  },
}

export const pvcCards: Product = {
  id: 'pvc-id-cards',
  slug: 'pvc-id-cards',
  name: 'PVC ID / Membership Cards',
  category: 'cards',
  description: 'Durable full-colour PVC cards. Perfect for membership, loyalty, and ID cards.',
  imageUrl: '/images/products/pvc-cards.jpg',
  isActive: true,
  specs: [
    {
      key: 'quantity',
      label: 'Quantity',
      options: ['50', '100', '200', '500'],
      default: '100',
    },
    {
      key: 'printSides',
      label: 'Print Sides',
      options: ['Single Side', 'Double Side'],
      default: 'Double Side',
    },
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
  printSpecs: {
    printMethod: 'digital',
    bleedMm: 2,
    safeAreaMm: 3,
    minDpi: 300,
    trimWidthMm: 85.6,
    trimHeightMm: 54,
  },
}
