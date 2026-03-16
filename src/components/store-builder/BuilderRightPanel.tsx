'use client'

import { useState } from 'react'
import { type PageSection, type GlobalSettings, SECTION_REGISTRY, updateSectionVariant, updateSectionProps, toggleSectionVisibility, removeSection } from '@/lib/store-builder'
import SectionEditorForm from '@/components/store-builder/Editors'

/* ── Icons ──────────────────────────────────────────── */
const LayoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
const ContentIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const StyleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><circle cx="12" cy="12" r="3"/></svg>
const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const InfoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
const CursorIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-6 1-3 6z"/></svg>
const ChevronRight = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
const ChevronDown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
const TrashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>

/* ── Toggle ────────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: on ? 'var(--accent)' : '#d1d5db',
      position: 'relative', flexShrink: 0, transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 17 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

type InspectorTab = 'layout' | 'content' | 'style' | 'settings' | 'info'

type Props = {
  sections: PageSection[]
  selectedSection: PageSection | null
  globalSettings: GlobalSettings
  onUpdateSections: (next: PageSection[]) => void
  onSelectSection: (id: string | null) => void
}

export default function BuilderRightPanel({
  sections, selectedSection, globalSettings,
  onUpdateSections, onSelectSection,
}: Props) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('layout')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const tabs: { key: InspectorTab; icon: React.ReactNode; title: string }[] = [
    { key: 'layout', icon: <LayoutIcon />, title: 'Layout' },
    { key: 'content', icon: <ContentIcon />, title: 'Content' },
    { key: 'style', icon: <StyleIcon />, title: 'Style' },
    { key: 'settings', icon: <SettingsIcon />, title: 'Settings' },
    { key: 'info', icon: <InfoIcon />, title: 'Info' },
  ]

  if (!selectedSection) {
    return (
      <div className="builder-right-panel">
        <div className="builder-right-tabs">
          {tabs.map(t => (
            <button key={t.key} className="builder-right-tab" title={t.title}>{t.icon}</button>
          ))}
        </div>
        <div className="builder-empty-state">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <CursorIcon />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>No section selected</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#9ca3af', maxWidth: 180 }}>Click a section in the canvas to edit its properties</div>
        </div>
      </div>
    )
  }

  const def = SECTION_REGISTRY[selectedSection.type]

  return (
    <div className="builder-right-panel">
      {/* Tab bar */}
      <div className="builder-right-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`builder-right-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            title={t.title}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Layout tab */}
        {activeTab === 'layout' && (
          <>
            {/* Variant picker */}
            <div className="builder-inspector-section">
              <div className="builder-inspector-header" onClick={() => toggleSection('variant')}>
                <span className="builder-inspector-label">Layout Variant</span>
                {collapsed['variant'] ? <ChevronRight /> : <ChevronDown />}
              </div>
              {!collapsed['variant'] && (
                <div className="builder-inspector-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {def.variants.map(v => (
                      <button
                        key={v.key}
                        onClick={() => onUpdateSections(updateSectionVariant(sections, selectedSection.id, v.key))}
                        style={{
                          padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'var(--font)',
                          border: selectedSection.variant === v.key
                            ? `2px solid ${globalSettings.accentColor}`
                            : '1px solid #e2e2e5',
                          background: selectedSection.variant === v.key
                            ? `${globalSettings.accentColor}10`
                            : '#f9f9fb',
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: selectedSection.variant === v.key ? globalSettings.accentColor : '#374151' }}>{v.label}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="builder-inspector-section">
              <div className="builder-inspector-header" onClick={() => toggleSection('visibility')}>
                <span className="builder-inspector-label">Visibility</span>
                {collapsed['visibility'] ? <ChevronRight /> : <ChevronDown />}
              </div>
              {!collapsed['visibility'] && (
                <div className="builder-inspector-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Visible on page</div>
                      <div style={{ fontSize: 10.5, color: '#9ca3af' }}>Toggle section visibility</div>
                    </div>
                    <Toggle
                      on={selectedSection.visible}
                      onChange={() => onUpdateSections(toggleSectionVisibility(sections, selectedSection.id))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="builder-inspector-section">
              <div className="builder-inspector-header" onClick={() => toggleSection('actions')}>
                <span className="builder-inspector-label">Actions</span>
                {collapsed['actions'] ? <ChevronRight /> : <ChevronDown />}
              </div>
              {!collapsed['actions'] && (
                <div className="builder-inspector-body">
                  <button
                    onClick={() => {
                      onUpdateSections(removeSection(sections, selectedSection.id))
                      onSelectSection(null)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      width: '100%', padding: '8px 0', borderRadius: 8,
                      border: '1.5px solid #ef4444', background: 'transparent',
                      color: '#ef4444', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font)',
                    }}
                  >
                    <TrashIcon /> Remove Section
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Content tab */}
        {activeTab === 'content' && (
          <div className="builder-inspector-section">
            <div className="builder-inspector-header" onClick={() => toggleSection('content')}>
              <span className="builder-inspector-label">{def.label} Content</span>
              {collapsed['content'] ? <ChevronRight /> : <ChevronDown />}
            </div>
            {!collapsed['content'] && (
              <div className="builder-inspector-body">
                <SectionEditorForm
                  section={selectedSection}
                  onChange={(props) => onUpdateSections(updateSectionProps(sections, selectedSection.id, props))}
                />
              </div>
            )}
          </div>
        )}

        {/* Style tab */}
        {activeTab === 'style' && (
          <div className="builder-empty-state">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
              <StyleIcon />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Style</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Custom styling coming soon</div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="builder-empty-state">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
              <SettingsIcon />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Section Settings</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Advanced settings coming soon</div>
          </div>
        )}

        {/* Info tab */}
        {activeTab === 'info' && (
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 12 }}>Section Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9ca3af' }}>Type</span>
                <span style={{ fontWeight: 600, color: '#374151' }}>{def.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9ca3af' }}>Variant</span>
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {def.variants.find(v => v.key === selectedSection.variant)?.label || selectedSection.variant}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9ca3af' }}>Visible</span>
                <span style={{ fontWeight: 600, color: selectedSection.visible ? '#006AFF' : '#ef4444' }}>
                  {selectedSection.visible ? 'Yes' : 'Hidden'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9ca3af' }}>ID</span>
                <span style={{ fontWeight: 500, color: '#6b7280', fontFamily: 'monospace', fontSize: 10.5 }}>{selectedSection.id}</span>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 12px', background: '#f9f9fb', borderRadius: 8, border: '1px solid #f0f0f3' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{def.description}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
