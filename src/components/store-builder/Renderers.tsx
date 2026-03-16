'use client'

import { useState } from 'react'
import type { PageSection, SectionCtx } from '@/lib/store-builder'
import type { CatalogItem } from '@/lib/catalog-store' // type-only import — keep until catalog-store is fully deleted
import EditableText from './EditableText'

type RP = { props: Record<string, any>; variant: string; ctx: SectionCtx; sectionId: string }

/* ── Button action helper ─────────────────────────────── */
function handleAction(action: string | undefined, ctx: SectionCtx, fallback: string) {
  const a = action || fallback
  if (a === 'whatsapp') {
    const num = ctx.contactWhatsapp?.replace(/[^0-9]/g, '') || ''
    window.open(`https://wa.me/${num}?text=${encodeURIComponent('Hi, I would like to enquire about your printing services.')}`, '_blank')
  } else {
    ctx.nav(a)
  }
}

/* ── Shared ProductCard (modernized) ────────────────────── */
const StarIconSmall = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)
const PkgIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>)

export function ProductCard({ p, ctx }: { p: CatalogItem; ctx: SectionCtx }) {
  const ac = ctx.accentColor
  const mob = ctx.isMobile
  return (
    <div
      onClick={() => ctx.goDetail(p)}
      style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        border: '1px solid #f0f0f0', transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)'; el.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; el.style.transform = 'none' }}
    >
      {/* Image */}
      <div style={{
        height: mob ? 100 : 160, overflow: 'hidden', position: 'relative',
        background: `linear-gradient(135deg, ${ac}15, ${ac}05)`,
      }}>
        {p.mainImage?.url
          ? <img src={p.mainImage.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = 'scale(1)' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac, opacity: 0.5 }}><PkgIcon /></div>
        }
        {p.category && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', color: '#374151', fontSize: 9.5, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>{p.category}</div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: mob ? '10px 12px 12px' : '14px 16px 16px' }}>
        <div style={{ fontSize: mob ? 12 : 13.5, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 6 }}>{p.name}</div>
        {ctx.showPrices && (
          <div style={{ fontSize: mob ? 11 : 13, fontWeight: 800, color: ac }}>{p.price}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: mob ? 8 : 10 }}>
          <div style={{ display: 'flex', gap: 2, color: '#f59e0b' }}><StarIconSmall /><StarIconSmall /><StarIconSmall /><StarIconSmall /><StarIconSmall /></div>
          <div style={{
            background: `${ac}18`, color: ac, borderRadius: 8,
            padding: '4px 10px', fontSize: mob ? 9.5 : 10.5, fontWeight: 700, letterSpacing: '0.02em',
            border: `1px solid ${ac}25`,
          }}>View</div>
        </div>
      </div>
    </div>
  )
}

/* ── 1. Hero ────────────────────────────────────────────── */
export function HeroRenderer({ props, variant, ctx, sectionId }: RP) {
  const ac = ctx.accentColor
  const mob = ctx.isMobile
  const centered = variant === 'centered'
  const minimal = variant === 'minimal'
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{
      padding: minimal ? (mob ? '40px 16px' : '48px 32px') : (mob ? '48px 16px' : '64px 40px'),
      textAlign: centered ? 'center' : 'left',
      maxWidth: centered ? 680 : undefined,
      margin: centered ? '0 auto' : undefined,
      background: `linear-gradient(135deg, ${ac}30, ${ac}10)`,
      borderBottom: `2px solid ${ac}18`,
    }}>
      {!minimal && props.badge && (
        <EditableText tag="span" value={props.badge} editable={editable} onCommit={commit('badge')} style={{
          display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '.6px',
          textTransform: 'uppercase' as const, color: ac, background: `${ac}20`,
          padding: '5px 14px', borderRadius: 20, marginBottom: 16,
          boxShadow: `0 2px 8px ${ac}30`, border: `1px solid ${ac}25`,
        }} />
      )}
      <EditableText tag="h1" value={props.headline} editable={editable} onCommit={commit('headline')} style={{ fontSize: mob ? 24 : 36, fontWeight: 800, color: '#111', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.02em' }} />
      <EditableText tag="p" value={props.subtitle} editable={editable} onCommit={commit('subtitle')} style={{ fontSize: mob ? 13 : 15, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }} />
      <div style={{ display: 'flex', gap: 10, justifyContent: centered ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
        <button onClick={editable ? undefined : () => handleAction(props.ctaPrimaryAction, ctx, 'products')} style={{
          padding: '10px 22px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 10,
          background: ac, color: '#fff', cursor: editable ? 'text' : 'pointer',
          boxShadow: `0 4px 16px ${ac}55`, transition: 'box-shadow 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 8px 24px ${ac}65` }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.boxShadow = `0 4px 16px ${ac}55` }}
        ><EditableText tag="span" value={props.ctaPrimary} editable={editable} onCommit={commit('ctaPrimary')} /></button>
        <button onClick={editable ? undefined : () => handleAction(props.ctaSecondaryAction, ctx, 'contact')} style={{
          padding: '10px 22px', fontSize: 13, fontWeight: 600, borderRadius: 10,
          background: props.ctaSecondaryAction === 'whatsapp' ? '#25D366' : 'transparent',
          border: props.ctaSecondaryAction === 'whatsapp' ? 'none' : `1.5px solid ${ac}`,
          color: props.ctaSecondaryAction === 'whatsapp' ? '#fff' : ac,
          cursor: editable ? 'text' : 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = props.ctaSecondaryAction === 'whatsapp' ? '0 4px 14px rgba(37,211,102,0.4)' : `0 2px 10px ${ac}30`; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
        ><EditableText tag="span" value={props.ctaSecondary} editable={editable} onCommit={commit('ctaSecondary')} /></button>
      </div>
    </div>
  )
}

/* ── 2. Products ────────────────────────────────────────── */
export function ProductsRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const cols = variant === 'grid-2' ? 2 : (mob ? 2 : 3)
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  let items = ctx.enabledItems
  if (props.categoryFilter) items = items.filter(p => p.category === props.categoryFilter)
  items = items.slice(0, props.maxItems || 6)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px', background: `linear-gradient(180deg, ${ctx.accentColor}08, transparent)` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.02em' }} />
        <span onClick={() => ctx.goProducts()} style={{
          fontSize: 12, color: ctx.accentColor, cursor: 'pointer', fontWeight: 600,
          background: `${ctx.accentColor}15`, padding: '6px 16px', borderRadius: 20,
          border: `1.5px solid ${ctx.accentColor}35`, transition: 'background 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = ctx.accentColor; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = `0 2px 10px ${ctx.accentColor}40` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${ctx.accentColor}15`; e.currentTarget.style.color = ctx.accentColor; e.currentTarget.style.boxShadow = 'none' }}
        >View all &rarr;</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mob ? 12 : 18 }}>
        {items.map(p => <ProductCard key={p.id} p={p} ctx={ctx} />)}
      </div>
      {items.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 32 }}>No products to display</p>}
    </div>
  )
}

/* ── 3. Categories ──────────────────────────────────────── */
export function CategoriesRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const ac = ctx.accentColor
  const isCards = variant === 'cards'
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px' }}>
      <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 16px', letterSpacing: '-0.02em' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: mob ? 8 : 10 }}>
        {ctx.categories.map(cat => (
          <button key={cat} onClick={() => ctx.goProducts(cat)} style={{
            padding: isCards ? '12px 20px' : '8px 18px',
            fontSize: mob ? 11 : 12.5, fontWeight: 600, cursor: 'pointer',
            borderRadius: isCards ? 14 : 20,
            border: isCards ? `1.5px solid ${ac}20` : `1.5px solid ${ac}30`,
            background: isCards ? '#fff' : `${ac}08`, color: isCards ? '#111' : ac,
            boxShadow: isCards ? '0 1px 4px rgba(0,0,0,0.04)' : `0 1px 4px ${ac}15`,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => {
              const el = e.currentTarget
              if (isCards) { el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; el.style.borderColor = ac }
              else { el.style.background = ac; el.style.color = '#fff'; el.style.boxShadow = `0 4px 14px ${ac}40`; el.style.borderColor = ac }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              if (isCards) { el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.transform = 'none'; el.style.borderColor = `${ac}20` }
              else { el.style.background = `${ac}08`; el.style.color = ac; el.style.boxShadow = `0 1px 4px ${ac}15`; el.style.borderColor = `${ac}30` }
            }}
          >{cat}</button>
        ))}
      </div>
    </div>
  )
}

/* ── 4. Features ────────────────────────────────────────── */
export function FeaturesRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const ac = ctx.accentColor
  const cols = variant === '2-col' ? 2 : (mob ? 1 : 3)
  const items: { icon: string; title: string; desc: string }[] = props.items || []
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px' }}>
      <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 4px', letterSpacing: '-0.02em' }} />
      {props.subtitle && <EditableText tag="p" value={props.subtitle} editable={editable} onCommit={commit('subtitle')} style={{ fontSize: 13, color: '#4b5563', margin: '0 0 20px' }} />}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mob ? 14 : 20, marginTop: 16 }}>
        {items.map((f, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 14, padding: mob ? 16 : 20,
            border: '1px solid #f0f0f0', borderTop: `3px solid ${ac}40`,
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default',
          }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.1)`; el.style.transform = 'translateY(-3px)' }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)'; el.style.transform = 'none' }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 12, background: `${ac}18`,
              border: `1.5px solid ${ac}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, marginBottom: 12,
            }}>{f.icon}</div>
            <EditableText tag="div" value={f.title} editable={editable} onCommit={commit(`items.${i}.title`)} style={{ fontSize: 13.5, fontWeight: 700, color: '#111', marginBottom: 4 }} />
            <EditableText tag="div" value={f.desc} editable={editable} onCommit={commit(`items.${i}.desc`)} multiline style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 5. Testimonials ────────────────────────────────────── */
export function TestimonialsRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const items: { name: string; text: string; company: string }[] = props.items || []
  const hasCard = variant === 'cards'
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px' }}>
      <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 20px', letterSpacing: '-0.02em' }} />
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: mob ? 14 : 18 }}>
        {items.map((t, i) => (
          <div key={i} style={{
            padding: mob ? 16 : 20, borderRadius: 14, position: 'relative' as const,
            background: hasCard ? '#fff' : 'transparent',
            border: hasCard ? '1px solid #f0f0f0' : 'none',
            borderTop: hasCard ? `3px solid ${ctx.accentColor}60` : 'none',
            boxShadow: hasCard ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'box-shadow 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { if (hasCard) { const el = e.currentTarget; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; el.style.transform = 'translateY(-2px)' } }}
            onMouseLeave={e => { if (hasCard) { const el = e.currentTarget; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.transform = 'none' } }}
          >
            <span style={{ position: 'absolute', top: mob ? 10 : 14, left: mob ? 12 : 16, fontSize: 36, color: `${ctx.accentColor}40`, fontFamily: 'Georgia, serif', lineHeight: 1 }}>&ldquo;</span>
            <p style={{ fontSize: 12.5, color: '#374151', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 12px', paddingTop: hasCard ? 8 : 0 }}>&ldquo;<EditableText tag="span" value={t.text} editable={editable} onCommit={commit(`items.${i}.text`)} multiline />&rdquo;</p>
            <EditableText tag="div" value={t.name} editable={editable} onCommit={commit(`items.${i}.name`)} style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }} />
            <EditableText tag="div" value={t.company} editable={editable} onCommit={commit(`items.${i}.company`)} style={{ fontSize: 11, color: '#9ca3af' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 6. CTA ─────────────────────────────────────────────── */
export function CtaRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const ac = ctx.accentColor
  const bg = props.bgStyle === 'accent' ? ac : props.bgStyle === 'dark' ? '#111' : '#f9fafb'
  const fg = props.bgStyle === 'light' ? '#111' : '#fff'
  const btnBg = props.bgStyle === 'light' ? ac : '#fff'
  const btnFg = props.bgStyle === 'light' ? '#fff' : ac
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{
      background: bg, color: fg, textAlign: 'center',
      padding: mob ? '40px 16px' : '56px 40px', borderRadius: variant === 'centered' ? 14 : 0,
      maxWidth: variant === 'centered' ? 700 : undefined, margin: variant === 'centered' ? '0 auto' : undefined,
      boxShadow: variant === 'centered' ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
    }}>
      <EditableText tag="h2" value={props.headline} editable={editable} onCommit={commit('headline')} style={{ fontSize: mob ? 20 : 26, fontWeight: 800, margin: '0 0 8px', color: fg, letterSpacing: '-0.02em' }} />
      <EditableText tag="p" value={props.subtitle} editable={editable} onCommit={commit('subtitle')} style={{ fontSize: mob ? 12.5 : 14, margin: '0 0 22px', opacity: 0.85 }} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={editable ? undefined : () => handleAction(props.buttonAction, ctx, 'contact')} style={{
          padding: '11px 28px', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 10,
          background: btnBg, color: btnFg, cursor: editable ? 'text' : 'pointer',
          boxShadow: `0 4px 14px ${props.bgStyle === 'light' ? ac + '33' : 'rgba(255,255,255,0.2)'}`,
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = `0 6px 20px ${props.bgStyle === 'light' ? ac + '40' : 'rgba(255,255,255,0.3)'}` }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.boxShadow = `0 4px 14px ${props.bgStyle === 'light' ? ac + '33' : 'rgba(255,255,255,0.2)'}` }}
        ><EditableText tag="span" value={props.buttonText} editable={editable} onCommit={commit('buttonText')} /></button>
        {props.ctaSecondary && (
          <button onClick={editable ? undefined : () => handleAction(props.ctaSecondaryAction, ctx, 'contact')} style={{
            padding: '11px 28px', fontSize: 13, fontWeight: 700, borderRadius: 10,
            background: props.ctaSecondaryAction === 'whatsapp' ? '#25D366' : 'transparent',
            border: props.ctaSecondaryAction === 'whatsapp' ? 'none' : `1.5px solid ${fg}`,
            color: props.ctaSecondaryAction === 'whatsapp' ? '#fff' : fg,
            cursor: editable ? 'text' : 'pointer', transition: 'box-shadow 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = props.ctaSecondaryAction === 'whatsapp' ? '0 4px 14px rgba(37,211,102,0.4)' : '0 4px 14px rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          ><EditableText tag="span" value={props.ctaSecondary} editable={editable} onCommit={commit('ctaSecondary')} /></button>
        )}
      </div>
    </div>
  )
}

/* ── 7. Stats ───────────────────────────────────────────── */
export function StatsRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const ac = ctx.accentColor
  const items: { value: string; label: string }[] = props.items || []
  const isCards = variant === 'cards'
  const cols = mob ? 2 : Math.min(items.length, 4)
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px', background: `linear-gradient(135deg, ${ac}15, ${ac}06)` }}>
      {props.title && <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 20px', letterSpacing: '-0.02em', textAlign: 'center' as const }} />}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mob ? 12 : 18, textAlign: 'center' }}>
        {items.map((s, i) => (
          <div key={i} style={{
            padding: mob ? 16 : 22, borderRadius: 14,
            background: `${ac}12`,
            border: `1.5px solid ${ac}30`,
            boxShadow: `0 2px 8px ${ac}15`,
          }}>
            <EditableText tag="div" value={s.value} editable={editable} onCommit={commit(`items.${i}.value`)} style={{ fontSize: mob ? 28 : 34, fontWeight: 800, color: ac }} />
            <EditableText tag="div" value={s.label} editable={editable} onCommit={commit(`items.${i}.label`)} style={{ fontSize: mob ? 10.5 : 12, color: '#6b7280', marginTop: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 8. FAQ ─────────────────────────────────────────────── */
export function FaqRenderer({ props, variant, ctx, sectionId }: RP) {
  const [open, setOpen] = useState<string | null>(null)
  const mob = ctx.isMobile
  const items: { question: string; answer: string }[] = props.items || []
  const isAccordion = variant === 'accordion'
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px', maxWidth: 700 }}>
      <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 20px', letterSpacing: '-0.02em' }} />
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {items.map((faq, i) => {
          const key = `faq-${i}`
          const isOpen = !isAccordion || open === key
          return (
            <div key={key} style={{
              borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none',
              padding: mob ? '14px 16px' : '16px 20px',
              borderLeft: isOpen && isAccordion ? `4px solid ${ctx.accentColor}` : '4px solid transparent',
              background: isOpen && isAccordion ? `${ctx.accentColor}0a` : 'transparent',
              transition: 'border-color 0.2s, background 0.2s',
            }}>
              <div
                onClick={() => !editable && isAccordion && setOpen(open === key ? null : key)}
                style={{ fontSize: mob ? 12.5 : 13.5, fontWeight: 600, color: '#111', cursor: editable ? 'text' : (isAccordion ? 'pointer' : 'default'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <EditableText tag="span" value={faq.question} editable={editable} onCommit={commit(`items.${i}.question`)} style={{ flex: 1 }} />
                {isAccordion && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0, marginLeft: 8 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </div>
              {(isOpen || editable) && <EditableText tag="p" value={faq.answer} editable={editable} onCommit={commit(`items.${i}.answer`)} multiline style={{ fontSize: mob ? 11.5 : 12.5, color: '#6b7280', margin: '8px 0 0', lineHeight: 1.6 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── 9. Gallery ─────────────────────────────────────────── */
export function GalleryRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const images: { url: string; caption: string }[] = props.images || []
  const cols = mob ? 2 : (props.columns || 3)
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px' }}>
      <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 20px', letterSpacing: '-0.02em' }} />
      {images.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 32 }}>No images added yet</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: mob ? 8 : 12,
          ...(variant === 'masonry' ? { gridAutoRows: '180px' } : {}),
        }}>
          {images.map((img, i) => (
            <div key={i} style={{
              borderRadius: 14, overflow: 'hidden', position: 'relative' as const,
              background: `url(${img.url}) center/cover no-repeat`,
              minHeight: mob ? 120 : 180,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; el.style.transform = 'scale(1.02)'
                const cap = el.querySelector('[data-caption]') as HTMLElement; if (cap) cap.style.opacity = '1'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; el.style.transform = 'none'
                const cap = el.querySelector('[data-caption]') as HTMLElement; if (cap) cap.style.opacity = '0'
              }}
            >
              {img.caption && (
                <div data-caption style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '24px 12px 10px', fontSize: 11, fontWeight: 600, color: '#fff',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
                  opacity: 0, transition: 'opacity 0.2s',
                }}>{img.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 10. Text Block ─────────────────────────────────────── */
export function TextBlockRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const narrow = variant === 'narrow'
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{
      padding: mob ? '32px 16px' : '48px 32px',
      maxWidth: narrow ? 540 : undefined,
      margin: narrow ? '0 auto' : undefined,
      textAlign: (props.alignment as React.CSSProperties['textAlign']) || 'left',
    }}>
      {(props.heading || editable) && (
        <div style={{ marginBottom: 10 }}>
          <EditableText tag="h2" value={props.heading || ''} editable={editable} onCommit={commit('heading')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.02em', display: 'inline' }} />
          <div style={{ width: 60, height: 4, borderRadius: 2, background: ctx.accentColor, marginTop: 8 }} />
        </div>
      )}
      <EditableText tag="p" value={props.body || ''} editable={editable} onCommit={commit('body')} multiline style={{ fontSize: mob ? 12 : 13.5, color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }} />
    </div>
  )
}

/* ── 11. Trust Strip ────────────────────────────────────── */
export function TrustStripRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const ac = ctx.accentColor
  const items: { label: string }[] = props.items || []
  const isBadges = variant === 'badges'
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  return (
    <div style={{
      padding: mob ? '16px 16px' : '18px 32px',
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
      gap: mob ? 10 : 18, alignItems: 'center',
      background: `${ac}12`, borderTop: `1px solid ${ac}15`, borderBottom: `1px solid ${ac}15`,
      borderRadius: isBadges ? 14 : 0,
      border: isBadges ? `1.5px solid ${ac}30` : undefined,
    }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: mob ? 10.5 : 12, color: '#374151', fontWeight: 500 }}>
          {isBadges ? (
            <span style={{
              width: 22, height: 22, borderRadius: '50%', background: `${ac}25`, color: ac,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
            }}>&#10003;</span>
          ) : (
            i > 0 && <span style={{ color: '#d1d5db', margin: '0 4px' }}>&middot;</span>
          )}
          <EditableText tag="span" value={item.label} editable={editable} onCommit={commit(`items.${i}.label`)} />
        </span>
      ))}
    </div>
  )
}

/* ── 12. Contact ────────────────────────────────────────── */
export function ContactRenderer({ props, variant, ctx, sectionId }: RP) {
  const mob = ctx.isMobile
  const ac = ctx.accentColor
  const isSplit = variant === 'form-right' && !mob
  const editable = ctx.editingSectionId === sectionId
  const commit = (path: string) => (v: string) => ctx.onInlineEdit?.(sectionId, path, v)
  const info = [
    { icon: '\u2709', label: 'Email', value: ctx.contactEmail },
    { icon: '\u260E', label: 'Phone', value: ctx.contactPhone },
    { icon: '\uD83D\uDCAC', label: 'WhatsApp', value: ctx.contactWhatsapp },
    { icon: '\uD83D\uDCCD', label: 'Address', value: ctx.contactAddress },
  ].filter(r => r.value)
  return (
    <div style={{ padding: mob ? '32px 16px' : '48px 32px' }}>
      <div style={{ textAlign: isSplit ? 'left' : 'center', marginBottom: 20 }}>
        <EditableText tag="h2" value={props.title} editable={editable} onCommit={commit('title')} style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: '#111', margin: '0 0 4px', letterSpacing: '-0.02em' }} />
        <EditableText tag="p" value={props.subtitle} editable={editable} onCommit={commit('subtitle')} style={{ fontSize: 13, color: '#6b7280', margin: 0 }} />
      </div>
      <div style={{ display: isSplit ? 'grid' : 'block', gridTemplateColumns: isSplit ? '1fr 1fr' : undefined, gap: 32 }}>
        {/* Info col */}
        <div style={{ marginBottom: isSplit ? 0 : 24 }}>
          {info.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
              background: '#fafafa', borderRadius: 12, padding: mob ? '12px 14px' : '14px 16px',
              border: '1px solid #f0f0f0',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: 10, background: `${ac}18`,
                border: `1.5px solid ${ac}30`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
              }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{r.label}</div>
                <div style={{ fontSize: 12.5, color: '#111', fontWeight: 500 }}>{r.value}</div>
              </div>
            </div>
          ))}
          {props.hours && (
            <div style={{
              background: `${ac}10`, border: `1.5px solid ${ac}30`, borderRadius: 12,
              padding: mob ? '14px 14px' : '16px 18px', marginTop: 4,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111', textTransform: 'uppercase' as const, letterSpacing: '.4px', marginBottom: 6 }}>Opening Hours</div>
              <EditableText tag="div" value={props.hours} editable={editable} onCommit={commit('hours')} style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' as const }} />
            </div>
          )}
        </div>
        {/* Form col */}
        {props.showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Your Name" style={inputStyle(mob)} />
            <input placeholder="Email Address" style={inputStyle(mob)} />
            <textarea placeholder="Your Message" rows={4} style={{ ...inputStyle(mob), resize: 'vertical' }} />
            <button style={{
              padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 10,
              background: ac, color: '#fff', cursor: 'pointer', marginTop: 2,
              boxShadow: `0 2px 10px ${ac}33`, transition: 'box-shadow 0.2s, transform 0.2s',
            }}>Send Message</button>
          </div>
        )}
      </div>
    </div>
  )
}

function inputStyle(mob: boolean): React.CSSProperties {
  return {
    padding: mob ? '9px 12px' : '10px 14px', fontSize: 12.5, borderRadius: 10,
    border: '1px solid #e5e7eb', outline: 'none', fontFamily: 'Inter, sans-serif',
    background: '#fafafa',
  }
}

/* ── RenderSection dispatcher ───────────────────────────── */
export function RenderSection(section: PageSection, ctx: SectionCtx, sectionId?: string): React.ReactNode | null {
  if (!section.visible) return null
  const p = { props: section.props, variant: section.variant, ctx, sectionId: sectionId || section.id }
  switch (section.type) {
    case 'hero':         return <HeroRenderer {...p} />
    case 'products':     return <ProductsRenderer {...p} />
    case 'categories':   return <CategoriesRenderer {...p} />
    case 'features':     return <FeaturesRenderer {...p} />
    case 'testimonials': return <TestimonialsRenderer {...p} />
    case 'cta':          return <CtaRenderer {...p} />
    case 'stats':        return <StatsRenderer {...p} />
    case 'faq':          return <FaqRenderer {...p} />
    case 'gallery':      return <GalleryRenderer {...p} />
    case 'text-block':   return <TextBlockRenderer {...p} />
    case 'trust-strip':  return <TrustStripRenderer {...p} />
    case 'contact':      return <ContactRenderer {...p} />
    default:             return null
  }
}
