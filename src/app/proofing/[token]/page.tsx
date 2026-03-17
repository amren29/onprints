'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
// TODO [Batch G]: Replace proof-store with Supabase
import {
  getProofByToken,
  getProofByTokenAsync,
  updateProofVersionStatus,
  addJobsheetToProof,
  addHistoryToProof,
  hydrateRecord,
  type ProofLinkRecord,
} from '@/lib/proof-store'
import { PROOF_STATUS_BADGE } from '@/components/production/utils'
import type { Jobsheet, HistoryEntry } from '@/components/production/types'
// TODO [Batch G]: Replace notification-store with Supabase
import { addNotification } from '@/lib/notification-store'

/* ── Signature hash generator ───────────────────── */
function generateSignatureHash(name: string, email: string): string {
  const ts = Date.now()
  const input = `${name}|${email}|${ts}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0
  }
  return `SIG-${(Math.abs(hash) >>> 0).toString(36)}-${ts.toString(36)}`
}

/* ── Icons ──────────────────────────────────────── */
const CheckCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 15.5 9.5"/>
  </svg>
)
const AlertCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const InfoCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)
const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const PaperclipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
)
const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
)

/* ── Main component ─────────────────────────────── */
export default function ProofingPage() {
  const params = useParams()
  const token = params.token as string

  const [record, setRecord] = useState<ProofLinkRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  /* File review checkboxes */
  const [checkedFiles, setCheckedFiles] = useState<Set<number>>(new Set())

  /* Amend request form */
  const [showAmendForm, setShowAmendForm] = useState(false)
  const [amendComment, setAmendComment] = useState('')
  const [amendError, setAmendError] = useState('')
  const [amendAttachments, setAmendAttachments] = useState<{ name: string; dataUrl: string; type: string }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const amendFileRef = useRef<HTMLInputElement>(null)

  /* Approve form */
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [approveName, setApproveName] = useState('')
  const [approveEmail, setApproveEmail] = useState('')
  const [approveConfirmed, setApproveConfirmed] = useState(false)
  const [approveError, setApproveError] = useState('')

  /* Signature canvas */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  /* Preview overlay */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')

  /* Override global overflow:hidden */
  useEffect(() => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.documentElement.style.height = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.height = ''
      document.body.style.height = ''
    }
  }, [])

  /* Load proof data (hydrate blobs from IndexedDB) */
  useEffect(() => {
    getProofByTokenAsync(token).then(data => {
      if (data) setRecord(data)
      else setNotFound(true)
      setLoading(false)
    })
  }, [token])

  const refreshRecord = useCallback(() => {
    const raw = getProofByToken(token)
    if (raw) {
      setRecord(raw)
      // Hydrate blobs async
      hydrateRecord(raw).then(hydrated => setRecord(hydrated))
    }
  }, [token])

  /* Escape key */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewUrl) { setPreviewUrl(null); setPreviewName('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewUrl])

  /* Canvas setup when approve form opens */
  useEffect(() => {
    if (!showApproveForm) return
    const canvas = canvasRef.current
    if (!canvas) return
    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = 160 * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = 'var(--text-primary, #0f172a)'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    requestAnimationFrame(() => requestAnimationFrame(setup))
  }, [showApproveForm])

  /* ── File review ── */
  function toggleFileCheck(idx: number) {
    setCheckedFiles(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  /* ── Canvas drawing ── */
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Re-apply style in case it was lost
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    ctx.strokeStyle = isDark ? '#ebebeb' : '#0f172a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawingRef.current = true
  }

  function doDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function endDraw() {
    if (drawingRef.current) {
      drawingRef.current = false
      setHasSignature(true)
    }
  }

  /* Global mouseup/touchend to stop drawing outside canvas */
  useEffect(() => {
    const stop = () => {
      if (drawingRef.current) {
        drawingRef.current = false
        setHasSignature(true)
      }
    }
    document.addEventListener('mouseup', stop)
    document.addEventListener('touchend', stop)
    return () => {
      document.removeEventListener('mouseup', stop)
      document.removeEventListener('touchend', stop)
    }
  }, [])

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setHasSignature(false)
  }

  /* ── Attachment handling ── */
  function handleAttachFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(file => {
      if (amendAttachments.length >= 3) return
      if (file.size > 5 * 1024 * 1024) return
      const reader = new FileReader()
      reader.onload = () => {
        setAmendAttachments(prev => {
          if (prev.length >= 3) return prev
          return [...prev, {
            name: file.name,
            dataUrl: reader.result as string,
            type: file.type.startsWith('image/') ? 'image' : 'file',
          }]
        })
      }
      reader.readAsDataURL(file)
    })
  }

  function removeAttachment(idx: number) {
    setAmendAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  /* ── Handlers ── */

  function handleRequestChanges() {
    if (!record) return
    const ver = record.proofVersion
    if (checkedFiles.size < ver.files.length) {
      setAmendError('Please review all proof files before submitting feedback.')
      return
    }
    if (amendComment.trim().length < 10) {
      setAmendError('Please provide at least 10 characters of feedback.')
      return
    }
    setAmendError('')
    updateProofVersionStatus(token, 'AMEND_REQUESTED', {
      amendRequest: amendComment.trim(),
      amendAttachments: amendAttachments.length > 0 ? amendAttachments : undefined,
    })
    const entry: HistoryEntry = {
      id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: `Client requested changes on v${ver.versionNo}`,
      tone: 'warning',
      createdAt: new Date().toISOString(),
    }
    addHistoryToProof(token, entry)
    addNotification({
      type: 'warning',
      title: `Changes requested on ${record.taskName}`,
      message: `Client requested changes on proof v${ver.versionNo}. Review their feedback.`,
      link: '/production',
    })
    refreshRecord()
    setShowAmendForm(false)
    setAmendComment('')
    setAmendAttachments([])
  }

  function handleApprove() {
    if (!record) return
    const ver = record.proofVersion
    if (checkedFiles.size < ver.files.length) {
      setApproveError('Please review all proof files before approving.')
      return
    }
    if (!approveName.trim()) { setApproveError('Name is required.'); return }
    if (!approveEmail.trim() || !approveEmail.includes('@')) { setApproveError('Valid email is required.'); return }
    if (!hasSignature) { setApproveError('Please draw your signature above.'); return }
    if (!approveConfirmed) { setApproveError('Please confirm the approval checkbox.'); return }
    setApproveError('')

    const sigHash = generateSignatureHash(approveName.trim(), approveEmail.trim())
    const signatureImage = canvasRef.current?.toDataURL('image/png') ?? ''
    const now = new Date().toISOString()

    updateProofVersionStatus(token, 'APPROVED')

    const jobsheet: Jobsheet = {
      id: `JS-${Date.now()}`,
      orderId: record.cardId,
      versionId: ver.id,
      approvedByName: approveName.trim(),
      approvedByEmail: approveEmail.trim(),
      signatureHash: sigHash,
      signatureImage,
      approvedAt: now,
      files: ver.files,
    }
    addJobsheetToProof(token, jobsheet)

    const entry: HistoryEntry = {
      id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: `Client approved v${ver.versionNo} — Jobsheet ${jobsheet.id} created`,
      tone: 'success',
      createdAt: now,
    }
    addHistoryToProof(token, entry)
    addNotification({
      type: 'success',
      title: `Proof approved for ${record.taskName}`,
      message: `Client approved proof v${ver.versionNo}. Jobsheet ${jobsheet.id} has been generated.`,
      link: '/production',
    })
    refreshRecord()
    setShowApproveForm(false)
    setApproveName('')
    setApproveEmail('')
    setApproveConfirmed(false)
    setHasSignature(false)
  }

  /* ── Render states ── */

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            Loading proof...
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Proof Not Found
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
              This proof link is invalid or has expired. Please contact your print provider for an updated link.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ver = record!.proofVersion
  const badge = PROOF_STATUS_BADGE[ver.status] ?? PROOF_STATUS_BADGE.SENT
  const isSent = ver.status === 'SENT'
  const isApproved = ver.status === 'APPROVED'
  const isAmendRequested = ver.status === 'AMEND_REQUESTED'
  const isAmendDone = ver.status === 'AMEND_DONE'
  const isBlob = (url?: string) => url?.startsWith('blob:')
  const allFilesReviewed = checkedFiles.size >= ver.files.length
  const reviewCount = checkedFiles.size
  const totalFiles = ver.files.length

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={S.brandIcon}>OP</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>OnPrints</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Digital Proof Review</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{record!.cardId}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 12,
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            }}>
              v{ver.versionNo} &middot; {badge.label}
            </span>
          </div>
        </div>

        {/* ── Status banner: APPROVED ── */}
        {isApproved && (
          <div style={{ ...S.statusBanner, background: 'var(--info-bg)', borderColor: 'rgba(0,106,255,0.2)' }}>
            <CheckCircle />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent, #006AFF)' }}>Proof Approved</div>
              <div style={{ fontSize: 13, color: '#1d4ed8', marginTop: 2 }}>
                This proof has been digitally approved. A production jobsheet has been created.
              </div>
            </div>
          </div>
        )}

        {/* ── Status banner: AMEND_REQUESTED ── */}
        {isAmendRequested && (
          <div style={{ ...S.statusBanner, background: 'var(--warning-bg)', borderColor: 'var(--warning-border)' }}>
            <AlertCircle />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e' }}>Changes Requested</div>
              <div style={{ fontSize: 13, color: 'var(--warning)', marginTop: 2 }}>
                Your feedback has been submitted. The design team will prepare an updated proof.
              </div>
              {ver.amendRequest && (
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid #fed7aa',
                  fontSize: 13, color: 'var(--warning)', lineHeight: 1.5,
                }}>
                  &ldquo;{ver.amendRequest}&rdquo;
                </div>
              )}
              {ver.amendAttachments && ver.amendAttachments.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Attached References
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ver.amendAttachments.map((att, i) => (
                      <div key={i} style={{
                        width: 88, padding: 6, borderRadius: 6,
                        border: '1px solid #fed7aa', background: 'rgba(245,158,11,0.08)', textAlign: 'center',
                      }}>
                        {att.type === 'image' ? (
                          <img src={att.dataUrl} alt={att.name} style={{ width: '100%', height: 52, objectFit: 'cover', borderRadius: 4 }} />
                        ) : (
                          <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                            <FileIcon />
                          </div>
                        )}
                        <div style={{ fontSize: 9, marginTop: 4, color: 'var(--warning)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Status banner: AMEND_DONE ── */}
        {isAmendDone && (
          <div style={{ ...S.statusBanner, background: 'var(--info-bg)', borderColor: 'rgba(0,106,255,0.2)' }}>
            <InfoCircle />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent, #006AFF)' }}>New Version Being Prepared</div>
              <div style={{ fontSize: 13, color: 'var(--accent, #006AFF)', marginTop: 2 }}>
                An updated proof is being prepared. You will receive a new proof link when it&apos;s ready.
              </div>
            </div>
          </div>
        )}

        {/* ── File preview section with review checkboxes ── */}
        <div style={S.section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ ...S.sectionLabel, marginBottom: 0 }}>Proof Files</div>
            {isSent && totalFiles > 0 && (
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: allFilesReviewed ? '#006AFF' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.2s ease',
              }}>
                {allFilesReviewed && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {reviewCount}/{totalFiles} reviewed
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {ver.files.map((f, i) => {
              const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name) || f.url?.startsWith('data:image/')
              const isPdf = /\.pdf$/i.test(f.name)
              const isChecked = checkedFiles.has(i)
              return (
                <div
                  key={i}
                  style={{
                    ...S.fileCard,
                    borderColor: isChecked ? '#006AFF' : 'var(--border-strong)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: isChecked ? '0 0 0 1px #006AFF' : 'none',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => {
                        if (f.url) { setPreviewUrl(f.url); setPreviewName(f.name) }
                      }}
                      style={{
                        width: '100%', height: 130, borderRadius: 6, overflow: 'hidden',
                        background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: f.url ? 'pointer' : 'default',
                      }}
                    >
                      {isImage && f.url ? (
                        <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <FileIcon />
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                            {isPdf ? 'PDF' : f.name.split('.').pop()?.toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Review checkbox overlay */}
                    {isSent && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFileCheck(i) }}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 28, height: 28, borderRadius: 14,
                          border: isChecked ? 'none' : '2px solid rgba(255,255,255,0.8)',
                          background: isChecked ? '#006AFF' : 'rgba(0,0,0,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', padding: 0,
                          transition: 'all 0.2s ease',
                          boxShadow: isChecked
                            ? '0 2px 8px rgba(0,106,255,0.4)'
                            : '0 1px 4px rgba(0,0,0,0.15)',
                        }}
                        title={isChecked ? 'Reviewed' : 'Mark as reviewed'}
                      >
                        {isChecked ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : null}
                      </button>
                    )}
                  </div>

                  {/* File name + download */}
                  <div style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                    marginTop: 8, wordBreak: 'break-all',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {isChecked && isSent && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                    {f.url && (
                      <a
                        href={f.url}
                        download={f.name}
                        onClick={e => { e.stopPropagation(); e.preventDefault(); const a = document.createElement('a'); a.href = f.url!; a.download = f.name; document.body.appendChild(a); a.click(); document.body.removeChild(a) }}
                        style={{ flexShrink: 0, color: '#006AFF', display: 'flex', alignItems: 'center', padding: 2 }}
                        title="Download"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Review progress bar */}
          {isSent && totalFiles > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: 'var(--border)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: allFilesReviewed ? '#006AFF' : 'var(--text-muted)',
                  width: `${(reviewCount / totalFiles) * 100}%`,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
              {!allFilesReviewed && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Click the circle on each file to confirm you&apos;ve reviewed it
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Details card ── */}
        <div style={S.section}>
          <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Details</div>
          <div style={S.detailsGrid}>
            <div style={S.detailItem}>
              <div style={S.detailLabel}>Order</div>
              <div style={S.detailValue}>{record!.cardId}</div>
            </div>
            <div style={S.detailItem}>
              <div style={S.detailLabel}>Task</div>
              <div style={S.detailValue}>{record!.taskName}</div>
            </div>
            <div style={S.detailItem}>
              <div style={S.detailLabel}>Version</div>
              <div style={S.detailValue}>v{ver.versionNo}</div>
            </div>
            <div style={S.detailItem}>
              <div style={S.detailLabel}>Files</div>
              <div style={S.detailValue}>{ver.files.length} file{ver.files.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={S.detailItem}>
              <div style={S.detailLabel}>Sent</div>
              <div style={S.detailValue}>
                {new Date(ver.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            {ver.description && (
              <div style={{ ...S.detailItem, gridColumn: '1 / -1' }}>
                <div style={S.detailLabel}>Description</div>
                <div style={{ ...S.detailValue, fontStyle: 'italic' }}>{ver.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Action buttons (only when SENT) ── */}
        {isSent && !showAmendForm && !showApproveForm && (
          <div style={S.section}>
            <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Your Response</div>

            {!allFilesReviewed && (
              <div style={{
                padding: '12px 16px', borderRadius: 8, marginBottom: 14,
                background: 'var(--info-bg)', border: '1px solid #bfdbfe',
                fontSize: 13, color: 'var(--accent, #006AFF)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Please review all {totalFiles} proof file{totalFiles !== 1 ? 's' : ''} above before responding
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAmendForm(true)}
                disabled={!allFilesReviewed}
                style={{
                  ...S.btnAmend,
                  opacity: allFilesReviewed ? 1 : 0.45,
                  cursor: allFilesReviewed ? 'pointer' : 'not-allowed',
                }}
              >
                Request Changes
              </button>
              <button
                onClick={() => setShowApproveForm(true)}
                disabled={!allFilesReviewed}
                style={{
                  ...S.btnApprove,
                  opacity: allFilesReviewed ? 1 : 0.45,
                  cursor: allFilesReviewed ? 'pointer' : 'not-allowed',
                }}
              >
                Approve Proof
              </button>
            </div>
          </div>
        )}

        {/* ── Amend form ── */}
        {isSent && showAmendForm && (
          <div style={S.section}>
            <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Request Changes</div>
            <div style={S.formCard}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                Please describe the changes you&apos;d like made to this proof. Be as specific as possible.
              </div>

              <textarea
                value={amendComment}
                onChange={e => { setAmendComment(e.target.value); setAmendError('') }}
                placeholder="Describe the changes you need..."
                rows={5}
                style={S.textarea}
                autoFocus
              />

              {/* Attachment zone */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PaperclipIcon />
                  Attachments
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
                </div>

                {amendAttachments.length < 3 && (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); handleAttachFiles(e.dataTransfer.files) }}
                    onClick={() => amendFileRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? '#006AFF' : 'var(--border-strong)'}`,
                      borderRadius: 10, padding: '20px 24px',
                      textAlign: 'center', cursor: 'pointer',
                      background: isDragging ? 'rgba(0,106,255,0.06)' : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = '#006AFF40' }}
                    onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  >
                    <div style={{ color: isDragging ? '#006AFF' : 'var(--text-muted)', marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
                      <ImageIcon />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isDragging ? '#006AFF' : 'var(--text-secondary)' }}>
                      Drop files here or click to browse
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Images or documents &middot; Max 5MB &middot; Up to 3 files
                    </div>
                  </div>
                )}

                <input
                  ref={amendFileRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => { handleAttachFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* Attachment previews */}
              {amendAttachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  {amendAttachments.map((att, i) => (
                    <div key={i} style={{
                      position: 'relative', width: 100, padding: 8, borderRadius: 8,
                      border: '1px solid var(--border-strong)', background: 'var(--bg-card)',
                      textAlign: 'center',
                    }}>
                      {att.type === 'image' ? (
                        <img src={att.dataUrl} alt={att.name} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <div style={{ height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 4 }}>
                          <FileIcon />
                          <span style={{ fontSize: 9 }}>{att.name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                      <div style={{
                        fontSize: 10, marginTop: 6, color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}>
                        {att.name}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeAttachment(i) }}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 20, height: 20, borderRadius: 10,
                          background: 'var(--negative)', color: 'white', border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', padding: 0,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {amendError && <div style={S.error}>{amendError}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleRequestChanges} style={S.btnAmend}>
                  Submit Feedback
                </button>
                <button onClick={() => { setShowAmendForm(false); setAmendComment(''); setAmendError(''); setAmendAttachments([]) }} style={S.btnCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Approve form ── */}
        {isSent && showApproveForm && (
          <div style={S.section}>
            <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Approve Proof</div>
            <div style={S.formCard}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                By approving, you confirm this proof is ready for production. A digital signature will be generated.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={S.inputLabel}>Full Name *</label>
                  <input
                    value={approveName}
                    onChange={e => { setApproveName(e.target.value); setApproveError('') }}
                    placeholder="Your full name"
                    style={S.input}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={S.inputLabel}>Email Address *</label>
                  <input
                    value={approveEmail}
                    onChange={e => { setApproveEmail(e.target.value); setApproveError('') }}
                    placeholder="your@email.com"
                    type="email"
                    style={S.input}
                  />
                </div>

                {/* ── Digital signature pad ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...S.inputLabel, marginBottom: 0 }}>Digital Signature *</label>
                    {hasSignature && (
                      <button
                        onClick={clearSignature}
                        style={{
                          fontSize: 12, fontWeight: 500, color: 'var(--negative)',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          padding: '2px 8px', borderRadius: 4,
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div
                    ref={canvasContainerRef}
                    style={{
                      position: 'relative', borderRadius: 8,
                      border: `1.5px solid ${hasSignature ? '#006AFF' : 'var(--border-strong)'}`,
                      overflow: 'hidden',
                      background: 'var(--bg-card)',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      style={{
                        width: '100%', height: 160, display: 'block',
                        cursor: 'crosshair',
                        touchAction: 'none',
                      }}
                      onMouseDown={startDraw}
                      onMouseMove={doDraw}
                      onMouseUp={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={doDraw}
                      onTouchEnd={endDraw}
                    />
                    {/* Placeholder hint */}
                    {!hasSignature && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none',
                        color: 'var(--text-muted)', fontSize: 14,
                      }}>
                        Draw your signature here
                      </div>
                    )}
                    {/* Signature line */}
                    <div style={{
                      position: 'absolute', bottom: 32, left: 24, right: 24,
                      height: 1, background: 'var(--border)',
                      pointerEvents: 'none', opacity: 0.6,
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 14, left: 24,
                      fontSize: 9, color: 'var(--text-muted)',
                      pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.08em',
                      fontWeight: 600,
                    }}>
                      Signature
                    </div>
                  </div>
                </div>

                <label style={S.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={approveConfirmed}
                    onChange={e => { setApproveConfirmed(e.target.checked); setApproveError('') }}
                    style={{ width: 16, height: 16, accentColor: '#006AFF', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    I confirm that I have reviewed this proof and approve it for production.
                    I understand this cannot be undone.
                  </span>
                </label>
              </div>

              {approveError && <div style={S.error}>{approveError}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleApprove} style={S.btnApprove}>
                  Approve &amp; Sign
                </button>
                <button onClick={() => {
                  setShowApproveForm(false); setApproveName(''); setApproveEmail('')
                  setApproveConfirmed(false); setApproveError(''); setHasSignature(false)
                }} style={S.btnCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Approved: Approval Details ── */}
        {isApproved && record!.jobsheets.length > 0 && (() => {
          const js = record!.jobsheets[record!.jobsheets.length - 1]
          return (
            <div style={S.section}>
              <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Approval Details</div>
              <div style={S.detailsGrid}>
                <div style={S.detailItem}>
                  <div style={S.detailLabel}>Approved By</div>
                  <div style={S.detailValue}>{js.approvedByName}</div>
                </div>
                <div style={S.detailItem}>
                  <div style={S.detailLabel}>Email</div>
                  <div style={S.detailValue}>{js.approvedByEmail}</div>
                </div>
                <div style={S.detailItem}>
                  <div style={S.detailLabel}>Approved At</div>
                  <div style={S.detailValue}>
                    {new Date(js.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={S.detailItem}>
                  <div style={S.detailLabel}>Signature ID</div>
                  <div style={{ ...S.detailValue, fontFamily: 'monospace', fontSize: 11 }}>{js.signatureHash}</div>
                </div>
                {js.signatureImage && (
                  <div style={{ ...S.detailItem, gridColumn: '1 / -1' }}>
                    <div style={S.detailLabel}>Digital Signature</div>
                    <div style={{
                      marginTop: 6, padding: 16, borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg-card)',
                      display: 'flex', justifyContent: 'center',
                    }}>
                      <img src={js.signatureImage} alt="Digital Signature" style={{ maxWidth: '100%', maxHeight: 120 }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Footer ── */}
        <div style={S.footer}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
            <ShieldIcon />
            <span>This is a secure proof review link</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--border-strong)', marginTop: 4 }}>
            Powered by OnPrints
          </div>
        </div>
      </div>

      {/* ── File preview overlay ── */}
      {previewUrl && (
        <div
          onClick={() => { setPreviewUrl(null); setPreviewName('') }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', maxWidth: 900, marginBottom: 12,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{previewName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => { const a = document.createElement('a'); a.href = previewUrl!; a.download = previewName; document.body.appendChild(a); a.click(); document.body.removeChild(a) }} style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)',
                color: 'white', cursor: 'pointer',
              }} title="Download">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button onClick={() => { setPreviewUrl(null); setPreviewName('') }} style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)',
                color: 'white', cursor: 'pointer',
              }}>
                <CloseIcon />
              </button>
            </div>
          </div>
          <div onClick={e => e.stopPropagation()} style={{
            flex: 1, width: '100%', maxWidth: 900, borderRadius: 8, overflow: 'hidden',
            background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/\.pdf$/i.test(previewName) ? (
              <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <img src={previewUrl} alt={previewName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Styles ──────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px 60px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 720,
    background: 'var(--bg-card)',
    borderRadius: 12,
    border: '1px solid var(--border-strong)',
    borderTop: 'none',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 28px',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  brandIcon: {
    width: 32,
    height: 32,
    background: '#006AFF',
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '20px 28px',
    borderBottom: '1px solid var(--border)',
  },
  section: {
    padding: '24px 28px',
    borderBottom: '1px solid var(--border)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 12,
  },
  fileCard: {
    padding: 8,
    borderRadius: 10,
    border: '1.5px solid var(--border-strong)',
    background: 'var(--bg-subtle)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
    borderRadius: 8,
    border: '1px solid var(--border-strong)',
    overflow: 'hidden',
  },
  detailItem: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  btnAmend: {
    padding: '10px 22px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    background: 'rgba(245,158,11,0.08)',
    color: 'var(--warning)',
    border: '1px solid #fed7aa',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'background 0.15s',
  },
  btnApprove: {
    padding: '10px 22px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    background: '#006AFF',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'background 0.15s',
  },
  btnCancel: {
    padding: '10px 22px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  formCard: {
    padding: '20px 22px',
    borderRadius: 10,
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-subtle)',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 14px',
    fontSize: 14,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: 1.6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    outline: 'none',
  },
  inputLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 5,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
    marginTop: 2,
  },
  error: {
    fontSize: 13,
    color: 'var(--negative)',
    marginTop: 10,
    fontWeight: 500,
  },
  footer: {
    padding: '20px 28px',
    textAlign: 'center' as const,
  },
}
