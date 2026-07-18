import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ComposedChart
} from 'recharts'
import {
  FaProjectDiagram, FaGlobeAmericas, FaBuilding, FaRocket,
  FaArrowUp, FaArrowDown, FaChartLine, FaUsers, FaClipboardList,
  FaHandshake, FaCheckCircle, FaTimesCircle,
  FaPercentage, FaDownload,
  FaMapMarkerAlt, FaLightbulb, FaMicrochip, FaChartPie,
  FaClock, FaExclamationTriangle, FaFilter, FaLink,
  FaUserGraduate, FaChartArea, FaFlag, FaSyncAlt,
  FaRegLightbulb, FaBrain, FaUserShield,
  FaTable, FaStar, FaFileCsv, FaGripLines,
  FaThLarge, FaList, FaCircle, FaDotCircle,
  FaChartBar
} from 'react-icons/fa'

import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip } from 'react-leaflet'

import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const C = {
  primary:   '#4F46E5',
  secondary: '#7C3AED',
  success:   '#059669',
  warning:   '#D97706',
  danger:    '#DC2626',
  info:      '#0891B2',
  pink:      '#EC4899',
  background: '#F1F5F9',
  cardBg:    '#FFFFFF',
  chart:     ['#4F46E5','#7C3AED','#059669','#D97706','#DC2626','#EC4899','#0891B2','#8B5CF6','#34D399','#F472B6'],
  status: { approved: '#059669', pending: '#D97706', rejected: '#DC2626' }
}

const SECTOR_COLORS = {
  Healthcare: '#4F46E5', Education: '#7C3AED', Agriculture: '#059669',
  Finance: '#D97706', Energy: '#DC2626', Transport: '#0891B2',
  Government: '#EC4899', Environment: '#34D399', 'Smart Cities': '#F472B6'
}

const ORG_TYPE_COLORS = {
  NGO: '#059669', Startup: '#7C3AED', Company: '#4F46E5',
  Government: '#D97706', University: '#EC4899', 'Research Lab': '#34D399'
}

const SDG_COLORS = [
  '#E5243B','#DDA63A','#4C9F38','#C5192D','#FF3A21','#26BDE2',
  '#FCC30B','#A21942','#FD6925','#DD1367','#FD9D24','#BF8B2E',
  '#3F7E44','#0A97D9','#56C02B','#00689D','#19486A'
]

const SHADOW = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
const SHADOW_HOVER = '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)'
const RADIUS = 12

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



const cardStyle = {
  background: '#fff', borderRadius: RADIUS, padding: '20px 22px',
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
      borderRadius: 10, padding: '12px 16px', color: '#fff',
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

const KpiCardModern = memo(({ label, value, icon: Icon, color, percentage, sparkData }) => {
  const [isHovered, setIsHovered] = useState(false)
  const isPositive = percentage > 0

  return (
    <div style={{
      ...cardStyle,
      position: 'relative',
      overflow: 'hidden',
      borderLeft: `4px solid ${color}`,
      ...(isHovered ? cardHover : {})
    }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 6,
            fontSize: 12,
            fontWeight: 600,
            color: isPositive ? C.success : C.danger
          }}>
            {isPositive ? <FaArrowUp style={{ fontSize: 10 }} /> : <FaArrowDown style={{ fontSize: 10 }} />}
            {Math.abs(percentage)}%
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}15`, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          transition: 'transform 0.3s',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)'
        }}>
          <Icon />
        </div>
      </div>
      {sparkData && (
        <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.3 }}>
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  )
})



const TrendChartCard = ({ data, title = 'Projects Timeline' }) => {
  const hasRealData = data && data.length > 0
  const chartData = hasRealData ? data : [
    { year: '2014', seriesA: 75, seriesB: 65, seriesC: 56 },
    { year: '2015', seriesA: 80, seriesB: 70, seriesC: 60 },
    { year: '2016', seriesA: 85, seriesB: 75, seriesC: 65 },
    { year: '2017', seriesA: 90, seriesB: 80, seriesC: 70 },
    { year: '2018', seriesA: 95, seriesB: 85, seriesC: 75 },
    { year: '2019', seriesA: 88, seriesB: 82, seriesC: 72 },
    { year: '2020', seriesA: 92, seriesB: 78, seriesC: 68 },
  ]

  return (
    <div style={{ ...cardStyle, padding: '16px 20px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#64748b' }}
          />
          {hasRealData ? (
            <Bar dataKey="projects" name="Projects" fill="#4F46E5" radius={[4, 4, 0, 0]} />
          ) : (
            <>
              <Bar dataKey="seriesA" name="Series A" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="seriesB" name="Series B" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="seriesC" name="Series C" fill="#EC4899" radius={[4, 4, 0, 0]} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

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

function Analytics() {
  const { t } = useTranslation()
  const { isAdmin, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)

  const safeFetch = useCallback(async (url, fallback) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(url, { headers })
      if (!res.ok) return fallback
      return await res.json()
    } catch { return fallback }
  }, [token])

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      const adminFetch = safeFetch
      const endpoints = {
        overview:              safeFetch(`${API_BASE}/api/analytics/overview`, null),
        projectsByCountry:     safeFetch(`${API_BASE}/api/analytics/projects-by-country`, []),
        projectsBySector:      safeFetch(`${API_BASE}/api/analytics/projects-by-sector`, []),
        aiTech:                safeFetch(`${API_BASE}/api/analytics/ai-technologies`, []),
        projectsTimeline:      safeFetch(`${API_BASE}/api/analytics/projects-timeline`, []),
        sdgCoverage:           safeFetch(`${API_BASE}/api/analytics/sdg-coverage`, []),
        stakeholdersByType:    safeFetch(`${API_BASE}/api/analytics/stakeholders-by-type`, []),
        statusDistribution:    safeFetch(`${API_BASE}/api/analytics/status-distribution`, []),
        userSignups:           safeFetch(`${API_BASE}/api/analytics/user-signups`, []),
        usersByOrgType:        safeFetch(`${API_BASE}/api/analytics/users-by-organization-type`, []),
        stakeholdersByCategory: safeFetch(`${API_BASE}/api/analytics/stakeholders-by-category`, []),
        projectsByRegion:      safeFetch(`${API_BASE}/api/analytics/projects-by-region`, []),
        resourcesByType:       safeFetch(`${API_BASE}/api/analytics/resources-by-type`, []),
        mapData:               safeFetch(`${API_BASE}/api/analytics/map-data`, []),
        recentUsers:           safeFetch(`${API_BASE}/api/analytics/recent-users`, []),
        activeUsers:           safeFetch(`${API_BASE}/api/analytics/activation-rate`, {}),
        usersByCountry:        safeFetch(`${API_BASE}/api/analytics/users-by-country`, []),
        userKpis:              adminFetch(`${API_BASE}/api/analytics/admin/user-kpis`, {}),
        approvalTimeline:      adminFetch(`${API_BASE}/api/analytics/admin/approval-timeline`, []),
        usersBySector:         adminFetch(`${API_BASE}/api/analytics/admin/users-by-sector`, []),
        userEngagement:        adminFetch(`${API_BASE}/api/analytics/admin/user-engagement`, []),
        stakeholderRoles:      adminFetch(`${API_BASE}/api/analytics/admin/stakeholder-roles`, []),
        orphanStakeholders:    adminFetch(`${API_BASE}/api/analytics/admin/orphan-stakeholders`, []),
        accountsToWatch:       adminFetch(`${API_BASE}/api/analytics/admin/accounts-to-watch`, []),
        projectKpis:           adminFetch(`${API_BASE}/api/analytics/admin/project-kpis`, {}),
        projectFunnel:         adminFetch(`${API_BASE}/api/analytics/admin/project-funnel`, {}),
        moderationVelocity:    adminFetch(`${API_BASE}/api/analytics/admin/moderation-velocity`, []),
        resourceKpis:          adminFetch(`${API_BASE}/api/analytics/admin/resource-kpis`, {}),
        resourcesByCategory:   adminFetch(`${API_BASE}/api/analytics/admin/resources-by-category`, []),
        resourcesByLanguage:   adminFetch(`${API_BASE}/api/analytics/admin/resources-by-language`, []),
        topResources:          adminFetch(`${API_BASE}/api/analytics/admin/top-resources`, []),
        sdgSectorHeatmap:      adminFetch(`${API_BASE}/api/analytics/admin/sdg-sector-heatmap`, []),
        projectDurationStats:  adminFetch(`${API_BASE}/api/analytics/admin/project-duration-stats`, {}),
        projectConnectivity:   adminFetch(`${API_BASE}/api/analytics/admin/project-connectivity`, {}),
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
  }, [safeFetch, isAdmin])

  const hasFetched = useRef(false)
  const prevToken = useRef(null)
  const [tab, setTab] = useState('projects')

  useEffect(() => {
    if (!hasFetched.current || (token && !prevToken.current)) {
      hasFetched.current = true
      fetchAllData()
    }
    prevToken.current = token
  }, [fetchAllData, token])

  console.log('Analytics render: loading=', loading, 'data keys=', Object.keys(data))
  if (loading) return <Loader t={t} />

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', background: '#F1F5F9', minHeight: '100vh', color: '#0f172a' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#0f172a' }}>Analytics Dashboard</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Arab ICT Observatory — Key metrics &amp; insights</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </span>
            <button onClick={fetchAllData} style={{
              padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
              background: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              color: '#64748b', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#64748b' }}
            >
              <FaSyncAlt style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 48px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[
            { key: 'projects', label: 'Projects', icon: FaProjectDiagram },
            ...(isAdmin ? [{ key: 'users', label: 'Users & Stakeholders', icon: FaUsers }] : [])
          ].map(tabDef => (
            <button key={tabDef.key} onClick={() => setTab(tabDef.key)} style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === tabDef.key ? C.primary : '#fff',
              color: tab === tabDef.key ? '#fff' : '#64748b',
              boxShadow: tab === tabDef.key ? `0 4px 14px ${C.primary}35` : '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
              letterSpacing: '-0.01em'
            }}>
              <tabDef.icon style={{ fontSize: 14 }} />
              {tabDef.label}
            </button>
          ))}
        </div>
        {(tab === 'users' && isAdmin) ? <UsersDashboard data={data} t={t} /> : <ProjectsDashboard data={data} t={t} />}
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  )
}

function Loader({ t }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', gap: 20 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.06)', borderTopColor: C.primary, animation: 'at-spin .8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, letterSpacing: '0.3px' }}>{t('analytics.loadingAnalytics')}</p>
      <style>{`@keyframes at-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ProjectsDashboard({ data, t }) {
  const {
    overview, projectsByCountry, projectsBySector, aiTech,
    projectsTimeline, sdgCoverage, statusDistribution, mapData,
    projectKpis, projectFunnel, moderationVelocity,
    resourceKpis, resourcesByCategory, resourcesByLanguage, topResources,
    sdgSectorHeatmap, projectDurationStats, projectConnectivity,
  } = data

  const pk = projectKpis || {}
  const pf = projectFunnel || {}
  const rk = resourceKpis || {}
  const pd = projectDurationStats || {}
  const pc = projectConnectivity || {}
  const pds = pd
  const pieData = [
    { name: 'Actifs', value: pds.active_count ?? 0 },
    { name: 'Clôturés', value: pds.closed_count ?? 0 },
  ].filter(d => d.value > 0)

  const kpis = [
    { label: 'Total projets', value: (overview?.total_projects ?? 0).toLocaleString(), icon: FaProjectDiagram, color: C.primary, insight: "Volume de l'activité" },
    { label: "Taux d'approbation", value: `${pk.approval_rate ?? 0}%`, icon: FaCheckCircle, color: C.success, insight: 'Qualité des soumissions' },
    { label: 'Délai modération', value: `${pk.avg_moderation_delay_days ?? 0}j`, icon: FaClock, color: C.warning, insight: 'Efficacité du processus' },
    { label: 'Backlog en attente', value: (pk.pending_backlog ?? 0).toLocaleString(), icon: FaClipboardList, color: C.info, insight: 'Charge de travail' },
    { label: 'Backlog critique >30j', value: (pk.critical_backlog_count ?? 0).toLocaleString(), icon: FaExclamationTriangle, color: C.danger, insight: 'Alerte modération' },
    { label: 'Couverture ODD', value: `${pk.sdg_coverage_rate ?? 0}%`, icon: FaFlag, color: C.secondary, insight: "Alignement aux objectifs ONU" },
  ]

  const funnelData = pf.submitted ? [
    { stage: 'Soumis', value: pf.submitted, fill: '#94a3b8' },
    { stage: 'En attente', value: pf.pending, fill: C.warning },
    { stage: 'Approuvé', value: pf.approved, fill: C.success },
    { stage: 'Rejeté', value: pf.rejected, fill: C.danger },
  ] : []

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section A — KPIs Projets &amp; Ressources</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${k.color}`, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{k.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>{k.insight}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}15`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><k.icon /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section B — Pipeline &amp; Qualité</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaFilter} title="Funnel de conversion" sub="Soumis → Approuvé/Rejeté" iconBg={`${C.info}10`} iconColor={C.info} />
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Projets" radius={[4, 4, 0, 0]} barSize={36}>
                  {funnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
            Taux de conversion: <strong>{pf.conversion_rate ?? 0}%</strong>
          </div>
        </Card>
        <Card>
          <CardHeader icon={FaClock} title="Vélocité de modération" sub="Délai moyen (jours)" iconBg={`${C.warning}10`} iconColor={C.warning} />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={moderationVelocity || []} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={m => String(m).padStart(2,'0')} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="j" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="avg_delay_days" name="Délai moyen" stroke={C.warning} strokeWidth={2} dot={{ r: 3, fill: C.warning }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader icon={FaChartLine} title="Volume vs Qualité" sub="Soumissions mensuelles + taux approbation" iconBg={`${C.primary}10`} iconColor={C.primary} />
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={moderationVelocity || []} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={m => String(m).padStart(2,'0')} />
              <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="r" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="l" dataKey="count" name="Modérés" fill={C.primary} radius={[4, 4, 0, 0]} barSize={16} />
              <Line yAxisId="r" type="monotone" dataKey="avg_delay_days" name="Délai (j)" stroke={C.warning} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section C — Répartition géographique &amp; thématique</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 0' }}>
            <CardHeader icon={FaGlobeAmericas} title="Carte des projets" sub="Répartition par pays" iconBg={`${C.primary}10`} iconColor={C.primary} />
          </div>
          <div style={{ height: 320, margin: '0 8px 8px' }}>
            {mapData && mapData.length > 0 ? (
              <MapContainer center={[26, 42]} zoom={3.2} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', borderRadius: 12 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapData.filter(c => c.latitude && c.longitude).map((c, i) => (
                  <CircleMarker key={i} center={[c.latitude, c.longitude]} radius={Math.max(4, Math.sqrt(c.project_count || 1) * 3)} pathOptions={{ color: C.primary, fillColor: `${C.primary}60`, fillOpacity: 0.5, weight: 1.5 }}>
                    <LTooltip permanent={false} direction="top" offset={[0, -8]}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{c.country}: {c.project_count} projets</span>
                    </LTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
            )}
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader icon={FaChartPie} title="Top 10 pays" sub="Projets par pays" iconBg={`${C.success}10`} iconColor={C.success} />
            {projectsByCountry && projectsByCountry.length > 0 ? (
              <HBarList entries={projectsByCountry.slice(0, 10).map(p => [p.country, p.projects])} t={t} />
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
            )}
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              HHI — Indice de concentration: {(() => {
                const total = (projectsByCountry || []).reduce((s, p) => s + p.projects, 0)
                if (!total) return '\u2014'
                const hhi = (projectsByCountry || []).reduce((s, p) => s + (p.projects / total * 100) ** 2, 0)
                return hhi.toFixed(0)
              })()}
            </span>
            <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              {projectsByCountry?.length ?? 0} pays actifs
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaChartPie} title="Secteurs" sub="Distribution" iconBg={`${C.warning}10`} iconColor={C.warning} />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(projectsBySector || []).slice(0, 6)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="sector" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(projectsBySector || []).slice(0, 6).map((e, i) => <Cell key={i} fill={SECTOR_COLORS[e.sector] || C.chart[i % C.chart.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader icon={FaMicrochip} title="AI Technologies" sub="Top 5" iconBg={`${C.secondary}10`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(aiTech || []).slice(0, 5)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="technology" axisLine={false} tickLine={false} tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 500 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Projects" radius={[0, 4, 4, 0]} barSize={18}>
                {(aiTech || []).slice(0, 5).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaFlag} title="Top 10 ODD" sub="ODD les plus présents dans les projets" iconBg={`${C.success}10`} iconColor={C.success} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...(sdgCoverage || [])].sort((a, b) => b.count - a.count).slice(0, 10)} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="goal_number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Projets" radius={[4, 4, 0, 0]} barSize={20}>
                {[...(sdgCoverage || [])].sort((a, b) => b.count - a.count).slice(0, 10).map((e, i) => <Cell key={i} fill={SDG_COLORS[(e.goal_number - 1) % SDG_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader icon={FaChartPie} title="Statut des projets" sub="Approuvé / En attente / Rejeté" iconBg={`${C.danger}10`} iconColor={C.danger} />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(statusDistribution || []).filter(s => s.status !== 'draft')} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="status" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(statusDistribution || []).filter(s => s.status !== 'draft').map((e, i) => {
                  const colors = { approved: C.success, pending: C.warning, rejected: C.danger }
                  return <Cell key={i} fill={colors[e.status] || C.chart[i]} />
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section D — Cycle de vie &amp; Durée</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaClock} title="Durée d'exécution" sub="Statut actif vs clôturé" iconBg={`${C.info}10`} iconColor={C.info} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
            <div style={{ flex: 1 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" nameKey="name" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((e, i) => <Cell key={i} fill={i === 0 ? C.success : C.info} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ ...cardStyle, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Durée moyenne</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{pds.avg_duration_days ?? 0}j</div>
              </div>
              <div style={{ ...cardStyle, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Avec dates</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{pds.with_dates_count ?? 0}</div>
              </div>
              <div style={{ ...cardStyle, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Taux d'activité</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{pds.active_rate ?? 0}%</div>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader icon={FaChartArea} title="Évolution par année" sub="Projets soumis par an" iconBg={`${C.primary}10`} iconColor={C.primary} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectsTimeline || []} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="projects" name="Projets" fill={C.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section E — Ressources documentaires</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${C.primary}`, padding: 18 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>Total ressources</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{(rk.total_resources ?? 0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>Volume documentaire</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaChartBar} title="Ressources par catégorie" sub="Répartition par catégorie" iconBg={`${C.secondary}10`} iconColor={C.secondary} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={resourcesByCategory || []} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Nb ressources" fill={C.primary} radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaChartPie} title="Répartition par langue" sub="Langues des ressources" iconBg={`${C.success}10`} iconColor={C.success} />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(resourcesByLanguage || []).slice(0, 6)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="language" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(resourcesByLanguage || []).slice(0, 6).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader icon={FaLink} title="Lien Projets ↔ Ressources ↔ Stakeholders" sub="Connectivité de l'écosystème" iconBg={`${C.secondary}10`} iconColor={C.secondary} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '8px 0' }}>
            <div style={{ ...cardStyle, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Projets documentés</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{pc.documented_rate ?? 0}%</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{pc.with_documents ?? 0} / {overview?.total_projects ?? 0}</div>
            </div>
            <div style={{ ...cardStyle, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Densité de partenariat</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{pc.avg_stakeholders_per_project ?? 0}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>stakeholders / projet</div>
            </div>
          </div>
          {sdgSectorHeatmap && sdgSectorHeatmap.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Heatmap ODD × Secteur (top combinaisons)</div>
              <HBarList entries={(() => {
                const grouped = {}
                sdgSectorHeatmap.forEach(d => {
                  const key = `ODD${d.sdg_id} × ${d.sector}`
                  grouped[key] = (grouped[key] || 0) + d.count
                })
                return Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 8)
              })()} t={t} />
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

function UsersDashboard({ data, t }) {
  const {
    userSignups, usersByOrgType, stakeholdersByCategory,
    usersByCountry, activeUsers, recentUsers,
    userKpis, approvalTimeline, usersBySector,
    userEngagement, stakeholderRoles, orphanStakeholders, accountsToWatch,
  } = data

  const kpis = [
    { label: 'Total organisations', value: (userKpis?.total_users ?? 0).toLocaleString(), icon: FaUsers, color: C.primary, insight: 'Taille de la base' },
    { label: "Taux d'approbation", value: `${userKpis?.approval_rate ?? 0}%`, icon: FaCheckCircle, color: C.success, insight: 'Charge de modération' },
    { label: "Taux d'activation", value: `${userKpis?.activation_rate ?? 0}%`, icon: FaRocket, color: C.secondary, insight: 'Santé de la base' },
    { label: 'Conversion stakeholder', value: `${userKpis?.stakeholder_conversion_rate ?? 0}%`, icon: FaHandshake, color: C.warning, insight: "% d'orgs reliées à l'écosystème" },
    { label: 'Taux de dormance', value: `${userKpis?.dormancy_rate ?? 0}%`, icon: FaTimesCircle, color: C.danger, insight: 'Risque de churn' },
    { label: 'Croissance MoM', value: `${userKpis?.mom_growth ?? 0}%`, icon: FaChartLine, color: C.info, insight: "Tendance d'acquisition" },
  ]

  const activeContributors = userEngagement?.filter(u => u.total_engagement > 0).length ?? 0
  const totalUsers = userKpis?.total_users ?? 1
  const activeContributorRate = Math.round(activeContributors / totalUsers * 100)
  const owners = userEngagement?.filter(u => u.projects_owned > 0).length ?? 0
  const partners = userEngagement?.filter(u => u.projects_owned === 0 && u.projects_as_stakeholder > 0).length ?? 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section A — KPIs</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${k.color}`, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{k.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>{k.insight}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}15`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><k.icon /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section B — Croissance &amp; Acquisition</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaChartArea} title="Signup Growth" sub="Inscriptions mensuelles + Cumul" iconBg={`${C.info}10`} iconColor={C.info} />
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={userSignups || []} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={m => String(m).padStart(2,'0')} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="count" name="Signups" stroke={C.primary} fill={`${C.primary}20`} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumul" stroke={C.success} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader icon={FaCheckCircle} title="Approbation dans le temps" sub="Taux d'approbation mensuel" iconBg={`${C.success}10`} iconColor={C.success} />
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={approvalTimeline || []} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={m => String(m).padStart(2,'0')} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="approval_rate" name="Taux d'approbation" stroke={C.success} strokeWidth={2} dot={{ r: 3, fill: C.success }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section C — Répartition organisationnelle</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaBuilding} title="Par type d'organisation" sub="" iconBg={`${C.secondary}10`} iconColor={C.secondary} />
          {usersByOrgType && usersByOrgType.length > 0 ? (
            <HBarList entries={usersByOrgType.map(u => [u.type, u.count])} colorFn={(k) => ORG_TYPE_COLORS[k] || C.chart[0]} t={t} />
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
        </Card>
        <Card>
          <CardHeader icon={FaChartPie} title="Par secteur" sub="Secteur d'activité" iconBg={`${C.warning}10`} iconColor={C.warning} />
          {usersBySector && usersBySector.length > 0 ? (
            <HBarList entries={usersBySector.map(s => [s.sector, s.count])} t={t} />
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
        </Card>
        <Card>
          <CardHeader icon={FaGlobeAmericas} title="Par pays" sub="Pays des organisations" iconBg={`${C.success}10`} iconColor={C.success} />
          {usersByCountry && usersByCountry.length > 0 ? (
            <HBarList entries={usersByCountry.map(c => [c.country, c.count])} t={t} />
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section D — Engagement réel</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.success}15`, color: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><FaUsers /></div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Taux d'organisations actives contributrices</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{activeContributorRate}%</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{activeContributors} / {totalUsers} organisations</div>
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.warning}15`, color: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><FaHandshake /></div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Ratio porteur vs partenaire</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{owners > 0 ? (owners / Math.max(partners, 1)).toFixed(1) : 0}x</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{owners} porteurs · {partners} partenaires passifs</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section E — Stakeholders</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <CardHeader icon={FaBuilding} title="Top Stakeholders" sub="Par implication projets" iconBg={`${C.warning}10`} iconColor={C.warning} />
          {stakeholdersByCategory && stakeholdersByCategory.length > 0 ? (
            <HBarList entries={stakeholdersByCategory.slice(0, 10).map(s => [s.category, s.count])} t={t} />
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
        </Card>
        <Card>
          <CardHeader icon={FaCheckCircle} title="Rôles dans les projets" sub="Répartition" iconBg={`${C.info}10`} iconColor={C.info} />
          {stakeholderRoles && stakeholderRoles.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stakeholderRoles} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="role" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stakeholderRoles.map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
        </Card>
        <Card>
          <CardHeader icon={FaUsers} title="Stakeholders orphelins" sub="Sans compte plateforme" iconBg={`${C.danger}10`} iconColor={C.danger} />
          {orphanStakeholders?.total_stakeholders > 0 ? (
            <div style={{ padding: '0 4px' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{orphanStakeholders.orphan_rate ?? 0}%</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{orphanStakeholders.orphan_count ?? 0} / {orphanStakeholders.total_stakeholders ?? 0} stakeholders</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>Partenaires référencés mais pas encore onboardés → liste d'acquisition</div>
              {orphanStakeholders.orphans?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {orphanStakeholders.orphans.slice(0, 5).map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: 12 }}>
                      <span style={{ fontWeight: 500, color: '#0f172a' }}>{s.name}</span>
                      <span style={{ color: '#94a3b8' }}>{s.type}{s.country ? ` · ${s.country}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
          )}
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section F — Dernières connexions</div>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <CardHeader icon={FaRocket} title="Top 3 utilisateurs actifs" sub="Les plus engagés (projets portés + stakeholder)" iconBg={`${C.success}10`} iconColor={C.success} />
        </div>
        {userEngagement && userEngagement.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}></th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Stakeholders</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Pays</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Dernière connexion</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Portés</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {[...userEngagement]
                  .sort((a, b) => new Date(b.last_login || 0) - new Date(a.last_login || 0))
                  .slice(0, 3).map((u, i) => {
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
                  const initials = (u.organization_name || '?').charAt(0).toUpperCase()
                  return (
                    <tr key={u.id || i} style={{ borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '10px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.logo ? (
                            <img src={u.logo} alt="" style={{
                              width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                              border: `2px solid ${rankColors[i]}`, flexShrink: 0,
                            }} />
                          ) : (
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${rankColors[i]}44, ${rankColors[i]}22)`,
                              border: `2px solid ${rankColors[i]}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 13, color: '#0f172a', flexShrink: 0,
                            }}>{initials}</div>
                          )}
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: rankColors[i],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#fff',
                            position: 'relative', left: -8,
                          }}>{i + 1}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 20px', fontWeight: 500, color: '#0f172a', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.organization_name || '\u2014'}</td>
                      <td style={{ padding: '10px 20px', color: '#64748b' }}>{u.organization_type || '\u2014'}</td>
                      <td style={{ padding: '10px 20px', color: '#64748b' }}>{u.country || '\u2014'}</td>
                      <td style={{ padding: '10px 20px' }}>
                        <span style={{ color: '#64748b' }}>
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : '\u2014'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: u.projects_owned > 0 ? C.success : '#94a3b8' }}>{u.projects_owned || 0}</td>
                      <td style={{ padding: '10px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: u.is_active ? '#05966915' : '#D9770615',
                          color: u.is_active ? '#059669' : '#D97706'
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.is_active ? '#059669' : '#D97706' }} />
                          {u.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 }}>{t('analytics.noData')}</p>
        )}
      </Card>
    </>
  )
}

const GLOBAL_CSS = `
  :root {
    --at-bg: #F1F5F9;
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

export default Analytics
