'use client'

import { useState } from 'react'
import { type PageSection, type SectionType, type StorePageId, SECTION_REGISTRY, PAGE_IDS, PAGE_LABELS } from '@/lib/store-builder'
import SectionList from '@/components/store-builder/SectionList'

/* ── Wireframe SVGs ────────────────────────────────────── */
const wireframes: Partial<Record<SectionType, React.ReactNode>> = {
  'trust-strip': (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="16" width="20" height="8" rx="4" fill="#d1d5db"/>
      <rect x="30" y="16" width="20" height="8" rx="4" fill="#d1d5db"/>
      <rect x="55" y="16" width="20" height="8" rx="4" fill="#d1d5db"/>
      <rect x="80" y="16" width="15" height="8" rx="4" fill="#d1d5db"/>
    </svg>
  ),
  contact: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="5" width="40" height="6" rx="2" fill="#d1d5db"/>
      <rect x="5" y="14" width="30" height="4" rx="1" fill="#e5e7eb"/>
      <rect x="55" y="5" width="40" height="30" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="60" y="10" width="30" height="4" rx="1" fill="#e5e7eb"/>
      <rect x="60" y="17" width="30" height="4" rx="1" fill="#e5e7eb"/>
      <rect x="60" y="24" width="30" height="8" rx="1" fill="#e5e7eb"/>
    </svg>
  ),
  hero: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="4" width="45" height="7" rx="2" fill="#9ca3af"/>
      <rect x="5" y="14" width="35" height="4" rx="1" fill="#d1d5db"/>
      <rect x="5" y="22" width="25" height="4" rx="1" fill="#d1d5db"/>
      <rect x="5" y="30" width="18" height="7" rx="3" fill="#3b82f6"/>
      <rect x="60" y="4" width="35" height="32" rx="4" fill="#e5e7eb"/>
    </svg>
  ),
  products: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="2" width="30" height="5" rx="1.5" fill="#9ca3af"/>
      <rect x="5" y="10" width="28" height="26" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="36" y="10" width="28" height="26" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="67" y="10" width="28" height="26" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
    </svg>
  ),
  categories: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="4" width="28" height="5" rx="1.5" fill="#9ca3af"/>
      <rect x="5" y="14" width="22" height="10" rx="5" fill="#e5e7eb"/>
      <rect x="30" y="14" width="22" height="10" rx="5" fill="#e5e7eb"/>
      <rect x="55" y="14" width="22" height="10" rx="5" fill="#e5e7eb"/>
      <rect x="5" y="28" width="22" height="10" rx="5" fill="#e5e7eb"/>
      <rect x="30" y="28" width="22" height="10" rx="5" fill="#e5e7eb"/>
    </svg>
  ),
  features: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="2" width="28" height="5" rx="1.5" fill="#9ca3af"/>
      <rect x="5" y="10" width="28" height="28" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="36" y="10" width="28" height="28" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="67" y="10" width="28" height="28" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <circle cx="19" cy="18" r="4" fill="#d1d5db"/>
      <circle cx="50" cy="18" r="4" fill="#d1d5db"/>
      <circle cx="81" cy="18" r="4" fill="#d1d5db"/>
    </svg>
  ),
  testimonials: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="2" width="28" height="5" rx="1.5" fill="#9ca3af"/>
      <rect x="10" y="12" width="24" height="22" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="38" y="12" width="24" height="22" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="66" y="12" width="24" height="22" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
    </svg>
  ),
  gallery: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="5" width="28" height="14" rx="2" fill="#e5e7eb"/>
      <rect x="36" y="5" width="28" height="14" rx="2" fill="#e5e7eb"/>
      <rect x="67" y="5" width="28" height="14" rx="2" fill="#e5e7eb"/>
      <rect x="5" y="22" width="28" height="14" rx="2" fill="#e5e7eb"/>
      <rect x="36" y="22" width="28" height="14" rx="2" fill="#e5e7eb"/>
      <rect x="67" y="22" width="28" height="14" rx="2" fill="#e5e7eb"/>
    </svg>
  ),
  'text-block': (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="10" y="6" width="50" height="5" rx="1.5" fill="#9ca3af"/>
      <rect x="10" y="14" width="80" height="3" rx="1" fill="#e5e7eb"/>
      <rect x="10" y="20" width="80" height="3" rx="1" fill="#e5e7eb"/>
      <rect x="10" y="26" width="60" height="3" rx="1" fill="#e5e7eb"/>
      <rect x="10" y="32" width="70" height="3" rx="1" fill="#e5e7eb"/>
    </svg>
  ),
  cta: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="0" y="2" width="100" height="36" rx="0" fill="#3b82f620"/>
      <rect x="22" y="8" width="56" height="6" rx="2" fill="#9ca3af"/>
      <rect x="28" y="17" width="44" height="4" rx="1" fill="#d1d5db"/>
      <rect x="36" y="26" width="28" height="8" rx="4" fill="#3b82f6"/>
    </svg>
  ),
  stats: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="5" y="8" width="20" height="24" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="28" y="8" width="20" height="24" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="51" y="8" width="20" height="24" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="74" y="8" width="20" height="24" rx="3" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <text x="15" y="22" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="700">8+</text>
      <text x="38" y="22" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="700">2.4k</text>
      <text x="61" y="22" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="700">18k</text>
      <text x="84" y="22" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="700">99%</text>
    </svg>
  ),
  faq: (
    <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
      <rect x="10" y="4" width="30" height="5" rx="1.5" fill="#9ca3af"/>
      <rect x="10" y="12" width="80" height="7" rx="2" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="10" y="21" width="80" height="7" rx="2" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
      <rect x="10" y="30" width="80" height="7" rx="2" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
    </svg>
  ),
}

/* ── Section type groups ────────────────────────────────── */
const GROUPS: { label: string; types: SectionType[] }[] = [
  { label: 'Navigation', types: ['trust-strip', 'contact'] },
  { label: 'Hero', types: ['hero', 'banner'] },
  { label: 'Content', types: ['products', 'categories', 'features', 'testimonials', 'gallery', 'text-block', 'story-timeline', 'location'] },
  { label: 'Actions', types: ['cta', 'stats', 'faq', 'newsletter', 'process-steps', 'pricing-tiers'] },
]

/* ── Toolbar icon SVGs ──────────────────────────────────── */
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const LayersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const PageIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const ComponentIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const GearIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const HelpIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const ChevronRight = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
const ChevronDown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>

type ToolbarView = 'add' | 'layers' | 'pages' | 'components'

type Props = {
  sections: PageSection[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (next: PageSection[]) => void
  onAddSection: (type: SectionType) => void
  onOpenSettings: () => void
  activePageId?: StorePageId
  onPageSwitch?: (pageId: StorePageId) => void
}

export default function BuilderLeftPanel({
  sections, selectedId, onSelect, onMove, onToggle, onRemove, onReorder,
  onAddSection, onOpenSettings, activePageId, onPageSwitch,
}: Props) {
  const [activeView, setActiveView] = useState<ToolbarView>('add')
  const [leftTab, setLeftTab] = useState<'layouts' | 'elements'>('layouts')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleGroup = (label: string) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))

  const toolbarItems: { icon: React.ReactNode; view: ToolbarView; title: string }[] = [
    { icon: <PlusIcon />, view: 'add', title: 'Add' },
    { icon: <LayersIcon />, view: 'layers', title: 'Layers' },
    { icon: <PageIcon />, view: 'pages', title: 'Pages' },
    { icon: <ComponentIcon />, view: 'components', title: 'Components' },
  ]

  return (
    <>
      {/* Vertical toolbar */}
      <div className="builder-toolbar">
        {toolbarItems.map(item => (
          <button
            key={item.view}
            className={`builder-toolbar-btn${activeView === item.view ? ' active' : ''}`}
            onClick={() => setActiveView(item.view)}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
        <div className="builder-toolbar-spacer" />
        <button className="builder-toolbar-btn" onClick={onOpenSettings} title="Settings"><GearIcon /></button>
        <button className="builder-toolbar-btn" title="Search"><SearchIcon /></button>
        <button className="builder-toolbar-btn" title="Help"><HelpIcon /></button>
      </div>

      {/* Main panel */}
      <div className="builder-left-panel">
        {activeView === 'add' && (
          <>
            <div className="builder-left-tabs">
              <button className={`builder-left-tab${leftTab === 'layouts' ? ' active' : ''}`} onClick={() => setLeftTab('layouts')}>Layouts</button>
              <button className={`builder-left-tab${leftTab === 'elements' ? ' active' : ''}`} onClick={() => setLeftTab('elements')}>Elements</button>
            </div>

            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 22, top: 16, pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="builder-left-search"
                placeholder="Search sections..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {GROUPS.map(group => {
                const filtered = group.types.filter(t => {
                  if (!search) return true
                  const def = SECTION_REGISTRY[t]
                  return def.label.toLowerCase().includes(search.toLowerCase())
                })
                if (filtered.length === 0) return null
                const isCollapsed = collapsed[group.label]
                return (
                  <div key={group.label} className="builder-section-group">
                    <div className="builder-section-group-header" onClick={() => toggleGroup(group.label)}>
                      <span className="builder-section-group-label">{group.label}</span>
                      {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                    </div>
                    {!isCollapsed && (
                      <div className="builder-section-grid">
                        {filtered.map(type => {
                          const def = SECTION_REGISTRY[type]
                          return (
                            <div key={type} className="builder-section-thumb" onClick={() => onAddSection(type)}>
                              <div className="builder-section-thumb-preview">
                                {wireframes[type] || (
                                  <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
                                    <rect x="10" y="8" width="80" height="24" rx="4" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
                                  </svg>
                                )}
                              </div>
                              <div className="builder-section-thumb-label">{def.label}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {activeView === 'layers' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            <SectionList
              sections={sections}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              onToggle={onToggle}
              onRemove={onRemove}
              onReorder={onReorder}
              onAddClick={() => setActiveView('add')}
            />
          </div>
        )}

        {activeView === 'pages' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 8 }}>Store Pages</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {PAGE_IDS.map(pageId => {
                const isActive = activePageId === pageId
                return (
                  <button
                    key={pageId}
                    onClick={() => onPageSwitch?.(pageId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? '#fff' : '#374151',
                      fontSize: 12, fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f5f5f7' }}
                    onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <PageIcon />
                    {PAGE_LABELS[pageId]}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeView === 'components' && (
          <div className="builder-empty-state">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
              <ComponentIcon />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Components</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Reusable components coming soon</div>
          </div>
        )}
      </div>
    </>
  )
}
