'use client'

import { SECTION_TYPES, SECTION_REGISTRY, type SectionType } from '@/lib/store-builder'

const CloseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>)

type Props = {
  onPick: (type: SectionType) => void
  onClose: () => void
}

export default function SectionPicker({ onPick, onClose }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '80vh', margin: '0 20px', boxShadow: '0 24px 80px rgba(15,23,42,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Add Section</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Choose a section type to add to your page</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <CloseIcon />
          </button>
        </div>

        {/* Grid */}
        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {SECTION_TYPES.map(type => {
              const def = SECTION_REGISTRY[type]
              return (
                <button
                  key={type}
                  onClick={() => { onPick(type); onClose() }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '16px 10px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{def.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.3, textAlign: 'center' }}>{def.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
