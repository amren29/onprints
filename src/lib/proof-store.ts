import type { ProofVersion, Jobsheet, HistoryEntry } from '@/components/production/types'
import { storeBlobBatch, getBlobBatch } from './proof-blob-store'
import { getOrderById } from './order-store'

const STORAGE_KEY = 'sp.proof-links'

export type ProofLinkRecord = {
  token: string
  cardId: string
  taskName: string
  proofVersion: ProofVersion
  allVersions: ProofVersion[]
  jobsheets: Jobsheet[]
  historyEntries: HistoryEntry[]
}

/* ── Helpers ─────────────────────────────────────── */

function readAll(): ProofLinkRecord[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Check if a string is a large data URL (base64 blob) */
function isDataUrl(s?: string): boolean {
  return !!s && s.startsWith('data:') && s.length > 200
}

/** Generate a stable blob key for a file */
function fileBlobKey(cardId: string, versionId: string, fileIdx: number): string {
  return `proof-file:${cardId}:${versionId}:${fileIdx}`
}

/** Generate a blob key for a signature image */
function sigBlobKey(cardId: string, jobsheetId: string): string {
  return `proof-sig:${cardId}:${jobsheetId}`
}

/** Generate a blob key for an amend attachment */
function amendBlobKey(cardId: string, versionId: string, attIdx: number): string {
  return `proof-amend:${cardId}:${versionId}:${attIdx}`
}

/**
 * Extract large data URLs from records, store them in IndexedDB,
 * and replace with blob reference keys in the records.
 */
function extractAndStoreBlobs(records: ProofLinkRecord[]): ProofLinkRecord[] {
  const blobEntries: { key: string; data: string }[] = []

  const stripped = records.map(r => {
    const cardId = r.cardId

    // Strip file data URLs from proofVersion
    const pv = { ...r.proofVersion }
    pv.files = pv.files.map((f, i) => {
      if (isDataUrl(f.url)) {
        const key = fileBlobKey(cardId, pv.id, i)
        blobEntries.push({ key, data: f.url! })
        return { ...f, url: `idb:${key}` }
      }
      return f
    })
    if (pv.amendAttachments) {
      pv.amendAttachments = pv.amendAttachments.map((a, i) => {
        if (isDataUrl(a.dataUrl)) {
          const key = amendBlobKey(cardId, pv.id, i)
          blobEntries.push({ key, data: a.dataUrl })
          return { ...a, dataUrl: `idb:${key}` }
        }
        return a
      })
    }

    // Strip file data URLs from allVersions
    const allVersions = r.allVersions.map(v => {
      const nv = { ...v }
      nv.files = nv.files.map((f, i) => {
        if (isDataUrl(f.url)) {
          const key = fileBlobKey(cardId, v.id, i)
          blobEntries.push({ key, data: f.url! })
          return { ...f, url: `idb:${key}` }
        }
        return f
      })
      if (nv.amendAttachments) {
        nv.amendAttachments = nv.amendAttachments.map((a, i) => {
          if (isDataUrl(a.dataUrl)) {
            const key = amendBlobKey(cardId, v.id, i)
            blobEntries.push({ key, data: a.dataUrl })
            return { ...a, dataUrl: `idb:${key}` }
          }
          return a
        })
      }
      return nv
    })

    // Strip signature images from jobsheets
    const jobsheets = r.jobsheets.map(js => {
      if (isDataUrl(js.signatureImage)) {
        const key = sigBlobKey(cardId, js.id)
        blobEntries.push({ key, data: js.signatureImage! })
        return { ...js, signatureImage: `idb:${key}` }
      }
      // Strip file URLs in jobsheet files too
      const files = js.files.map((f, i) => {
        if (isDataUrl(f.url)) {
          const vId = js.versionId || js.id
          const key = fileBlobKey(cardId, vId, i)
          blobEntries.push({ key, data: f.url! })
          return { ...f, url: `idb:${key}` }
        }
        return f
      })
      return { ...js, files }
    })

    return { ...r, proofVersion: pv, allVersions, jobsheets }
  })

  // Fire-and-forget blob storage to IndexedDB
  if (blobEntries.length > 0) {
    // Deduplicate by key
    const seen = new Set<string>()
    const unique = blobEntries.filter(e => {
      if (seen.has(e.key)) return false
      seen.add(e.key)
      return true
    })
    storeBlobBatch(unique).catch(() => {})
  }

  return stripped
}

function writeAll(records: ProofLinkRecord[]) {
  try {
    // Extract blobs and store in IndexedDB, save metadata to localStorage
    const stripped = extractAndStoreBlobs(records)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Last resort: try saving with minimal data
      try {
        const minimal = records.map(r => ({
          ...r,
          proofVersion: { ...r.proofVersion, files: r.proofVersion.files.map(f => ({ name: f.name, url: '' })), amendAttachments: undefined },
          allVersions: r.allVersions.map(v => ({ ...v, files: v.files.map(f => ({ name: f.name, url: '' })), amendAttachments: undefined })),
          jobsheets: r.jobsheets.map(js => ({ ...js, signatureImage: undefined, files: js.files.map(f => ({ name: f.name, url: '' })) })),
        }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
      } catch {
        // Cannot save at all — skip silently
        console.warn('proof-store: unable to save — localStorage full')
      }
    }
  }
}

/* ── Hydrate records with blob data from IndexedDB ── */

/** Resolve all idb: references in a record with actual data from IndexedDB */
export async function hydrateRecord(record: ProofLinkRecord): Promise<ProofLinkRecord> {
  // Collect all idb: keys
  const keys: string[] = []

  const collectFromFiles = (files: { name: string; url?: string }[]) => {
    for (const f of files) {
      if (f.url?.startsWith('idb:')) keys.push(f.url.slice(4))
    }
  }
  const collectFromVersion = (v: ProofVersion) => {
    collectFromFiles(v.files)
    if (v.amendAttachments) {
      for (const a of v.amendAttachments) {
        if (a.dataUrl?.startsWith('idb:')) keys.push(a.dataUrl.slice(4))
      }
    }
  }

  collectFromVersion(record.proofVersion)
  for (const v of record.allVersions) collectFromVersion(v)
  for (const js of record.jobsheets) {
    if (js.signatureImage?.startsWith('idb:')) keys.push(js.signatureImage.slice(4))
    collectFromFiles(js.files)
  }

  if (keys.length === 0) return record

  const blobs = await getBlobBatch(keys)

  const resolveUrl = (url?: string): string | undefined => {
    if (!url?.startsWith('idb:')) return url
    return blobs[url.slice(4)] || url
  }

  const resolveFiles = (files: { name: string; url?: string }[]) =>
    files.map(f => ({ ...f, url: resolveUrl(f.url) }))

  const resolveVersion = (v: ProofVersion): ProofVersion => ({
    ...v,
    files: resolveFiles(v.files),
    amendAttachments: v.amendAttachments?.map(a => ({
      ...a,
      dataUrl: resolveUrl(a.dataUrl) || a.dataUrl,
    })),
  })

  return {
    ...record,
    proofVersion: resolveVersion(record.proofVersion),
    allVersions: record.allVersions.map(resolveVersion),
    jobsheets: record.jobsheets.map(js => ({
      ...js,
      signatureImage: resolveUrl(js.signatureImage),
      files: resolveFiles(js.files),
    })),
  }
}

/* ── Public API ──────────────────────────────────── */

/** Upsert a proof link record by token */
export function saveProofLink(record: ProofLinkRecord) {
  const all = readAll()
  const idx = all.findIndex(r => r.token === record.token)
  if (idx >= 0) {
    all[idx] = record
  } else {
    all.push(record)
  }
  writeAll(all)
}

/** Sync all proof-link records for a card when versions/jobsheets/history change */
export function syncCardProofLinks(
  cardId: string,
  taskName: string,
  allVersions: ProofVersion[],
  jobsheets: Jobsheet[],
  historyEntries: HistoryEntry[],
) {
  const all = readAll()
  const updated = all.map(r => {
    if (r.cardId !== cardId) return r
    // Find the matching version for this token's proof link
    const matchingVer = allVersions.find(v => v.proofLink.includes(r.token))
    return {
      ...r,
      taskName,
      proofVersion: matchingVer ?? r.proofVersion,
      allVersions,
      jobsheets,
      historyEntries,
    }
  })
  writeAll(updated)
}

/** Lookup a proof link by token — used on the public proofing page */
export function getProofByToken(token: string): ProofLinkRecord | null {
  return readAll().find(r => r.token === token) ?? null
}

/** Async version that hydrates blob data from IndexedDB */
export async function getProofByTokenAsync(token: string): Promise<ProofLinkRecord | null> {
  const record = readAll().find(r => r.token === token) ?? null
  if (!record) return null
  return hydrateRecord(record)
}

/** Update the proof version status for a given token (client actions) */
export function updateProofVersionStatus(
  token: string,
  status: ProofVersion['status'],
  extra?: { amendRequest?: string; amendAttachments?: { name: string; dataUrl: string; type: string }[] },
) {
  const all = readAll()
  const record = all.find(r => r.token === token)
  if (!record) return

  // Update this token's version
  record.proofVersion = { ...record.proofVersion, status, ...extra }

  // Also update the version in allVersions
  record.allVersions = record.allVersions.map(v =>
    v.id === record.proofVersion.id ? { ...v, status, ...extra } : v
  )

  // Sync all records for the same card
  const updated = all.map(r => {
    if (r.cardId !== record.cardId) return r
    if (r.token === token) return record
    return {
      ...r,
      allVersions: record.allVersions,
      jobsheets: record.jobsheets,
      historyEntries: record.historyEntries,
    }
  })
  writeAll(updated)

  // Sync card-level proof status + auto-move column (only if order is Confirmed)
  const orderForCard = getOrderById(record.cardId)
  const canMove = !orderForCard || orderForCard.status !== 'Pending'
  if (status === 'APPROVED') {
    setProdCardState(record.cardId, { proofStatus: 'approved', ...(canMove ? { columnSystemKey: 'ready_for_print' } : {}) })
  } else if (status === 'AMEND_REQUESTED') {
    setProdCardState(record.cardId, { proofStatus: 'changes_requested', ...(canMove ? { columnSystemKey: 'refine' } : {}) })
  }
}

/** Add a jobsheet to a proof record (on approval) */
export function addJobsheetToProof(token: string, jobsheet: Jobsheet) {
  const all = readAll()
  const record = all.find(r => r.token === token)
  if (!record) return

  record.jobsheets = [...record.jobsheets, jobsheet]

  // Sync to all records for the same card
  const updated = all.map(r => {
    if (r.cardId !== record.cardId) return r
    return { ...r, jobsheets: record.jobsheets }
  })
  writeAll(updated)
}

/** Add a history entry to a proof record */
export function addHistoryToProof(token: string, entry: HistoryEntry) {
  const all = readAll()
  const record = all.find(r => r.token === token)
  if (!record) return

  record.historyEntries = [...record.historyEntries, entry]

  // Sync to all records for the same card
  const updated = all.map(r => {
    if (r.cardId !== record.cardId) return r
    return { ...r, historyEntries: record.historyEntries }
  })
  writeAll(updated)
}

// ── Production card state (proofStatus + column) ──────────────────────────

const CARD_STATE_KEY = 'sp.prod-card-state'

type ProdCardState = {
  proofStatus?: string
  columnSystemKey?: string
  orderAssets?: import('@/components/production/types').OrderAsset[]
}

function readCardStates(): Record<string, ProdCardState> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(CARD_STATE_KEY) ?? '{}') } catch { return {} }
}

export function getProdCardState(cardId: string): ProdCardState | null {
  return readCardStates()[cardId] ?? null
}

export function setProdCardState(cardId: string, update: Partial<ProdCardState>) {
  const all = readCardStates()
  all[cardId] = { ...all[cardId], ...update }
  localStorage.setItem(CARD_STATE_KEY, JSON.stringify(all))
}

/** Get all persisted proof data for a card (used by data.ts merge) */
export function getCardProofData(cardId: string): {
  proofVersions: ProofVersion[]
  jobsheets: Jobsheet[]
  historyEntries: HistoryEntry[]
} | null {
  const records = readAll().filter(r => r.cardId === cardId)
  if (records.length === 0) return null
  // Use the most recently updated record (last in allVersions list)
  const latest = records.reduce((best, r) =>
    r.allVersions.length >= best.allVersions.length ? r : best
  , records[0])
  return {
    proofVersions: latest.allVersions,
    jobsheets: latest.jobsheets,
    historyEntries: latest.historyEntries,
  }
}

/** Async version that hydrates blob data (idb: refs → actual data URLs) */
export async function getCardProofDataAsync(cardId: string): Promise<{
  proofVersions: ProofVersion[]
  jobsheets: Jobsheet[]
  historyEntries: HistoryEntry[]
} | null> {
  const records = readAll().filter(r => r.cardId === cardId)
  if (records.length === 0) return null
  const latest = records.reduce((best, r) =>
    r.allVersions.length >= best.allVersions.length ? r : best
  , records[0])
  const hydrated = await hydrateRecord(latest)
  return {
    proofVersions: hydrated.allVersions,
    jobsheets: hydrated.jobsheets,
    historyEntries: hydrated.historyEntries,
  }
}
