import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, Treemap, ComposedChart
} from 'recharts'
import {
  FaProjectDiagram, FaGlobeAmericas, FaBuilding, FaRocket,
  FaArrowUp, FaArrowDown, FaChartLine, FaUsers, FaClipboardList,
  FaLayerGroup, FaHandshake, FaCheckCircle, FaTimesCircle,
  FaClock, FaPercentage, FaCalendarAlt, FaDownload, FaFileExport,
  FaExpand, FaSearch, FaTimes, FaChartBar,
  FaMapMarkerAlt, FaLightbulb, FaMicrochip, FaChartPie,
  FaUserGraduate, FaChartArea, FaFlag, FaSyncAlt,
  FaChevronDown, FaRegLightbulb, FaBrain, FaUserShield,
  FaTable, FaFilter, FaStar, FaFileCsv, FaGripLines,
  FaThLarge, FaList, FaCircle, FaDotCircle
} from 'react-icons/fa'

import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const C = {
  primary:   '#6366F1',
  secondary: '#8B5CF6',
  success:   '#10B981',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  info:      '#06B6D4',
  chart:     ['#6366F1','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6','#34D399','#F472B6','#60A5FA'],
  status: { approved: '#10B981', pending: '#F59E0B', rejected: '#EF4444' }
}

const SECTOR_COLORS = {
  Healthcare: '#6366F1', Education: '#8B5CF6', Agriculture: '#10B981',
  Finance: '#F59E0B', Energy: '#EF4444', Transport: '#06B6D4',
  Government: '#EC4899', Environment: '#34D399', 'Smart Cities': '#F472B6'
}

const ORG_TYPE_COLORS = {
  NGO: '#10B981', Startup: '#8B5CF6', Company: '#6366F1',
  Government: '#F59E0B', University: '#EC4899', 'Research Lab': '#34D399'
}

const SDG_COLORS = [
  '#E5243B','#DDA63A','#4C9F38','#C5192D','#FF3A21','#26BDE2',
  '#FCC30B','#A21942','#FD6925','#DD1367','#FD9D24','#BF8B2E',
  '#3F7E44','#0A97D9','#56C02B','#00689D','#19486A'
]

const SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
const SHADOW_HOVER = '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)'
const RADIUS = 14

function topBy(arr, key) {
  const m = {}
  arr.forEach(p => { m[p[key]] = (m[p[key]] || 0) + 1 })
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1])
  return entries.length ? { k: entries[0][0], v: entries[0][1] } : { k: '\u2014', v: 0 }
}

function groupBy(arr, key) {
  const m = {}
  arr.forEach(p => { m[p[key]] = (m[p[key]] || 0) + 1 })
  return m
}

async function exportCSV(projectsUrl) {
  try {
    const res = await fetch(projectsUrl)
    const json = await res.json()
    const items = json.items || json.projects || json.results || json
    if (!Array.isArray(items) || items.length === 0) return
    const header = 'ID,Title,Country,Sector,Status,Technology,Organization\n'
    const rows = items
      .filter(p => !['Cybersecurity','Telecommunications','Data Science','Business Intelligence'].includes(p.sector))
      .map(p => `${p.id},"${(p.title || '').replace(/"/g,'""')}",${p.country || ''},${p.sector || ''},${p.status || ''},"${(p.technology || '').replace(/"/g,'""')}","${(p.organization || '').replace(/"/g,'""')}"`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'analytics_export.csv'; a.click()
    URL.revokeObjectURL(url)
  } catch { /* silent */ }
}

const cardStyle = {
  background: '#fff', borderRadius: RADIUS, padding: '22px 24px',
  boxShadow: SHADOW, border: '1px solid rgba(0,0,0,0.04)',
  transition: 'all 0.25s ease', cursor: 'default'
}

const cardHover = {
  boxShadow: SHADOW_HOVER, transform: 'translateY(-2px)'
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)',
      borderRadius: 12, padding: '12px 16px', color: '#fff',
      border: '1px solid rgba(255,255,255,0.08)', fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 140
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6, opacity: .5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{e.name}:</span>
          <strong style={{ color: '#fff' }}>{e.value}</strong>
        </div>
      ))}
    </div>
  )
}

const Sparkline = memo(({ data = [], color = C.primary }) => {
  const vals = data.map(d => d.value ?? d.count ?? 0)
  if (vals.length < 2) return null
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = max - min || 1
  const w = 80, h = 28
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={`${color}15`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})

const KpiCard = memo(({ label, value, icon: Icon, color, delta, deltaUp, sparkData, subtitle }) => {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div style={{
      ...cardStyle, position: 'relative', overflow: 'hidden',
      ...(isHovered ? cardHover : {}),
      borderColor: isHovered ? color : undefined
    }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}66)`, borderRadius: `${RADIUS}px ${RADIUS}px 0 0` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${color}10`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          transition: 'transform 0.3s', transform: isHovered ? 'scale(1.05)' : 'scale(1)'
        }}>
          <Icon />
        </div>
        {delta !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
            padding: '4px 10px', borderRadius: 20,
            color: deltaUp ? C.success : C.danger,
            background: deltaUp ? `${C.success}10` : `${C.danger}10`,
            border: `1px solid ${deltaUp ? `${C.success}25` : `${C.danger}25`}`
          }}>
            {deltaUp ? <FaArrowUp style={{ fontSize: 9 }} /> : <FaArrowDown style={{ fontSize: 9 }} />}
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', color: '#0f172a' }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
      {sparkData && <div style={{ position: 'absolute', bottom: 12, right: 12, opacity: 0.25, transition: 'opacity 0.3s' }}><Sparkline data={sparkData} color={color} /></div>}
    </div>
  )
})

function InsightBar({ insights }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
      {insights.map((ins, i) => (
        <div key={i} style={{
          display: 'flex', gap: 14, alignItems: 'flex-start',
          padding: '16px 20px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', borderRadius: RADIUS,
          boxShadow: SHADOW, transition: 'all 0.25s ease'
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: ins.bg, color: ins.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15
          }}>
            <ins.Icon />
          </div>
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, margin: 0 }} dangerouslySetInnerHTML={{ __html: ins.text }} />
        </div>
      ))}
    </div>
  )
}

function HBarList({ entries, colorFn, t }) {
  const max = entries[0]?.[1] || 1
  if (!entries.length) return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([k, v], i) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#64748b', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 500 }}>{k}</span>
          <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${Math.round(v / max * 100)}%`, background: colorFn ? colorFn(k, i) : C.chart[i % C.chart.length], borderRadius: 6, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, width: 28, textAlign: 'right', flexShrink: 0, color: '#0f172a' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    approved: { bg: `${C.success}12`, color: C.success },
    pending:  { bg: `${C.warning}12`, color: C.warning },
    rejected: { bg: `${C.danger}12`, color: C.danger },
    draft:    { bg: '#f1f5f9', color: '#94a3b8' }
  }
  const s = cfg[status] || cfg.draft
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}20` }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )
}

function Card({ children, span, style = {} }) {
  return (
    <div style={{
      ...cardStyle, display: 'flex', flexDirection: 'column',
      gridColumn: span ? `span ${span}` : undefined,
      ...style
    }}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, iconBg, iconColor, title, sub, badge, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconBg || `${C.primary}10`, color: iconColor || C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
        }}>
          <Icon />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && (
          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontWeight: 500, border: '1px solid rgba(0,0,0,0.04)' }}>{badge}</span>
        )}
        {action}
      </div>
    </div>
  )
}

function MultiSelect({ label, options, selected, onChange, icon: Icon, t }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handleOut = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch('') } }
    if (open) document.addEventListener('mousedown', handleOut)
    return () => document.removeEventListener('mousedown', handleOut)
  }, [open])

  const filtered = options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()))
  const toggle = opt => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  const selectAll = () => onChange(filtered.length === selected.length ? [] : [...filtered])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 24,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
        color: '#64748b', transition: 'all 0.2s', whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {Icon && <Icon style={{ fontSize: 11, color: C.primary }} />}
        {label}
        {selected.length > 0 && (
          <span style={{ background: C.primary, color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 700, marginLeft: 2 }}>
            {selected.length}
          </span>
        )}
        <FaChevronDown style={{ fontSize: 8, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          minWidth: 220, maxWidth: 300, background: '#fff',
          border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
          boxShadow: '0 12px 48px rgba(0,0,0,0.12)', padding: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 4 }}>
            <FaSearch style={{ fontSize: 11, color: '#94a3b8' }} />
            <input type="text" placeholder={t('analytics.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 12, width: '100%', color: '#0f172a' }} />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '2px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.primary, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 2 }}>
              <input type="checkbox" checked={filtered.length > 0 && filtered.length === selected.length} onChange={selectAll} style={{ accentColor: C.primary }} />
              {t('analytics.selectAll')}
            </label>
            {filtered.map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#64748b', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} style={{ accentColor: C.primary }} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Analytics() {
  const { t } = useTranslation()
  const { isAdmin, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const [filterSector, setFilterSector] = useState([])
  const [filterCountry, setFilterCountry] = useState([])
  const [filterStatus, setFilterStatus] = useState([])
  const [filterTech, setFilterTech] = useState([])
  const [filterSdg, setFilterSdg] = useState([])
  const [filterRegion, setFilterRegion] = useState([])
  const [filterStakeholderType, setFilterStakeholderType] = useState([])
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const safeFetch = useCallback(async (url, fallback) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return fallback
      return await res.json()
    } catch { return fallback }
  }, [])

  const buildFilterQS = useCallback(() => {
    const p = new URLSearchParams()
    if (filterSector.length) p.set('sector', filterSector.join(','))
    if (filterCountry.length) p.set('country', filterCountry.join(','))
    if (filterStatus.length) p.set('status', filterStatus.join(','))
    if (filterTech.length) p.set('technology', filterTech.join(','))
    if (filterSdg.length) p.set('sdg', filterSdg[0])
    if (filterRegion.length) p.set('region', filterRegion.join(','))
    if (filterDateFrom) p.set('date_from', filterDateFrom)
    if (filterDateTo) p.set('date_to', filterDateTo)
    const qs = p.toString()
    return qs ? `?${qs}` : ''
  }, [filterSector, filterCountry, filterStatus, filterTech, filterSdg, filterRegion, filterDateFrom, filterDateTo])

  const fetchAllData = useCallback(async (qs = '') => {
    setLoading(true)
    try {
      const endpoints = {
        overview:              safeFetch(`${API_BASE}/api/analytics/overview${qs}`, null),
        projectsByCountry:     safeFetch(`${API_BASE}/api/analytics/projects-by-country${qs}`, []),
        projectsBySector:      safeFetch(`${API_BASE}/api/analytics/projects-by-sector${qs}`, []),
        aiTech:                safeFetch(`${API_BASE}/api/analytics/ai-technologies${qs}`, []),
        projectsTimeline:      safeFetch(`${API_BASE}/api/analytics/projects-timeline${qs}`, []),
        sdgCoverage:           safeFetch(`${API_BASE}/api/analytics/sdg-coverage${qs}`, []),
        stakeholdersByType:    safeFetch(`${API_BASE}/api/analytics/stakeholders-by-type`, []),
        statusDistribution:    safeFetch(`${API_BASE}/api/analytics/status-distribution${qs}`, []),
        userSignups:           safeFetch(`${API_BASE}/api/analytics/user-signups`, []),
        usersByOrgType:        safeFetch(`${API_BASE}/api/analytics/users-by-organization-type`, []),
        stakeholdersByCategory: safeFetch(`${API_BASE}/api/analytics/stakeholders-by-category`, []),
        projectsByRegion:      safeFetch(`${API_BASE}/api/analytics/projects-by-region${qs}`, []),
        resourcesByType:       safeFetch(`${API_BASE}/api/analytics/resources-by-type`, []),
        mapData:               safeFetch(`${API_BASE}/api/analytics/map-data`, []),
        recentUsers:           safeFetch(`${API_BASE}/api/analytics/recent-users`, []),
        activeUsers:           safeFetch(`${API_BASE}/api/analytics/activation-rate`, {}),
      }
      const resolved = {}
      for (const [key, promise] of Object.entries(endpoints)) { resolved[key] = await promise }
      setData(resolved)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Analytics fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [safeFetch])

  const hasFetched = useRef(false)

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchAllData()
    } else {
      const t = setTimeout(() => fetchAllData(buildFilterQS()), 400)
      return () => clearTimeout(t)
    }
  }, [buildFilterQS, fetchAllData])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {})
    }
  }

  const clearFilters = () => {
    setFilterSector([]); setFilterCountry([]); setFilterStatus([])
    setFilterTech([]); setFilterSdg([]); setFilterRegion([])
    setFilterStakeholderType([]); setFilterDateFrom(''); setFilterDateTo('')
  }

  const activeFilterCount = useMemo(() =>
    [filterSector, filterCountry, filterStatus, filterTech, filterSdg, filterRegion, filterStakeholderType]
      .reduce((a, f) => a + f.length, 0) + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0),
    [filterSector, filterCountry, filterStatus, filterTech, filterSdg, filterRegion, filterStakeholderType, filterDateFrom, filterDateTo]
  )

  const filterOptions = useMemo(() => ({
    sectors:          [...new Set((data.projectsBySector || []).map(s => s.sector).filter(Boolean))],
    countries:        [...new Set((data.projectsByCountry || []).map(c => c.country).filter(Boolean))],
    statuses:         ['approved', 'pending', 'rejected', 'draft'],
    technologies:     [...new Set((data.aiTech || []).map(t => t.technology).filter(Boolean))],
    sdgs:             [...new Set((data.sdgCoverage || []).map(s => s.goal_number).filter(Boolean))].sort((a, b) => a - b),
    regions:          [...new Set((data.projectsByRegion || []).map(r => r.region).filter(Boolean))],
    stakeholderTypes: [...new Set((data.stakeholdersByType || []).map(s => s.type).filter(Boolean))],
  }), [data])

  if (loading) return <Loader t={t} />

  const tabs = [
    { label: t('analytics.tabOverview'), icon: FaChartBar },
    { label: t('analytics.tabUsersStakeholders'), icon: FaUsers },
  ]

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <div style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '14px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40,
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontSize: 18,
            boxShadow: `0 4px 16px ${C.primary}30`
          }}>
            <FaChartBar />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('analytics.pageTitle')}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{t('analytics.pageSubtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', padding: '5px 14px', background: '#f8fafc', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
            <FaClock style={{ fontSize: 10, opacity: 0.6 }} />
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--'}
          </span>
          <HeaderBtn icon={FaExpand} onClick={toggleFullscreen} title={t('analytics.fullscreen')} />
          <HeaderBtn icon={FaFileExport} title={t('analytics.exportPdf')} />
          <HeaderBtn icon={FaDownload} onClick={() => exportCSV(`${API_BASE}/api/projects?page_size=5000`)} title={t('analytics.exportCsv')} />
          <HeaderBtn icon={FaSyncAlt} onClick={() => fetchAllData(buildFilterQS())} title={t('analytics.refresh')} primary />
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '10px 28px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', position: 'sticky', top: 68, zIndex: 90, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
        <FaFilter style={{ fontSize: 11, color: '#94a3b8', marginRight: 4 }} />
        <MultiSelect label={t('analytics.filterSector')} options={filterOptions.sectors} selected={filterSector} onChange={setFilterSector} icon={FaLayerGroup} t={t} />
        <MultiSelect label={t('analytics.filterCountry')} options={filterOptions.countries} selected={filterCountry} onChange={setFilterCountry} icon={FaGlobeAmericas} t={t} />
        <MultiSelect label={t('analytics.filterStatus')} options={filterOptions.statuses} selected={filterStatus} onChange={setFilterStatus} icon={FaCheckCircle} t={t} />
        <MultiSelect label={t('analytics.filterTechnology')} options={filterOptions.technologies} selected={filterTech} onChange={setFilterTech} icon={FaMicrochip} t={t} />
        <MultiSelect label={t('analytics.filterSdg')} options={filterOptions.sdgs} selected={filterSdg} onChange={setFilterSdg} icon={FaFlag} t={t} />
        <MultiSelect label={t('analytics.filterRegion')} options={filterOptions.regions} selected={filterRegion} onChange={setFilterRegion} icon={FaGlobeAmericas} t={t} />
        <MultiSelect label={t('analytics.filterStakeholder')} options={filterOptions.stakeholderTypes} selected={filterStakeholderType} onChange={setFilterStakeholderType} icon={FaUsers} t={t} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 24, fontSize: 12, color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <FaCalendarAlt style={{ fontSize: 11, color: C.primary }} />
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 11, width: 100, color: '#64748b', padding: '2px 0' }} />
          <span style={{ opacity: 0.3 }}>—</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 11, width: 100, color: '#64748b', padding: '2px 0' }} />
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px',
            background: `${C.danger}08`, border: `1px solid ${C.danger}25`, borderRadius: 24,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
            color: C.danger, transition: 'all 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}15`}
            onMouseLeave={e => e.currentTarget.style.background = `${C.danger}08`}
          >
            <FaTimes style={{ fontSize: 10 }} /> {t('analytics.clearFilters', { count: activeFilterCount })}
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 28px', display: 'flex', gap: 0 }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: activeTab === i ? 600 : 500,
            color: activeTab === i ? C.primary : '#94a3b8',
            borderBottom: activeTab === i ? `2px solid ${C.primary}` : '2px solid transparent',
            transition: 'all 0.2s', position: 'relative'
          }}>
            <tab.icon style={{ fontSize: 13 }} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 48px' }}>
        {activeTab === 0 && <OverviewDashboard data={data} t={t} />}
        {activeTab === 1 && <UserDashboard data={data} t={t} />}
      </div>

      <style>{GLOBAL_CSS}</style>
    </div>
  )
}

function Loader({ t }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 20 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.06)', borderTopColor: C.primary, animation: 'at-spin .8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, letterSpacing: '0.3px' }}>{t('analytics.loadingAnalytics')}</p>
      <style>{`@keyframes at-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function HeaderBtn({ icon: Icon, onClick, title, primary }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 36, height: 36,
        border: `1px solid ${primary ? C.primary : hover ? C.primary : 'rgba(0,0,0,0.08)'}`,
        background: primary ? C.primary : hover ? `${C.primary}06` : 'transparent',
        borderRadius: 10, cursor: 'pointer',
        color: primary ? '#fff' : hover ? C.primary : '#94a3b8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, transition: 'all 0.2s'
      }}>
      <Icon />
    </button>
  )
}

function OverviewDashboard({ data, t }) {
  const {
    overview, projectsByCountry, projectsBySector, aiTech,
    projectsTimeline, sdgCoverage, statusDistribution
  } = data

  const totalProjects = overview?.total_projects ?? 0
  const totalResources = overview?.total_resources ?? 0
  const activeCountries = (projectsByCountry || []).length

  const sectorData = useMemo(() => (projectsBySector || []).slice(0, 5).map((s, i) => ({ ...s, fill: SECTOR_COLORS[s.sector] || C.chart[i % C.chart.length] })), [projectsBySector])
  const topCountries = (projectsByCountry || []).slice(0, 10)
  const topSdgs = useMemo(() => (sdgCoverage || []).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10), [sdgCoverage])

  const timelineData = useMemo(() =>
    (projectsTimeline || []).map(p => ({ year: p.year, count: p.projects ?? p.count ?? 0 })), [projectsTimeline])

  const treemapData = useMemo(() => [{
    name: t('analytics.aiTechnologies'),
    children: (aiTech || []).map(t => ({ name: t.technology, size: t.count }))
  }], [aiTech, t])

  const kpis = [
    { label: t('analytics.totalProjects'), value: totalProjects, icon: FaProjectDiagram, color: C.primary, delta: '+5%', deltaUp: true, sparkData: projectsTimeline, subtitle: t('analytics.allTrackedInitiatives') },
    { label: t('analytics.activeCountries'), value: activeCountries, icon: FaGlobeAmericas, color: C.secondary, delta: '+2', deltaUp: true, subtitle: t('analytics.countriesWithProjects') },
    { label: t('analytics.totalResources'), value: totalResources, icon: FaDownload, color: C.success, delta: '+7%', deltaUp: true, subtitle: t('analytics.availableAssets') },
  ]

  const insightOpts = { interpolation: { escapeValue: false } }
  const insights = [
    { Icon: FaBrain, bg: `${C.primary}10`, color: C.primary, text: t('analytics.insightProjectsTracked', { count: totalProjects, countries: activeCountries }, insightOpts) },
    { Icon: FaRegLightbulb, bg: `${C.success}10`, color: C.success, text: sectorData.length > 0 ? t('analytics.insightSectorLeads', { sector: sectorData[0].sector, count: sectorData[0].count }, insightOpts) : t('analytics.insightSectorDataPopulating') },
    { Icon: FaChartLine, bg: `${C.secondary}10`, color: C.secondary, text: topSdgs.length > 0 ? t('analytics.insightSdgLeads', { goal: topSdgs[0].goal_number, count: topSdgs[0].count }, insightOpts) : t('analytics.insightSdgDataCollecting') },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <InsightBar insights={insights} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaGlobeAmericas} title={t('analytics.top10Countries')} sub={t('analytics.byProjectCount')} iconBg={`${C.secondary}10`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topCountries} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="country" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="projects" name={t('analytics.projects')} radius={[0, 6, 6, 0]} barSize={16}>
                {topCountries.map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaChartPie} title={t('analytics.sectorDistribution')} sub={t('analytics.projectsBySector')} iconBg={`${C.warning}10`} iconColor={C.warning} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="count" nameKey="sector" stroke="none">
                  {sectorData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList entries={sectorData.map(s => [s.sector, s.count])} colorFn={k => SECTOR_COLORS[k] || '#888'} t={t} />
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaMicrochip} title={t('analytics.aiTechnologiesTreemap')} sub={t('analytics.techAdoptionDist')} iconBg={`${C.primary}10`} iconColor={C.primary} badge={`${(aiTech || []).length} ${t('analytics.technologies')}`} />
          <ResponsiveContainer width="100%" height={240}>
            <Treemap data={treemapData} dataKey="size" nameKey="name" ratio={4 / 3} stroke="#fff" fill={C.primary}>
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaChartLine} title={t('analytics.evolutionByYear')} sub={t('analytics.projectTimeline')} iconBg={`${C.primary}10`} iconColor={C.primary} badge={`${timelineData.reduce((a, b) => a + b.count, 0)} ${t('analytics.total')}`} />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timelineData} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="grad-evol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name={t('analytics.projects')} stroke={C.primary} strokeWidth={2} fill="url(#grad-evol)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaFlag} title={t('analytics.sdgCoverage')} sub={t('analytics.sustainableDevGoals')} iconBg={`${C.success}10`} iconColor={C.success} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topSdgs} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="goal_number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} tickFormatter={v => `${t('analytics.sdgAbbr')} ${v}`} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name={t('analytics.projects')} radius={[0, 6, 6, 0]} barSize={16}>
                {topSdgs.map((e, i) => <Cell key={i} fill={e.color || SDG_COLORS[(e.goal_number - 1) % SDG_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaCheckCircle} title={t('analytics.statusDistribution')} sub={t('analytics.approvedPendingRejected')} iconBg={`${C.success}10`} iconColor={C.success} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={(statusDistribution || []).filter(s => ['approved', 'pending', 'rejected'].includes(s.status))} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="status" stroke="none">
                  {(statusDistribution || []).filter(s => ['approved', 'pending', 'rejected'].includes(s.status)).map((e, i) => <Cell key={i} fill={C.status[e.status] || '#888'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList entries={(statusDistribution || []).filter(s => ['approved', 'pending', 'rejected'].includes(s.status)).map(s => [s.status.charAt(0).toUpperCase() + s.status.slice(1), s.count])} colorFn={(k) => C.status[k.toLowerCase()] || '#888'} t={t} />
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

function UserDashboard({ data, t }) {
  const { userSignups, usersByOrgType, stakeholdersByCategory, statusDistribution, recentUsers, activeUsers } = data

  const signupChart = useMemo(() =>
    (userSignups || []).map(s => ({ label: `${s.year}-${String(s.month).padStart(2, '0')}`, count: s.count, cumulative: s.cumulative })), [userSignups])

  const insightOpts = { interpolation: { escapeValue: false } }
  const topCategory = (stakeholdersByCategory || []).length > 0 ? stakeholdersByCategory.reduce((a, b) => a.count > b.count ? a : b) : null
  const topOrgType = (usersByOrgType || []).length > 0 ? usersByOrgType.reduce((a, b) => a.count > b.count ? a : b) : null

  const kpis = [
    { label: t('analytics.totalSignups'), value: (userSignups || []).reduce((a, b) => a + b.count, 0), icon: FaUsers, color: C.primary, delta: '+10%', deltaUp: true, sparkData: userSignups, subtitle: t('analytics.newUsersKpi') },
    { label: t('analytics.orgTypes'), value: (usersByOrgType || []).length, icon: FaBuilding, color: C.warning, delta: null, subtitle: t('analytics.diversity') },
  ]

  const insights = [
    { Icon: FaRegLightbulb, bg: `${C.success}10`, color: C.success, text: topCategory ? t('analytics.insightCategoryLeads', { category: topCategory.category, count: topCategory.count }, insightOpts) : t('analytics.insightStakeholderDataCollecting') },
    { Icon: FaChartLine, bg: `${C.secondary}10`, color: C.secondary, text: topOrgType ? t('analytics.insightOrgTypeDominant', { type: topOrgType.type }, insightOpts) : t('analytics.insightOrgDataCollecting') },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <InsightBar insights={insights} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaChartLine} title={t('analytics.signupGrowth')} sub={t('analytics.monthlyNewUsers')} iconBg={`${C.primary}10`} iconColor={C.primary} />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={signupChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="grad-signup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} interval={1} angle={-20} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name={t('analytics.signups')} stroke={C.primary} strokeWidth={2} fill="url(#grad-signup)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaBuilding} title={t('analytics.orgTypes')} sub={t('analytics.userDistribution')} iconBg={`${C.warning}10`} iconColor={C.warning} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={usersByOrgType || []} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="type" stroke="none">
                  {(usersByOrgType || []).map((e, i) => <Cell key={i} fill={ORG_TYPE_COLORS[e.type] || C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList entries={(usersByOrgType || []).map(o => [o.type, o.count])} colorFn={k => ORG_TYPE_COLORS[k] || '#888'} t={t} />
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaUserGraduate} title="Active vs Total Users" sub="User activation breakdown" iconBg={`${C.success}10`} iconColor={C.success} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={[
                  { name: 'Active', value: activeUsers?.active_users ?? 0 },
                  { name: 'Inactive', value: (activeUsers?.total_users ?? 0) - (activeUsers?.active_users ?? 0) }
                ]} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value" nameKey="name" stroke="none">
                  <Cell fill={C.success} />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: `${C.success}08`, borderRadius: 8, border: `1px solid ${C.success}15` }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.success, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>Active Users</span>
                <strong style={{ fontSize: 16, color: C.success }}>{activeUsers?.active_users ?? 0}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>Inactive Users</span>
                <strong style={{ fontSize: 16, color: '#64748b' }}>{(activeUsers?.total_users ?? 0) - (activeUsers?.active_users ?? 0)}</strong>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                {(activeUsers?.activation_rate ?? 0) > 0 ? `${activeUsers.activation_rate}% activation rate` : ''}
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <CardHeader icon={FaHandshake} title={t('analytics.stakeholdersByCategory')} sub={t('analytics.categoryDistribution')} iconBg={`${C.secondary}10`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stakeholdersByCategory || []} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name={t('analytics.stakeholders')} radius={[0, 6, 6, 0]} barSize={16}>
                {(stakeholdersByCategory || []).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <CardHeader icon={FaUsers} title="Top 3 Users" sub="Most recent logins" iconBg={`${C.primary}10`} iconColor={C.primary} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>User</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Role</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Projects</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {(recentUsers || []).slice(0,).map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={user.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.organization_name)}&background=6366F1&color=fff&size=32`}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#f1f5f9', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{user.organization_name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{user.organization_type || ''}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email || '\u2014'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: 20,
                      fontSize: 11, fontWeight: 500,
                      background: user.role === 'admin' ? `${C.warning}12` : `${C.primary}10`,
                      color: user.role === 'admin' ? C.warning : C.primary,
                      border: `1px solid ${user.role === 'admin' ? `${C.warning}20` : `${C.primary}20`}`
                    }}>
                      {user.role || 'organization'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: 20,
                      fontSize: 11, fontWeight: 600,
                      background: user.is_active ? `${C.success}12` : '#f1f5f9',
                      color: user.is_active ? C.success : '#94a3b8',
                      border: `1px solid ${user.is_active ? `${C.success}20` : 'rgba(0,0,0,0.04)'}`
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: user.is_active ? C.success : '#94a3b8'
                      }} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{user.project_count ?? 0}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 11 }}>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function LegItem({ color, label, dash }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
      {dash
        ? <svg width={16} height={8}><line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth={2} strokeDasharray="4 2" /></svg>
        : <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0, display: 'inline-block' }} />
      }
      {label}
    </div>
  )
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  :root {
    --at-bg: #f8fafc;
    --at-card: #ffffff;
    --at-surface: #f8fafc;
    --at-border: rgba(0,0,0,0.06);
    --at-text: #0f172a;
    --at-muted: #64748b;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --at-bg: #0f172a;
      --at-card: #1e293b;
      --at-surface: #334155;
      --at-border: rgba(255,255,255,0.06);
      --at-text: #f1f5f9;
      --at-muted: #94a3b8;
    }
  }

  * { box-sizing: border-box; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }

  @keyframes at-spin { to { transform: rotate(360deg); } }

  .leaflet-container { height: 100%; width: 100%; border-radius: 12px; z-index: 1; }

  .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line {
    stroke-opacity: 0.5;
  }
`

export default memo(Analytics)
