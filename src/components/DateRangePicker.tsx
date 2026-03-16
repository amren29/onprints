'use client'

import { useState, useRef, useEffect } from 'react'

/* ── Icons ── */
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const ChevDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

/* ── Constants ── */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Mo','Tu','We','Th','Fr','Sa','Su']

type Period = 'last7'|'last14'|'last30'|'last90'|'last180'|'custom'
const PERIOD_OPTS: { key: Period; label: string; days?: number }[] = [
  { key:'last7',   label:'Last 7 days',   days:7   },
  { key:'last14',  label:'Last 14 days',  days:14  },
  { key:'last30',  label:'Last 30 days',  days:30  },
  { key:'last90',  label:'Last 3 months', days:90  },
  { key:'last180', label:'Last 6 months', days:180 },
  { key:'custom',  label:'Custom range'            },
]

/* ── Helpers ── */
function subDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() - n); return r
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function rangeFor(period: Period) {
  const end   = new Date(); end.setHours(23,59,59,999)
  const opt   = PERIOD_OPTS.find(p => p.key === period)
  const start = opt?.days ? subDays(end, opt.days - 1) : new Date(end)
  start.setHours(0,0,0,0)
  return { start, end }
}
function fmtShort(d: Date) {
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}
function fmtFull(d: Date) {
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

/* ── Calendar Month Grid ── */
function MonthGrid({
  year, month, selStart, selEnd, hover,
  onSelect, onHover,
}: {
  year:number; month:number
  selStart:Date|null; selEnd:Date|null; hover:Date|null
  onSelect:(d:Date)=>void
  onHover:(d:Date|null)=>void
}) {
  const first   = new Date(year, month, 1)
  const last    = new Date(year, month+1, 0)
  const offset  = (first.getDay() + 6) % 7   // Mon-first
  const cells: (Date|null)[] = []
  for (let i=0; i<offset; i++) cells.push(null)
  for (let d=1; d<=last.getDate(); d++) cells.push(new Date(year, month, d))

  const rangeEnd = selEnd || hover
  const lo = selStart && rangeEnd ? (selStart < rangeEnd ? selStart : rangeEnd) : null
  const hi = selStart && rangeEnd ? (selStart < rangeEnd ? rangeEnd : selStart) : null

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1px 0', marginBottom:2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600, color:'var(--text-muted)', padding:'3px 0' }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const isSt  = selStart && sameDay(d, selStart)
          const isEn  = selEnd   && sameDay(d, selEnd)
          const inRng = lo && hi && d > lo && d < hi
          const isTo  = sameDay(d, new Date())
          return (
            <div
              key={d.getDate()}
              onClick={() => onSelect(d)}
              onMouseEnter={() => onHover(d)}
              onMouseLeave={() => onHover(null)}
              style={{
                textAlign:'center', fontSize:12, padding:'5px 2px',
                borderRadius: isSt ? '6px 0 0 6px' : isEn ? '0 6px 6px 0' : inRng ? '0' : '6px',
                cursor:'pointer',
                background: isSt||isEn ? 'var(--accent)' : inRng ? 'rgba(0,106,255,0.1)' : 'transparent',
                color: isSt||isEn ? '#fff' : isTo ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isSt||isEn||isTo ? 600 : 400,
              }}
            >
              {d.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function DateRangePicker() {
  const [period,  setPeriod]  = useState<Period>('last30')
  const [range,   setRange]   = useState(() => rangeFor('last30'))
  const [showCal, setShowCal] = useState(false)
  const [showDrop,setShowDrop]= useState(false)

  // Calendar picking state
  const today = new Date()
  const [calYM,  setCalYM]  = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [picking,setPicking] = useState<'start'|'end'>('start')
  const [tmpS,   setTmpS]   = useState<Date|null>(null)
  const [tmpE,   setTmpE]   = useState<Date|null>(null)
  const [hover,  setHover]  = useState<Date|null>(null)

  const calRef  = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (calRef.current  && !calRef.current.contains(e.target as Node))  setShowCal(false)
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function openCal() {
    setTmpS(range.start); setTmpE(range.end)
    setPicking('start')
    setCalYM({ year: range.start.getFullYear(), month: range.start.getMonth() })
    setShowCal(true); setShowDrop(false)
  }

  function handleSelect(d: Date) {
    if (picking === 'start') {
      setTmpS(d); setTmpE(null); setPicking('end')
    } else {
      if (tmpS && d < tmpS) { setTmpS(d); setTmpE(tmpS) }
      else setTmpE(d)
    }
  }

  function applyRange() {
    if (tmpS && tmpE) { setRange({ start: tmpS, end: tmpE }); setPeriod('custom') }
    setShowCal(false)
  }

  function selectPeriod(p: Period) {
    setShowDrop(false)
    if (p === 'custom') { openCal(); return }
    setPeriod(p); setRange(rangeFor(p))
  }

  function prevMonth() {
    setCalYM(m => { const d = new Date(m.year, m.month-1); return { year:d.getFullYear(), month:d.getMonth() } })
  }
  function nextMonth() {
    setCalYM(m => { const d = new Date(m.year, m.month+1); return { year:d.getFullYear(), month:d.getMonth() } })
  }

  const periodLabel = PERIOD_OPTS.find(p => p.key===period)?.label ?? 'Custom'
  const dateLabel   = `${fmtShort(range.start)} – ${fmtFull(range.end)}`
  const rangeHint   = tmpS && tmpE ? `${fmtShort(tmpS)} – ${fmtShort(tmpE)}` : tmpS ? 'Select end date' : 'Select start date'

  const navBtnStyle: React.CSSProperties = {
    width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:6, border:'1px solid var(--border)', background:'transparent',
    cursor:'pointer', fontSize:14, color:'var(--text-secondary)', fontWeight:500,
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>

      {/* ── Date range button ── */}
      <div ref={calRef} style={{ position:'relative' }}>
        <button
          onClick={openCal}
          className="topbar-date"
          style={{ cursor:'pointer' }}
        >
          <CalIcon />
          <span>{dateLabel}</span>
        </button>

        {showCal && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', left:0,
            background:'var(--bg-card)', borderRadius:12,
            boxShadow:'0 8px 32px rgba(0,0,0,0.14)',
            border:'1px solid var(--border)', zIndex:300, padding:16,
            minWidth:260,
          }}>
            {/* Month navigation */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button onClick={prevMonth} style={navBtnStyle}>‹</button>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
                {MONTHS[calYM.month]} {calYM.year}
              </span>
              <button onClick={nextMonth} style={navBtnStyle}>›</button>
            </div>

            {/* Calendar grid */}
            <MonthGrid
              year={calYM.year} month={calYM.month}
              selStart={tmpS} selEnd={tmpE} hover={hover}
              onSelect={handleSelect} onHover={setHover}
            />

            {/* Footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{rangeHint}</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setShowCal(false)} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={applyRange}
                  disabled={!tmpS || !tmpE}
                  style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:'none', background:'var(--accent)', color:'#fff', cursor: tmpS&&tmpE?'pointer':'not-allowed', opacity: tmpS&&tmpE?1:0.45 }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Period dropdown ── */}
      <div ref={dropRef} style={{ position:'relative' }}>
        <button
          onClick={() => { setShowDrop(v => !v); setShowCal(false) }}
          className="topbar-period"
          style={{ cursor:'pointer' }}
        >
          <span>{periodLabel}</span>
          <ChevDown />
        </button>

        {showDrop && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right:0,
            background:'var(--bg-card)', borderRadius:10,
            boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
            border:'1px solid var(--border)', zIndex:300,
            minWidth:170, padding:5,
          }}>
            {PERIOD_OPTS.map(opt => (
              <button
                key={opt.key}
                onClick={() => selectPeriod(opt.key)}
                style={{
                  display:'block', width:'100%', textAlign:'left',
                  fontSize:13, padding:'7px 10px', borderRadius:6,
                  border:'none', cursor:'pointer',
                  background: period===opt.key ? 'rgba(0,106,255,0.08)' : 'transparent',
                  color: period===opt.key ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: period===opt.key ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
