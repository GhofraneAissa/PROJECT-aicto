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
import AdminDashboard from './AdminDashboard'
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

function exportCSV(data) {
  const header = 'ID,Title,Country,Region,Sector,Status,Technology,SDG,Duration\n'
  const rows = data
    .map(p => `${p.id},"${p.title || ''}",${p.country || ''},${p.region || ''},${p.sector || ''},${p.status || ''},"${p.technology || ''}",${p.sdg || ''},${p.duration || ''}`)
    .join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'analytics_export.csv'; a.click()
  URL.revokeObjectURL(url)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: 12,
      padding: '12px 16px',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.08)',
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      minWidth: 140
    }}>
      <p style={{
        fontWeight: 600,
        marginBottom: 6,
        opacity: .5,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '.6px'
      }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: e.color,
            flexShrink: 0
          }} />
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
  const max   = Math.max(...vals, 1)
  const min   = Math.min(...vals, 0)
  const range = max - min || 1
  const w = 80, h = 28
  const pts  = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  const fill = pts + ` ${w},${h} 0,${h}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polygon points={fill} fill={`${color}15`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})

const KpiCard = memo(({ label, value, icon: Icon, color, delta, deltaUp, sparkData, subtitle }) => (
  <div style={{
    background: 'var(--at-card)',
    border: '1px solid var(--at-border)',
    borderRadius: 16,
    padding: '18px 20px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default'
  }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = color
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = `0 8px 32px ${color}15`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--at-border)'
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}
  >
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: `linear-gradient(90deg, ${color}, ${color}66)`,
      borderRadius: '16px 16px 0 0'
    }} />
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `${color}12`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        transition: 'transform 0.3s'
      }}>
        <Icon />
      </div>
      {delta !== undefined && (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 20,
          color: deltaUp ? C.success : C.danger,
          background: deltaUp ? `${C.success}12` : `${C.danger}12`,
          border: `1px solid ${deltaUp ? `${C.success}25` : `${C.danger}25`}`
        }}>
          {deltaUp ? <FaArrowUp style={{ fontSize: 9 }} /> : <FaArrowDown style={{ fontSize: 9 }} />}
          {delta}
        </span>
      )}
    </div>
    
    <div style={{
      fontSize: 28,
      fontWeight: 700,
      lineHeight: 1,
      marginBottom: 4,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em'
    }}>{value ?? 0}</div>
    
    <div style={{
      fontSize: 12,
      color: 'var(--at-muted)',
      fontWeight: 500,
      letterSpacing: '0.3px'
    }}>{label}</div>
    
    {subtitle && (
      <div style={{
        fontSize: 11,
        color: 'var(--at-muted)',
        opacity: 0.6,
        marginTop: 2
      }}>{subtitle}</div>
    )}
    
    {sparkData && (
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        opacity: 0.3,
        transition: 'opacity 0.3s'
      }}>
        <Sparkline data={sparkData} color={color} />
      </div>
    )}
  </div>
))

function InsightBar({ insights }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10,
      marginBottom: 16
    }}>
      {insights.map((ins, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          padding: '14px 18px',
          background: 'var(--at-card)',
          border: '1px solid var(--at-border)',
          borderRadius: 12,
          transition: 'all 0.2s'
        }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = ins.color
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = `0 4px 16px ${ins.color}10`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--at-border)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: ins.bg,
            color: ins.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 14
          }}>
            <ins.Icon />
          </div>
          <p style={{
            fontSize: 12,
            color: 'var(--at-muted)',
            lineHeight: 1.6,
            margin: 0
          }}
            dangerouslySetInnerHTML={{ __html: ins.text }} />
        </div>
      ))}
    </div>
  )
}

function HBarList({ entries, colorFn }) {
  const max = entries[0]?.[1] || 1
  if (!entries.length) return <p style={{ textAlign: 'center', color: 'var(--at-muted)', fontSize: 12, padding: 20 }}>No data</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map(([k, v], i) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11,
            color: 'var(--at-muted)',
            width: 90,
            flexShrink: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'right',
            fontWeight: 500
          }}>{k}</span>
          <div style={{
            flex: 1,
            height: 6,
            background: 'var(--at-surface)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round(v / max * 100)}%`,
              background: colorFn ? colorFn(k, i) : C.chart[i % C.chart.length],
              borderRadius: 4,
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 20,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2))`
              }} />
            </div>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            width: 28,
            textAlign: 'right',
            flexShrink: 0,
            color: 'var(--at-text)'
          }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    approved: { bg: `${C.success}15`, color: C.success },
    pending:  { bg: `${C.warning}15`, color: C.warning },
    rejected: { bg: `${C.danger}15`, color: C.danger },
    draft:    { bg: 'var(--at-surface)', color: 'var(--at-muted)' }
  }
  const s = cfg[status] || cfg.draft
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 12px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.color}25`
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )
}

function Card({ children, span, style = {} }) {
  return (
    <div style={{
      background: 'var(--at-card)',
      border: '1px solid var(--at-border)',
      borderRadius: 16,
      padding: '18px 20px',
      overflow: 'hidden',
      gridColumn: span ? `span ${span}` : undefined,
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.2s',
      ...style
    }}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, iconBg, iconColor, title, sub, badge, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: iconBg || `${C.primary}12`,
          color: iconColor || C.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14
        }}>
          <Icon />
        </div>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--at-text)',
            letterSpacing: '-0.01em'
          }}>{title}</div>
          {sub && (
            <div style={{
              fontSize: 11,
              color: 'var(--at-muted)',
              marginTop: 1,
              opacity: 0.7
            }}>{sub}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && (
          <span style={{
            fontSize: 10,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'var(--at-surface)',
            color: 'var(--at-muted)',
            fontWeight: 500,
            border: '1px solid var(--at-border)'
          }}>{badge}</span>
        )}
        {action}
      </div>
    </div>
  )
}

function MultiSelect({ label, options, selected, onChange, icon: Icon }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handleOut = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch('') } }
    if (open) document.addEventListener('mousedown', handleOut)
    return () => document.removeEventListener('mousedown', handleOut)
  }, [open])

  const filtered = options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()))

  const toggle = opt => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  const selectAll = () => onChange(filtered.length === selected.length ? [] : [...filtered])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          background: 'var(--at-card)',
          border: '1px solid var(--at-border)',
          borderRadius: 24,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--at-muted)',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--at-border)'}
      >
        {Icon && <Icon style={{ fontSize: 11, color: C.primary }} />}
        {label}
        {selected.length > 0 && (
          <span style={{
            background: C.primary,
            color: '#fff',
            fontSize: 10,
            padding: '1px 7px',
            borderRadius: 20,
            fontWeight: 700,
            marginLeft: 2
          }}>{selected.length}</span>
        )}
        <FaChevronDown style={{
          fontSize: 8,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
          opacity: 0.5
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 200,
          minWidth: 220,
          maxWidth: 300,
          background: 'var(--at-card)',
          border: '1px solid var(--at-border)',
          borderRadius: 12,
          boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
          padding: 6,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--at-surface)',
            borderRadius: 8,
            marginBottom: 4
          }}>
            <FaSearch style={{ fontSize: 11, color: 'var(--at-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: 12,
                width: '100%',
                color: 'var(--at-text)'
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '2px 0' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: C.primary,
              borderBottom: '1px solid var(--at-border)',
              marginBottom: 2
            }}>
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.length === selected.length}
                onChange={selectAll}
                style={{ accentColor: C.primary }}
              />
              Select all
            </label>
            {filtered.map(opt => (
              <label key={opt} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--at-muted)',
                transition: 'background 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--at-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  style={{ accentColor: C.primary }}
                />
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
  const { t }                   = useTranslation()
  const { isAdmin, token }      = useAuth()
  const [dashboardMode, setDashboardMode] = useState('public')
  const [loading, setLoading]   = useState(true)
  const [data, setData]         = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const [fullscreen, setFullscreen]   = useState(false)
  const [activeTab, setActiveTab]     = useState(0)

  const [filterSector,          setFilterSector]          = useState([])
  const [filterCountry,         setFilterCountry]         = useState([])
  const [filterStatus,          setFilterStatus]          = useState([])
  const [filterTech,            setFilterTech]            = useState([])
  const [filterSdg,             setFilterSdg]             = useState([])
  const [filterRegion,          setFilterRegion]          = useState([])
  const [filterStakeholderType, setFilterStakeholderType] = useState([])
  const [filterDateFrom,        setFilterDateFrom]        = useState('')
  const [filterDateTo,          setFilterDateTo]          = useState('')

  const safeFetch = useCallback(async (url, fallback) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return fallback
      return await res.json()
    } catch { return fallback }
  }, [])

  const buildFilterQS = useCallback(() => {
    const p = new URLSearchParams()
    if (filterSector.length)  p.set('sector',     filterSector.join(','))
    if (filterCountry.length) p.set('country',    filterCountry.join(','))
    if (filterStatus.length)  p.set('status',     filterStatus.join(','))
    if (filterTech.length)    p.set('technology', filterTech.join(','))
    if (filterSdg.length)     p.set('sdg',        filterSdg[0])
    if (filterRegion.length)  p.set('region',     filterRegion.join(','))
    if (filterDateFrom)       p.set('date_from',  filterDateFrom)
    if (filterDateTo)         p.set('date_to',    filterDateTo)
    const qs = p.toString()
    return qs ? `?${qs}` : ''
  }, [filterSector, filterCountry, filterStatus, filterTech, filterSdg, filterRegion, filterDateFrom, filterDateTo])

  const fetchAllData = useCallback(async (qs = '') => {
    setLoading(true)
    try {
      const endpoints = {
        overview:              safeFetch(`${API_BASE}/api/analytics/overview${qs}`,                    null),
        projectsByCountry:     safeFetch(`${API_BASE}/api/analytics/projects-by-country${qs}`,         []),
        projectsBySector:      safeFetch(`${API_BASE}/api/analytics/projects-by-sector${qs}`,          []),
        aiTech:                safeFetch(`${API_BASE}/api/analytics/ai-technologies${qs}`,             []),
        projectsTimeline:      safeFetch(`${API_BASE}/api/analytics/projects-timeline${qs}`,           []),
        sdgCoverage:           safeFetch(`${API_BASE}/api/analytics/sdg-coverage${qs}`,               []),
        stakeholdersByType:    safeFetch(`${API_BASE}/api/analytics/stakeholders-by-type`,             []),
        statusDistribution:    safeFetch(`${API_BASE}/api/analytics/status-distribution${qs}`,         []),
        userSignups:           safeFetch(`${API_BASE}/api/analytics/user-signups`,                    []),
        usersByOrgType:        safeFetch(`${API_BASE}/api/analytics/users-by-organization-type`,      []),
        stakeholdersByCategory:safeFetch(`${API_BASE}/api/analytics/stakeholders-by-category`,        []),
        projectsByRegion:      safeFetch(`${API_BASE}/api/analytics/projects-by-region${qs}`,         []),
        resourcesByType:       safeFetch(`${API_BASE}/api/analytics/resources-by-type`,               []),
        mapData:               safeFetch(`${API_BASE}/api/analytics/map-data`,                        []),
      }
      const resolved = {}
      for (const [key, promise] of Object.entries(endpoints)) {
        resolved[key] = await promise
      }
      setData(resolved)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Analytics fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [safeFetch])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  const [debouncedQS, setDebouncedQS] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQS(buildFilterQS()), 400)
    return () => clearTimeout(t)
  }, [buildFilterQS])

  useEffect(() => { fetchAllData(debouncedQS) }, [debouncedQS, fetchAllData])

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
    sectors:          [...new Set((data.projectsBySector  || []).map(s => s.sector).filter(Boolean))],
    countries:        [...new Set((data.projectsByCountry || []).map(c => c.country).filter(Boolean))],
    statuses:         ['approved', 'pending', 'rejected', 'draft'],
    technologies:     [...new Set((data.aiTech            || []).map(t => t.technology).filter(Boolean))],
    sdgs:             [...new Set((data.sdgCoverage       || []).map(s => s.goal_number).filter(Boolean))].sort((a, b) => a - b),
    regions:          [...new Set((data.projectsByRegion  || []).map(r => r.region).filter(Boolean))],
    stakeholderTypes: [...new Set((data.stakeholdersByType|| []).map(s => s.type).filter(Boolean))],
  }), [data])

  if (loading) return <Loader />

  const tabs = [
    { label: 'Overview',       icon: FaChartBar    },
    { label: 'Users & Stakeholders', icon: FaUsers },
  ]

  return (
    <div style={{
      fontFamily: 'Inter, -apple-system, sans-serif',
      background: 'var(--at-bg)',
      minHeight: '100vh',
      color: 'var(--at-text)'
    }}>

      <div style={{
        background: 'var(--at-card)',
        borderBottom: '1px solid var(--at-border)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'var(--at-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            boxShadow: `0 4px 16px ${C.primary}30`
          }}>
            <FaChartBar />
          </div>
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Analytics Dashboard</div>
            <div style={{
              fontSize: 11,
              color: 'var(--at-muted)',
              fontWeight: 500
            }}>Arab ICT Observatory — Real-time intelligence</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            color: 'var(--at-muted)',
            padding: '5px 14px',
            background: 'var(--at-surface)',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--at-border)'
          }}>
            <FaClock style={{ fontSize: 10, opacity: 0.6 }} />
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--'}
          </span>
          <HeaderBtn icon={FaExpand}     onClick={toggleFullscreen} title="Fullscreen" />
          <HeaderBtn icon={FaFileExport} title="Export PDF" />
          <HeaderBtn icon={FaDownload}   onClick={() => exportCSV([])} title="Export CSV" />
          <HeaderBtn icon={FaSyncAlt}    onClick={() => fetchAllData(debouncedQS)} title="Refresh" primary />
        </div>
      </div>

      <div style={{
        background: 'var(--at-card)',
        borderBottom: '1px solid var(--at-border)',
        padding: '8px 24px',
        display: 'flex',
        gap: 4
      }}>
        <ModeBtn active={dashboardMode === 'public'} onClick={() => setDashboardMode('public')} icon={FaChartBar} label="Public Dashboard" />
        {isAdmin && (
          <ModeBtn active={dashboardMode === 'admin'} onClick={() => setDashboardMode('admin')} icon={FaUserShield} label="Admin Dashboard" />
        )}
      </div>

      {dashboardMode === 'admin' ? (
        <AdminDashboard token={token} />
      ) : (
        <>
          <div style={{
            background: 'var(--at-card)',
            borderBottom: '1px solid var(--at-border)',
            padding: '10px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
            position: 'sticky',
            top: 80,
            zIndex: 90,
            backdropFilter: 'blur(8px)',
            backgroundColor: 'var(--at-card)'
          }}>
            <FaFilter style={{ fontSize: 11, color: 'var(--at-muted)', marginRight: 4 }} />
            <MultiSelect label="Sector"      options={filterOptions.sectors}          selected={filterSector}          onChange={setFilterSector}          icon={FaLayerGroup}    />
            <MultiSelect label="Country"     options={filterOptions.countries}        selected={filterCountry}         onChange={setFilterCountry}         icon={FaGlobeAmericas} />
            <MultiSelect label="Status"      options={filterOptions.statuses}         selected={filterStatus}          onChange={setFilterStatus}          icon={FaCheckCircle}   />
            <MultiSelect label="Technology"  options={filterOptions.technologies}     selected={filterTech}            onChange={setFilterTech}            icon={FaMicrochip}     />
            <MultiSelect label="SDG"         options={filterOptions.sdgs}            selected={filterSdg}             onChange={setFilterSdg}             icon={FaFlag}          />
            <MultiSelect label="Region"      options={filterOptions.regions}          selected={filterRegion}          onChange={setFilterRegion}          icon={FaGlobeAmericas} />
            <MultiSelect label="Stakeholder" options={filterOptions.stakeholderTypes} selected={filterStakeholderType} onChange={setFilterStakeholderType} icon={FaUsers}         />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              background: 'var(--at-card)',
              border: '1px solid var(--at-border)',
              borderRadius: 24,
              fontSize: 12,
              color: 'var(--at-muted)'
            }}>
              <FaCalendarAlt style={{ fontSize: 11, color: C.primary }} />
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  width: 100,
                  color: 'var(--at-muted)',
                  padding: '2px 0'
                }}
              />
              <span style={{ opacity: 0.3 }}>—</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  width: 100,
                  color: 'var(--at-muted)',
                  padding: '2px 0'
                }}
              />
            </div>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 14px',
                background: `${C.danger}10`,
                border: `1px solid ${C.danger}30`,
                borderRadius: 24,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 500,
                color: C.danger,
                transition: 'all 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.danger}20`}
                onMouseLeave={e => e.currentTarget.style.background = `${C.danger}10`}
              >
                <FaTimes style={{ fontSize: 10 }} /> Clear {activeFilterCount}
              </button>
            )}
          </div>

          <div style={{
            background: 'var(--at-card)',
            borderBottom: '1px solid var(--at-border)',
            padding: '0 24px',
            display: 'flex',
            gap: 0
          }}>
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: activeTab === i ? 600 : 500,
                color: activeTab === i ? C.primary : 'var(--at-muted)',
                borderBottom: activeTab === i ? `2px solid ${C.primary}` : '2px solid transparent',
                transition: 'all 0.2s',
                position: 'relative'
              }}>
                <tab.icon style={{ fontSize: 13 }} />
                {tab.label}
                {activeTab === i && (
                  <span style={{
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`,
                    borderRadius: 2
                  }} />
                )}
              </button>
            ))}
          </div>

          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px 40px' }}>
            {activeTab === 0 && <OverviewDashboard data={data} t={t} />}
            {activeTab === 1 && <UserDashboard      data={data} t={t} />}
          </div>
        </>
      )}

      <style>{GLOBAL_CSS}</style>
    </div>
  )
}

function Loader() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--at-bg)',
      gap: 20
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid var(--at-border)',
        borderTopColor: C.primary,
        animation: 'at-spin .8s linear infinite'
      }} />
      <p style={{
        color: 'var(--at-muted)',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.3px'
      }}>Loading analytics...</p>
      <style>{`@keyframes at-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function HeaderBtn({ icon: Icon, onClick, title, primary }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 36,
        border: `1px solid ${primary ? C.primary : 'var(--at-border)'}`,
        background: primary ? C.primary : 'transparent',
        borderRadius: 10,
        cursor: 'pointer',
        color: primary ? '#fff' : 'var(--at-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        transition: 'all 0.15s',
        position: 'relative'
      }}
      onMouseEnter={e => {
        if (!primary) {
          e.currentTarget.style.borderColor = C.primary
          e.currentTarget.style.color = C.primary
          e.currentTarget.style.background = `${C.primary}08`
        }
      }}
      onMouseLeave={e => {
        if (!primary) {
          e.currentTarget.style.borderColor = 'var(--at-border)'
          e.currentTarget.style.color = 'var(--at-muted)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <Icon />
    </button>
  )
}

function ModeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 16px',
        border: `1px solid ${active ? C.primary : 'transparent'}`,
        borderRadius: 10,
        background: active ? `${C.primary}12` : 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        color: active ? C.primary : 'var(--at-muted)',
        transition: 'all 0.15s'
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--at-border)'
          e.currentTarget.style.background = 'var(--at-surface)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <Icon style={{ fontSize: 12 }} /> {label}
    </button>
  )
}

function OverviewDashboard({ data, t }) {
  const {
    overview, projectsByCountry, projectsBySector, aiTech,
    projectsTimeline, sdgCoverage, statusDistribution, mapData,
    stakeholdersByType, usersByOrgType
  } = data

  const totalProjects     = overview?.total_projects ?? 0
  const totalStakeholders = overview?.total_stakeholders ?? 0
  const totalResources    = overview?.total_resources ?? 0
  const activeCountries   = (projectsByCountry || []).length
  const techCount         = (aiTech || []).length

  const approvedCount = useMemo(() => {
    const sd = (statusDistribution || []).find(s => s.status === 'approved')
    return sd?.count ?? 0
  }, [statusDistribution])

  const sectorData   = useMemo(() => (projectsBySector  || []).map((s, i) => ({ ...s, fill: SECTOR_COLORS[s.sector] || C.chart[i % C.chart.length] })), [projectsBySector])
  const techData     = useMemo(() => (aiTech || []).slice(0, 10).map((t, i) => ({ ...t, fill: C.chart[i % C.chart.length] })), [aiTech])
  const topCountries = (projectsByCountry || []).slice(0, 10)
  const topSdgs      = useMemo(() => (sdgCoverage || []).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10), [sdgCoverage])

  const timelineData = useMemo(() =>
    (projectsTimeline || []).map(p => ({
      year: p.year,
      count: p.projects ?? p.count ?? 0
    })), [projectsTimeline])

  const treemapData = useMemo(() => [{
    name: 'AI Technologies',
    children: (aiTech || []).map(t => ({ name: t.technology, size: t.count }))
  }], [aiTech])

  const kpis = [
    { label: 'Total Projects',   value: totalProjects,     icon: FaProjectDiagram, color: C.primary,   delta: '+5%',  deltaUp: true, sparkData: projectsTimeline, subtitle: 'All tracked initiatives' },
    { label: 'Active Countries',  value: activeCountries,   icon: FaGlobeAmericas,  color: C.secondary, delta: '+2',  deltaUp: true, subtitle: 'Countries with projects' },
    { label: 'Stakeholders',     value: totalStakeholders, icon: FaUsers,          color: C.info,      delta: '+8%',  deltaUp: true, subtitle: 'Engaged partners' },
    { label: 'Total Resources',  value: totalResources,    icon: FaDownload,       color: C.success,   delta: '+7%',  deltaUp: true, subtitle: 'Available assets' },
    { label: 'Approved Projects',value: approvedCount,     icon: FaCheckCircle,    color: C.success,   delta: null,   subtitle: 'Active initiatives' },
    { label: 'AI Technologies',  value: techCount,         icon: FaMicrochip,      color: C.warning,   delta: null,   subtitle: 'Tech stack diversity' },
  ]

  const insights = [
    { Icon: FaBrain, bg: `${C.primary}12`, color: C.primary, text: `<strong>${totalProjects}</strong> projects tracked across <strong>${activeCountries}</strong> countries. <strong>${approvedCount}</strong> approved with <strong>${techCount}</strong> AI technologies.` },
    { Icon: FaRegLightbulb, bg: `${C.success}12`, color: C.success, text: sectorData.length > 0 ? `<strong>${sectorData[0].sector}</strong> leads by sector with <strong>${sectorData[0].count}</strong> initiatives.` : 'Sector data is being populated.' },
    { Icon: FaChartLine, bg: `${C.secondary}12`, color: C.secondary, text: topSdgs.length > 0 ? `SDG <strong>${topSdgs[0].goal_number}</strong> is the most addressed with <strong>${topSdgs[0].count}</strong> mapped initiatives.` : 'SDG data is being collected.' },
  ]

  function getMapColor(count) {
    if (count >= 50) return '#10B981'
    if (count >= 20) return '#6366F1'
    if (count >= 10) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <InsightBar insights={insights} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>

        <Card span={4}>
          <CardHeader icon={FaMapMarkerAlt} title="Arab Region Map" sub="Geographic distribution of AI projects" iconBg={`${C.primary}12`} iconColor={C.primary} badge={`${(mapData || []).length} locations`} />
          <div style={{ height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--at-border)' }}>
            <MapContainer center={[26, 30]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {(mapData || []).filter(p => p.latitude != null && p.longitude != null).map((point, i) => (
                <CircleMarker
                  key={i}
                  center={[point.latitude, point.longitude]}
                  radius={Math.sqrt(point.project_count || 1) * 4}
                  pathOptions={{ color: getMapColor(point.project_count || 0), fillColor: getMapColor(point.project_count || 0), fillOpacity: 0.5, weight: 1.5 }}
                >
                  <LTooltip direction="top" offset={[0, -10]}>
                    <span style={{ fontWeight: 600 }}>{point.country}</span>: {point.project_count || 0} projects
                  </LTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaGlobeAmericas} title="Top 10 Countries" sub="By project count" iconBg={`${C.secondary}12`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topCountries} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <YAxis type="category" dataKey="country" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 11, fontWeight: 500 }} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--at-surface)' }} />
              <Bar dataKey="projects" name="Projects" radius={[0, 6, 6, 0]} barSize={16}>
                {topCountries.map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaChartPie} title="Sector Distribution" sub="Projects by sector" iconBg={`${C.warning}12`} iconColor={C.warning} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={160} height={160} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="count" nameKey="sector" stroke="none">
                  {sectorData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList
                entries={sectorData.map(s => [s.sector, s.count])}
                colorFn={k => SECTOR_COLORS[k] || '#888'}
              />
            </div>
          </div>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaGlobeAmericas} title="Projects by Region" sub="Regional distribution" iconBg={`${C.secondary}12`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.projectsByRegion || []} margin={{ top: 4, right: 6, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
              <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 9 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]} barSize={28}>
                {(data.projectsByRegion || []).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaMicrochip} title="AI Technologies Treemap" sub="Technology adoption distribution" iconBg={`${C.primary}12`} iconColor={C.primary} badge={`${(aiTech || []).length} technologies`} />
          <ResponsiveContainer width="100%" height={240}>
            <Treemap
              data={treemapData}
              dataKey="size"
              nameKey="name"
              ratio={4/3}
              stroke="var(--at-card)"
              fill={C.primary}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaChartLine} title="Evolution by Year" sub="Project timeline" iconBg={`${C.primary}12`} iconColor={C.primary} badge={`${timelineData.reduce((a, b) => a + b.count, 0)} total`} />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timelineData} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="grad-evol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Projects" stroke={C.primary} strokeWidth={2} fill="url(#grad-evol)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaFlag} title="SDG Coverage" sub="Sustainable Development Goals" iconBg={`${C.success}12`} iconColor={C.success} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topSdgs} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <YAxis type="category" dataKey="goal_number" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 11, fontWeight: 500 }} tickFormatter={v => `SDG ${v}`} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Projects" radius={[0, 6, 6, 0]} barSize={16}>
                {topSdgs.map((e, i) => <Cell key={i} fill={e.color || SDG_COLORS[(e.goal_number - 1) % SDG_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaBuilding} title="Organization Types" sub="User distribution by organization" iconBg={`${C.warning}12`} iconColor={C.warning} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={usersByOrgType || []} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="type" stroke="none">
                  {(usersByOrgType || []).map((e, i) => <Cell key={i} fill={ORG_TYPE_COLORS[e.type] || C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList
                entries={(usersByOrgType || []).map(o => [o.type, o.count])}
                colorFn={k => ORG_TYPE_COLORS[k] || '#888'}
              />
            </div>
          </div>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaCheckCircle} title="Project Status" sub="Approved / Pending / Rejected" iconBg={`${C.success}12`} iconColor={C.success} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={(statusDistribution || []).filter(s => ['approved','pending','rejected'].includes(s.status))} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="status" stroke="none">
                  {(statusDistribution || []).filter(s => ['approved','pending','rejected'].includes(s.status)).map((e, i) => <Cell key={i} fill={C.status[e.status] || '#888'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList
                entries={(statusDistribution || []).filter(s => ['approved','pending','rejected'].includes(s.status)).map(s => [s.status.charAt(0).toUpperCase() + s.status.slice(1), s.count])}
                colorFn={(k) => C.status[k.toLowerCase()] || '#888'}
              />
            </div>
          </div>
        </Card>

      </div>
    </>
  )
}



function UserDashboard({ data, t }) {
  const {
    userSignups, usersByOrgType, stakeholdersByCategory,
    stakeholdersByType, statusDistribution, resourcesByType,
    overview
  } = data

  const signupChart = useMemo(() =>
    (userSignups || []).map(s => ({
      label: `${s.year}-${String(s.month).padStart(2, '0')}`,
      count: s.count, cumulative: s.cumulative
    })), [userSignups])

  const totalStakeholders = (stakeholdersByType || []).reduce((a, b) => a + b.count, 0)

  const kpis = [
    { label: 'Total Signups',     value: (userSignups || []).reduce((a, b) => a + b.count, 0), icon: FaUsers,        color: C.primary,   delta: '+10%', deltaUp: true, sparkData: userSignups, subtitle: 'New users' },
    { label: 'Organization Types',value: (usersByOrgType || []).length,                        icon: FaBuilding,     color: C.warning,   delta: null,   subtitle: 'Diversity' },
    { label: 'Stakeholders',      value: totalStakeholders,                                    icon: FaHandshake,    color: C.info,      delta: '+7%',  deltaUp: true, subtitle: 'Engaged partners' },
    { label: 'Stakeholder Types', value: (stakeholdersByType || []).length,                     icon: FaClipboardList,color: C.secondary, delta: null,   subtitle: 'Categories' },
    { label: 'Resource Types',    value: (resourcesByType || []).length,                       icon: FaDownload,     color: C.success,   delta: null,   subtitle: 'Asset diversity' },
    { label: 'Total Resources',   value: overview?.total_resources ?? 0,                       icon: FaRocket,       color: C.danger,    delta: '+12%', deltaUp: true, subtitle: 'Available assets' },
  ]

  const insights = [
    { Icon: FaBrain, bg: `${C.primary}12`, color: C.primary, text: `<strong>${totalStakeholders}</strong> total stakeholders across <strong>${(stakeholdersByType || []).length}</strong> types.` },
    { Icon: FaRegLightbulb, bg: `${C.success}12`, color: C.success, text: (stakeholdersByCategory || []).length > 0 ? `<strong>${stakeholdersByCategory.reduce((a, b) => a.count > b.count ? a : b).category}</strong> leads stakeholder categories with <strong>${stakeholdersByCategory.reduce((a, b) => a.count > b.count ? a : b).count}</strong>.` : 'Stakeholder data is being collected.' },
    { Icon: FaChartLine, bg: `${C.secondary}12`, color: C.secondary, text: (usersByOrgType || []).length > 0 ? `<strong>${usersByOrgType.reduce((a, b) => a.count > b.count ? a : b).type}</strong> is the dominant organization type.` : 'Organization data is being collected.' },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <InsightBar insights={insights} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>

        <Card span={2}>
          <CardHeader icon={FaChartLine} title="Signup Growth" sub="Monthly new users" iconBg={`${C.primary}12`} iconColor={C.primary} />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={signupChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="grad-signup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 9 }} interval={1} angle={-20} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Signups" stroke={C.primary} strokeWidth={2} fill="url(#grad-signup)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaBuilding} title="Organization Types" sub="User distribution" iconBg={`${C.warning}12`} iconColor={C.warning} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={usersByOrgType || []} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="type" stroke="none">
                  {(usersByOrgType || []).map((e, i) => <Cell key={i} fill={ORG_TYPE_COLORS[e.type] || C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList
                entries={(usersByOrgType || []).map(o => [o.type, o.count])}
                colorFn={k => ORG_TYPE_COLORS[k] || '#888'}
              />
            </div>
          </div>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaCheckCircle} title="Project Status" sub="Distribution by status" iconBg={`${C.success}12`} iconColor={C.success} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={(statusDistribution || []).filter(s => ['approved','pending','rejected'].includes(s.status))} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="status" stroke="none">
                  {(statusDistribution || []).filter(s => ['approved','pending','rejected'].includes(s.status)).map((e, i) => <Cell key={i} fill={C.status[e.status] || '#888'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList
                entries={(statusDistribution || []).filter(s => ['approved','pending','rejected'].includes(s.status)).map(s => [s.status.charAt(0).toUpperCase() + s.status.slice(1), s.count])}
                colorFn={(k) => C.status[k.toLowerCase()] || '#888'}
              />
            </div>
          </div>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaHandshake} title="Stakeholders by Category" sub="Category distribution" iconBg={`${C.secondary}12`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stakeholdersByCategory || []} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10, fontWeight: 500 }} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Stakeholders" radius={[0, 6, 6, 0]} barSize={16}>
                {(stakeholdersByCategory || []).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaUsers} title="Stakeholders by Type" sub="Stakeholder type breakdown" iconBg={`${C.primary}12`} iconColor={C.primary} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={stakeholdersByType || []} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="count" nameKey="type" stroke="none">
                  {(stakeholdersByType || []).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <HBarList
                entries={(stakeholdersByType || []).map(s => [s.type, s.count])}
                colorFn={(k, i) => C.chart[i % C.chart.length]}
              />
            </div>
          </div>
        </Card>

        <Card span={2}>
          <CardHeader icon={FaDownload} title="Resources by Type" sub="Distribution of resource types" iconBg={`${C.warning}12`} iconColor={C.warning} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resourcesByType || []} margin={{ top: 4, right: 6, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
              <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 9 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--at-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--at-surface)' }} />
              <Bar dataKey="count" name="Resources" radius={[4, 4, 0, 0]} barSize={28}>
                {(resourcesByType || []).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </>
  )
}

function LegItem({ color, label, dash }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--at-muted)' }}>
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
    --at-surface: #f1f5f9;
    --at-border: rgba(15,23,42,0.08);
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
  
  * {
    box-sizing: border-box;
  }
  
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: var(--at-border);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: var(--at-muted);
  }
  
  @keyframes at-spin {
    to { transform: rotate(360deg); }
  }
  
  .leaflet-container {
    height: 100%;
    width: 100%;
    border-radius: 12px;
    z-index: 1;
  }
`

export default memo(Analytics)