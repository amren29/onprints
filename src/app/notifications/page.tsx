'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import ConfirmModal from '@/components/ConfirmModal'
import {
  getNotifications,
  markRead, markUnread, markAllRead, toggleStar,
  deleteNotification, bulkMarkRead, bulkMarkUnread, bulkStar, bulkDelete,
  type DbNotification,
} from '@/lib/db/notifications'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Notification = DbNotification

/* ── Icons ─────────────────────────────────────────── */
const BellIcon     = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>)
const TrashIcon    = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)
const CheckAllIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 9 23 4 18"/></svg>)
const CheckIcon    = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
const UnreadIcon   = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>)
const StarIcon     = ({ filled }: { filled?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const LinkIcon     = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>)
const BellStatIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>)
const AlertIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>)
const WarningIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)
const SuccessIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)

/* ── Helpers ────────────────────────────────────────── */
const TYPE_CONFIG: Record<string, { dot: string; bg: string; badge: string }> = {
  info:    { dot: '#2563eb', bg: 'rgba(37,99,235,0.05)',  badge: 'badge badge-info' },
  success: { dot: '#16a34a', bg: 'rgba(22,163,74,0.05)',  badge: 'badge badge-success' },
  warning: { dot: '#d97706', bg: 'rgba(217,119,6,0.05)',  badge: 'badge badge-warning' },
  danger:  { dot: '#dc2626', bg: 'rgba(220,38,38,0.05)',  badge: 'badge badge-danger' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })
}

const TABS = ['All', 'Unread', 'Starred', 'Info', 'Success', 'Warning', 'Danger']

/* ════════════════════════════════════════════════════ */
export default function NotificationsPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()
  const [tab, setTab] = useState('All')
  const [bulkDelOpen, setBulkDelOpen] = useState(false)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', shopId],
    queryFn: () => getNotifications(shopId),
    enabled: !!shopId,
  })

  const reload = () => qc.invalidateQueries({ queryKey: ['notifications', shopId] })

  const filtered = notifications.filter(n => {
    if (tab === 'Unread')  return !n.read
    if (tab === 'Starred') return !!n.starred
    if (tab === 'All')     return true
    return n.type === tab.toLowerCase()
  })

  const bulk = useBulkSelect(filtered, filtered)

  const unread   = notifications.filter(n => !n.read).length
  const starred  = notifications.filter(n => n.starred).length
  const warnings = notifications.filter(n => n.type === 'warning').length
  const successes= notifications.filter(n => n.type === 'success').length

  const handleMarkRead    = async (id: string) => { await markRead(shopId, id); reload() }
  const handleMarkUnread  = async (id: string) => { await markUnread(shopId, id); reload() }
  const handleToggleStar  = async (id: string) => { await toggleStar(shopId, id); reload() }
  const handleMarkAllRead = async () => { await markAllRead(shopId); reload() }
  const handleDelete      = async (id: string) => { await deleteNotification(shopId, id); reload() }

  /* Bulk actions */
  const selectedIds = Array.from(bulk.selectedIds)
  const handleBulkMarkRead   = async () => { await bulkMarkRead(shopId, selectedIds); bulk.clearSelection(); reload() }
  const handleBulkMarkUnread = async () => { await bulkMarkUnread(shopId, selectedIds); bulk.clearSelection(); reload() }
  const handleBulkStar       = async () => { await bulkStar(shopId, selectedIds); bulk.clearSelection(); reload() }
  const handleBulkDelete     = async () => { await bulkDelete(shopId, selectedIds); bulk.clearSelection(); reload(); setBulkDelOpen(false) }

  return (
    <AppShell>
      {/* ── Page Header ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">
            {unread > 0 ? `${unread} unread · ${notifications.length} total` : `All caught up · ${notifications.length} total`}
          </div>
        </div>
        <div className="page-actions">
          {unread > 0 && (
            <button className="btn-secondary" onClick={handleMarkAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckAllIcon /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────── */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BellStatIcon /> Total</div></div>
          <div className="stat-value">{notifications.length}</div>
          <div className="stat-vs">All notifications</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><AlertIcon /> Unread</div></div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{unread}</div>
          <div className="stat-vs">Pending review</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><WarningIcon /> Warnings</div></div>
          <div className="stat-value" style={{ color: '#d97706' }}>{warnings}</div>
          <div className="stat-vs">Need attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><SuccessIcon /> Success</div></div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{successes}</div>
          <div className="stat-vs">Completed events</div>
        </div>
      </div>

      <div className="page-scroll">
        {/* ── Filter Row ────────────────────────────── */}
        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button
                key={t}
                className={`filter-tab${tab === t ? ' active' : ''}`}
                onClick={() => { setTab(t); bulk.clearSelection() }}
              >
                {t}
                {t === 'Unread' && unread > 0 && (
                  <span style={{
                    marginLeft: 5, fontSize: 10, fontWeight: 700,
                    background: tab === t ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
                    color: 'white', padding: '0px 5px', borderRadius: 8,
                  }}>{unread}</span>
                )}
                {t === 'Starred' && starred > 0 && (
                  <span style={{
                    marginLeft: 5, fontSize: 10, fontWeight: 700,
                    background: tab === t ? 'rgba(255,255,255,0.25)' : '#d97706',
                    color: 'white', padding: '0px 5px', borderRadius: 8,
                  }}>{starred}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Notification List ─────────────────────── */}
        <div className="card">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.4 }}>
                <BellIcon />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                No notifications
              </div>
              <div style={{ fontSize: 12.5 }}>You&apos;re all caught up!</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <BulkCheckbox
                      checked={bulk.allPageSelected}
                      indeterminate={!bulk.allPageSelected && bulk.somePageSelected}
                      onChange={bulk.toggleAll}
                    />
                  </th>
                  <th style={{ width: 28 }}></th>
                  <th>Notification</th>
                  <th style={{ width: 90 }}>Type</th>
                  <th style={{ width: 110 }}>Time</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
                  const selected = bulk.selectedIds.has(n.id)
                  return (
                    <tr
                      key={n.id}
                      style={{
                        background: selected
                          ? 'rgba(0,106,255,0.05)'
                          : !n.read ? cfg.bg : undefined,
                      }}
                    >
                      {/* Checkbox */}
                      <td>
                        <BulkCheckbox
                          checked={selected}
                          onChange={() => bulk.toggleSelect(n.id)}
                        />
                      </td>

                      {/* Unread dot */}
                      <td style={{ paddingRight: 0 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: n.read ? 'var(--border-strong)' : cfg.dot,
                        }} />
                      </td>

                      {/* Content */}
                      <td style={{ paddingLeft: 10, cursor: 'pointer' }} onClick={() => !n.read && handleMarkRead(n.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <span className="cell-name" style={{ fontWeight: n.read ? 500 : 650 }}>
                            {n.title}
                          </span>
                          {!n.read && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, lineHeight: 1,
                              background: 'var(--accent)', color: 'white',
                              padding: '2px 6px', borderRadius: 10,
                            }}>NEW</span>
                          )}
                          {n.starred && (
                            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center' }}>
                              <StarIcon filled />
                            </span>
                          )}
                        </div>
                        <div className="cell-sub">{n.message}</div>
                      </td>

                      {/* Type badge */}
                      <td>
                        <span className={cfg.badge} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                          {n.type}
                        </span>
                      </td>

                      {/* Time + Link */}
                      <td>
                        <div className="cell-sub">{timeAgo(n.time)}</div>
                        {n.link && (
                          <Link
                            href={n.link}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 11, color: 'var(--accent)', fontWeight: 500, marginTop: 2,
                            }}
                          >
                            <LinkIcon /> View
                          </Link>
                        )}
                      </td>

                      {/* Row actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          {/* Star */}
                          <button
                            onClick={() => handleToggleStar(n.id)}
                            title={n.starred ? 'Unstar' : 'Star'}
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-card)',
                              color: n.starred ? '#d97706' : 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef9c3'; e.currentTarget.style.color = '#d97706' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = n.starred ? '#d97706' : 'var(--text-muted)' }}
                          >
                            <StarIcon filled={!!n.starred} />
                          </button>
                          {/* Mark read / unread */}
                          {n.read ? (
                            <button
                              onClick={() => handleMarkUnread(n.id)}
                              title="Mark as unread"
                              style={{
                                width: 28, height: 28, borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; e.currentTarget.style.color = '#2563eb' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                            >
                              <UnreadIcon />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              title="Mark as read"
                              style={{
                                width: 28, height: 28, borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: '#16a34a',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                            >
                              <CheckIcon />
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(n.id)}
                            title="Delete"
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Bulk Action Bar ──────────────────────────── */}
      <BulkActionBar
        count={bulk.selectedIds.size}
        total={filtered.length}
        onDeselectAll={bulk.clearSelection}
        actions={[
          {
            label: 'Mark Read',
            icon: <CheckIcon />,
            action: handleBulkMarkRead,
          },
          {
            label: 'Mark Unread',
            icon: <UnreadIcon />,
            action: handleBulkMarkUnread,
          },
          {
            label: 'Star',
            icon: <StarIcon />,
            action: handleBulkStar,
          },
          {
            label: 'Delete',
            icon: <TrashIcon />,
            action: () => setBulkDelOpen(true),
            danger: true,
          },
        ]}
      />

      {/* ── Bulk Delete Confirm ──────────────────────── */}
      {bulkDelOpen && (
        <ConfirmModal
          title={`Delete ${bulk.selectedIds.size} notification${bulk.selectedIds.size !== 1 ? 's' : ''}?`}
          message="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDelOpen(false)}
        />
      )}
    </AppShell>
  )
}
