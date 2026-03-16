'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import '@/app/builder.css'
import {
  type PageSection, type GlobalSettings, type SectionType, type StorePageId,
  addSection, removeSection, moveSection, toggleSectionVisibility,
  updateSectionPropByPath,
  DEFAULT_GLOBAL, PAGE_LABELS, PAGE_ROUTES, PAGE_IDS,
  DEFAULT_PAGE_SECTIONS,
} from '@/lib/store-builder'
import { getStorePages, saveStorePage as dbSaveStorePage, saveStoreGlobals } from '@/lib/db/storefront'
import { useShop } from '@/providers/shop-provider'
import BuilderLeftPanel from '@/components/store-builder/BuilderLeftPanel'
import BuilderRightPanel from '@/components/store-builder/BuilderRightPanel'
import { PageRenderer } from '@/components/store/sections'

export default function EditorPage() {
  const { shopId } = useShop()
  const [activePageId, setActivePageId] = useState<StorePageId>('homepage')
  const [pages, setPages] = useState<Record<StorePageId, PageSection[]>>({} as any)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Load data from DB
  useEffect(() => {
    if (!shopId) return
    let cancelled = false
    ;(async () => {
      try {
        const dbPages = await getStorePages(shopId)
        if (cancelled) return

        // Build pages map from DB rows
        const pagesMap = {} as Record<StorePageId, PageSection[]>
        let globals = { ...DEFAULT_GLOBAL }

        // Fill defaults first
        for (const id of PAGE_IDS) {
          pagesMap[id] = DEFAULT_PAGE_SECTIONS[id]()
        }

        // Override with DB data
        for (const row of dbPages) {
          const pageId = row.page_id as StorePageId
          if (PAGE_IDS.includes(pageId)) {
            pagesMap[pageId] = row.sections as PageSection[]
          }
          // Use globals from any page (they're synced across all)
          if (row.globals && Object.keys(row.globals).length > 0) {
            globals = { ...DEFAULT_GLOBAL, ...(row.globals as Partial<GlobalSettings>) }
          }
        }

        setPages(pagesMap)
        setGlobalSettings(globals)
        setReady(true)
      } catch (err) {
        console.error('Failed to load store pages:', err)
        // Fall back to defaults
        const pagesMap = {} as Record<StorePageId, PageSection[]>
        for (const id of PAGE_IDS) {
          pagesMap[id] = DEFAULT_PAGE_SECTIONS[id]()
        }
        setPages(pagesMap)
        setGlobalSettings(DEFAULT_GLOBAL)
        setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [shopId])

  const sections = pages[activePageId] || []

  // Save helper — persist to DB
  const persist = useCallback(async (nextPages: Record<StorePageId, PageSection[]>, nextGlobal?: GlobalSettings) => {
    if (!shopId) return
    try {
      // Save the active page sections + globals
      const g = nextGlobal || globalSettings
      await dbSaveStorePage(shopId, activePageId, nextPages[activePageId], g as unknown as Record<string, unknown>)
      // If globals changed, sync to all pages
      if (nextGlobal) {
        await saveStoreGlobals(shopId, nextGlobal as unknown as Record<string, unknown>)
      }
    } catch (err) {
      console.error('Failed to save store page:', err)
    }
  }, [shopId, activePageId, globalSettings])

  const updateSections = useCallback((next: PageSection[]) => {
    setPages(prev => {
      const updated = { ...prev, [activePageId]: next }
      persist(updated)
      return updated
    })
  }, [activePageId, persist])

  // Section handlers
  const handleAddSection = (type: SectionType) => {
    updateSections(addSection(sections, type, selectedId || undefined))
  }
  const handleRemove = (id: string) => {
    if (selectedId === id) setSelectedId(null)
    updateSections(removeSection(sections, id))
  }
  const handleMove = (id: string, dir: 'up' | 'down') => updateSections(moveSection(sections, id, dir))
  const handleToggle = (id: string) => updateSections(toggleSectionVisibility(sections, id))
  const handleReorder = (next: PageSection[]) => updateSections(next)

  const handleInlineEdit = useCallback((sectionId: string, propPath: string, value: string) => {
    updateSections(updateSectionPropByPath(sections, sectionId, propPath, value))
  }, [sections, updateSections])

  const handlePageSwitch = (pageId: StorePageId) => {
    setSelectedId(null)
    setActivePageId(pageId)
  }

  const selectedSection = selectedId ? sections.find(s => s.id === selectedId) || null : null

  if (!ready) return null

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f0f3', overflow: 'hidden' }}>
      {/* Left panel -- toolbar + sections/pages */}
      <BuilderLeftPanel
        sections={sections}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={handleMove}
        onToggle={handleToggle}
        onRemove={handleRemove}
        onReorder={handleReorder}
        onAddSection={handleAddSection}
        onOpenSettings={() => {}}
        activePageId={activePageId}
        onPageSwitch={handlePageSwitch}
      />

      {/* Center -- live preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/storefront" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
              &larr; Back
            </Link>
            <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {PAGE_LABELS[activePageId]}
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {sections.filter(s => s.visible).length} sections
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href={PAGE_ROUTES[activePageId]}
              target="_blank"
              style={{
                fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                border: '1px solid #e5e7eb', background: '#fff', color: '#374151',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Preview
            </Link>
          </div>
        </div>

        {/* Preview area */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f7' }} onClick={() => setSelectedId(null)}>
          <div style={{
            maxWidth: 1200, margin: '24px auto', background: '#fff',
            borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
            minHeight: 600,
          }}>
            <div className="store-root">
              <PageRenderer
                sections={sections}
                editMode
                selectedId={selectedId}
                onSelect={setSelectedId}
                onInlineEdit={handleInlineEdit}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel -- section inspector */}
      <BuilderRightPanel
        sections={sections}
        selectedSection={selectedSection}
        globalSettings={globalSettings}
        onUpdateSections={updateSections}
        onSelectSection={setSelectedId}
      />
    </div>
  )
}
