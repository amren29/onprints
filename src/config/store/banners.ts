/**
 * Banner configuration — edit this file to change homepage banners.
 * The first banner with `isActive: true` will be displayed.
 * In the future, this will be managed from the admin panel.
 */

export interface Banner {
  id: string
  /** Background gradient or color (fallback when no image) */
  bgGradient: string
  /** Banner image URL — set from admin panel */
  bgImage?: string
  isActive: boolean
}

export const BANNERS: Banner[] = [
  {
    id: 'default',
    bgGradient: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 40%, #0d2847 70%, #0a0f1e 100%)',
    // bgImage: '/banners/hero.jpg',  // Set from admin panel
    isActive: true,
  },
]

/** Returns the first active banner, or null if none. */
export function getActiveBanner(): Banner | null {
  return BANNERS.find((b) => b.isActive) ?? null
}
