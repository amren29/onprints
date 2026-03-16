'use client'

/**
 * Maps emoji/text icon strings to outline SVG icons.
 * Used by Features, TrustBar, ProcessSteps, FAQ sections.
 */

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ICON_MAP: Record<string, React.ReactNode> = {
  // Delivery / Truck
  '🚚': <><path d="M16 3h5l3 6v5h-2a3 3 0 0 1-6 0H8a3 3 0 0 1-6 0H0V6a1 1 0 0 1 1-1h0" /><rect x="1" y="3" width="15" height="13" rx="1" /><circle cx="5" cy="16" r="2.5" /><circle cx="19" cy="16" r="2.5" /><path d="M16 8h4l2 4" /></>,
  // Lock / Security
  '🔒': <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1" /></>,
  // Celebration / Promotions
  '🎉': <><path d="M5.8 11.3 2 22l10.7-3.8" /><path d="M4 3h.01" /><path d="M22 8h.01" /><path d="M15 2h.01" /><path d="M22 20h.01" /><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" /><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" /></>,
  // Person / Customer service
  '🙋': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  // Lightning / Fast
  '⚡': <><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></>,
  // Shield
  '🛡️': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  '🛡': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  // Location pin
  '📍': <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  // Shopping cart
  '🛒': <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>,
  // Upload / inbox
  '📤': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  // Credit card / Payment
  '💳': <><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /><path d="M6 16h4" /></>,
  // Art / Design
  '🎨': <><circle cx="13.5" cy="6.5" r="2.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.64 1.5-1.42 0-.35-.15-.69-.42-.95-.26-.26-.42-.6-.42-.98 0-.78.57-1.42 1.34-1.42H16a6 6 0 0 0 6-6c0-5.52-4.48-10-10-10Z" /></>,
  // Star
  '⭐': <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
  // Check / Verify
  '✓': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></>,
  '✅': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></>,
  // Warning
  '⚠': <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  // Clock / Time
  '⏱️': <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  '⏱': <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  // Hourglass
  '⏳': <><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></>,
  // Folder / File
  '📁': <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>,
  // Book
  '📖': <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  // Money / Dollar
  '💰': <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  // Megaphone
  '📢': <><path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  // Heart
  '❤️': <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></>,
  // Globe
  '🌍': <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>,
  // Phone
  '📱': <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></>,
  // Mail
  '✉️': <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  // Settings / Gear
  '⚙️': <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
}

export default function SectionIcon({ icon, size = 24, className = '' }: { icon?: string; size?: number; className?: string }) {
  if (!icon) return null
  const paths = ICON_MAP[icon]
  if (!paths) {
    // Fallback: render as text (for unknown emojis)
    return <span className={className} style={{ fontSize: size * 0.8 }}>{icon}</span>
  }
  return (
    <svg width={size} height={size} className={className} {...svgProps}>
      {paths}
    </svg>
  )
}
