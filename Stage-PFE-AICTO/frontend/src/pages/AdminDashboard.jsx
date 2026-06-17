import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ComposedChart
} from 'recharts'
import {
  FaUsers, FaUserCheck, FaUserPlus, FaPercentage, FaProjectDiagram,
  FaClock, FaCheckCircle, FaTimesCircle, FaFlag, FaFileExport,
  FaDownload, FaFileExcel, FaFileCsv, FaFilePdf, FaSyncAlt,
  FaClipboardList, FaBuilding, FaGlobeAmericas, FaEnvelope,
  FaSearch, FaCheck, FaBan, FaEye, FaChartLine, FaChartBar,
  FaChartPie, FaCalendarAlt, FaArrowUp, FaArrowDown, FaStar,
  FaUserShield, FaChartArea, FaFilter
} from 'react-icons/fa'
import { API_BASE } from '../config'

const C = {
  primary:   '#185FA5',
  secondary: '#534AB7',
  success:   '#0F6E56',
  warning:   '#854F0B',
  danger:    '#993C1D',
  info:      '#1D9E75',
  chart: ['#378ADD','#7F77DD','#1D9E75','#EF9F27','#D85A30','#D4537E','#888780','#97C459','#BA7517'],
}

const adminTabs = [
  { id: 1, labelKey: 'Overview', icon: FaChartLine },
  { id: 2, labelKey: 'Management', icon: FaUsers },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null
  return (
    <div style={{ background: 'rgba(15,23,42,0.92)', borderRadius: 8, padding: '8px 12px', color: '#fff', border: '0.5px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
      <p style={{ fontWeight: 500, marginBottom: 4, opacity: .6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0' }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: p.color }}>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, delta, deltaUp }) {
  return (
    <div style={{
      background: 'var(--at-card)', border: '0.5px solid var(--at-border)',
      borderRadius: 12, padding: 14, position: 'relative', overflow: 'hidden',
      transition: 'border-color .2s, transform .2s'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--at-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
          <Icon />
        </div>
        {delta !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500,
            padding: '2px 6px', borderRadius: 20,
            color: deltaUp ? C.success : C.danger,
            background: deltaUp ? '#E1F5EE' : '#FAECE7'
          }}>
            {deltaUp ? <FaArrowUp style={{ fontSize: 8 }} /> : <FaArrowDown style={{ fontSize: 8 }} />}
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, marginBottom: 3, fontVariantNumeric: 'tabular-nums' }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: 'var(--at-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
    </div>
  )
}

function Card({ children, span, style = {} }) {
  return (
    <div style={{
      background: 'var(--at-card)', border: '0.5px solid var(--at-border)',
      borderRadius: 12, padding: 14, overflow: 'hidden',
      gridColumn: span ? `span ${span}` : undefined,
      display: 'flex', flexDirection: 'column',
      ...style
    }}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, iconBg, iconColor, title, sub, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: iconBg || '#E6F1FB', color: iconColor || C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
          <Icon />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
          {sub && <div style={{ fontSize: 10, color: 'var(--at-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {badge && (
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--at-surface)', color: 'var(--at-muted)' }}>{badge}</span>
      )}
    </div>
  )
}

function AdminDashboard({ token: propToken }) {
  const { t } = useTranslation()
  const [token, setTokenState] = useState(propToken || localStorage.getItem('access_token'))
  const [activeTab, setActiveTab] = useState(1)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [userMgmt, setUserMgmt] = useState(null)
  const [moderation, setModeration] = useState(null)
  const [signups, setSignups] = useState([])
  const [latestRegs, setLatestRegs] = useState([])
  const [platformStats, setPlatformStats] = useState(null)
  const [orgStatus, setOrgStatus] = useState([])
  const [notifications, setNotifications] = useState(null)
  const [lastLogins, setLastLogins] = useState([])
  const [downloadsTimeline, setDownloadsTimeline] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectProjectId, setRejectProjectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token])

  useEffect(() => {
    const stored = localStorage.getItem('access_token')
    if (!token && stored) setTokenState(stored)
  }, [token])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    const fetchAll = async () => {
      setLoading(true)
      const base = `${API_BASE}/api/analytics/admin`
      const h = authHeaders()
      const safe = async (url, fallback) => {
        try {
          const res = await fetch(url, { headers: { 'Authorization': h['Authorization'] } })
          if (!res.ok) return fallback
          return await res.json()
        } catch { return fallback }
      }
      const [ov, um, mod, su, lr, ps, ost, notif, ll, dt] = await Promise.all([
        safe(`${base}/overview`, null),
        safe(`${base}/user-management`, null),
        safe(`${base}/moderation`, null),
        safe(`${base}/user-signups`, []),
        safe(`${base}/latest-registrations`, []),
        safe(`${base}/platform-stats`, null),
        safe(`${base}/org-status`, []),
        safe(`${base}/notifications`, null),
        safe(`${base}/last-logins`, []),
        safe(`${base}/downloads-timeline`, []),
      ])
      if (ov) setOverview(ov)
      if (um) setUserMgmt(um)
      if (mod) setModeration(mod)
      if (su) setSignups(su)
      if (lr) setLatestRegs(lr)
      if (ps) setPlatformStats(ps)
      if (ost) setOrgStatus(ost)
      if (notif) setNotifications(notif)
      if (ll) setLastLogins(ll)
      if (dt) setDownloadsTimeline(dt)
      setLoading(false)
    }
    fetchAll()
  }, [token, authHeaders])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      const res = await fetch(`${API_BASE}/api/admin/projects/${id}/approve`, {
        method: 'PUT', headers: authHeaders()
      })
      if (!res.ok) throw new Error('Failed to approve')
      toast.success('Project approved')
      const mod = await (await fetch(`${API_BASE}/api/analytics/admin/moderation`, { headers: authHeaders() })).json()
      if (mod) setModeration(mod)
    } catch (e) {
      toast.error(e.message)
    }
    setActionLoading(null)
  }

  const openReject = (id) => { setRejectProjectId(id); setRejectReason(''); setShowRejectModal(true) }
  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason'); return }
    setActionLoading(rejectProjectId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/projects/${rejectProjectId}/reject`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      toast.success('Project rejected')
      setShowRejectModal(false)
      const mod = await (await fetch(`${API_BASE}/api/analytics/admin/moderation`, { headers: authHeaders() })).json()
      if (mod) setModeration(mod)
    } catch (e) {
      toast.error(e.message)
    }
    setActionLoading(null)
  }

  const formatLastLogin = useCallback((dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }, [])

  const signupChart = useMemo(() =>
    signups.map(s => ({
      label: `${s.year}-${String(s.month).padStart(2, '0')}`,
      count: s.count,
      cumulative: s.cumulative,
    })), [signups])

  const statusData = useMemo(() => overview ? [
    { name: 'Approved', value: overview.approved_projects, color: C.success },
    { name: 'Pending', value: overview.pending_projects, color: C.warning },
    { name: 'Rejected', value: overview.rejected_projects, color: C.danger },
  ].filter(d => d.value > 0) : [], [overview])

  const subTrends = useMemo(() => (moderation?.submissionTrends || []).map(s => ({
    label: `${s.year}-${String(s.month).padStart(2, '0')}`,
    count: s.count,
  })), [moderation])

  const topOrgs = useMemo(() => (userMgmt?.mostActiveUsers || []).slice(0, 10), [userMgmt])

  const userStatusData = useMemo(() => userMgmt ? [
    { name: 'Active', value: userMgmt.accountStatus?.find?.(s => s.status === 'active')?.count || 0, color: C.success },
    { name: 'Inactive', value: userMgmt.accountStatus?.find?.(s => s.status === 'inactive')?.count || 0, color: C.danger },
  ].filter(d => d.value > 0) : [], [userMgmt])

  const validationData = useMemo(() => overview ? [
    { name: 'Submitted', value: overview.total_projects || 0, color: C.primary },
    { name: 'Approved', value: overview.approved_projects || 0, color: C.success },
    { name: 'Rejected', value: overview.rejected_projects || 0, color: C.danger },
  ] : [], [overview])

  const topResourcesData = useMemo(() => (platformStats?.topResources || []).slice(0, 10), [platformStats])

  const usersByRoleData = useMemo(() => userMgmt?.usersByRole || [], [userMgmt])

  const orgStatusWithColors = useMemo(() =>
    orgStatus.map(s => ({
      ...s,
      color: s.status === 'Approved' ? '#10b981' : s.status === 'Pending' ? '#f59e0b' : '#ef4444',
    })), [orgStatus])

  const downloadsTimelineData = useMemo(() =>
    downloadsTimeline.map(d => ({
      label: `${d.year}-${String(d.month).padStart(2, '0')}`,
      count: d.count,
    })), [downloadsTimeline])

  const overviewKpis = useMemo(() => overview ? [
    { label: 'Registered Users', value: overview.total_users, icon: FaUsers, color: C.primary, delta: null },
    { label: 'Approved Orgs', value: orgStatus.find(s => s.status === 'Approved')?.count || 0, icon: FaBuilding, color: C.success, delta: null },
    { label: 'Pending Orgs', value: orgStatus.find(s => s.status === 'Pending')?.count || 0, icon: FaClock, color: C.warning, delta: null },
    { label: 'Activated Accounts', value: overview.active_users ?? 0, icon: FaUserCheck, color: C.info, delta: null },
    { label: 'Pending Projects', value: overview.pending_projects, icon: FaProjectDiagram, color: C.warning, delta: null },
    { label: 'Rejected Projects', value: overview.rejected_projects, icon: FaTimesCircle, color: C.danger, delta: null },
    { label: 'Approval Rate', value: `${overview.approval_rate}%`, icon: FaPercentage, color: C.info, delta: null },
    { label: 'Total Downloads', value: overview.total_downloads ?? 0, icon: FaDownload, color: C.secondary, delta: null },
    { label: 'Unread Notifications', value: notifications?.unread_count ?? 0, icon: FaEnvelope, color: C.chart[5], delta: null },
    { label: 'Last Login', value: lastLogins?.[0]?.last_login ? formatLastLogin(lastLogins[0].last_login) : 'N/A', icon: FaCalendarAlt, color: C.chart[7], delta: null },
  ] : [], [overview, orgStatus, notifications, lastLogins, formatLastLogin])

  const moderationKpis = useMemo(() => overview ? [
    { label: 'Pending Reviews', value: overview.pending_projects, icon: FaClock, color: C.warning, delta: null },
    { label: 'Approved Today', value: overview.approved_today ?? 0, icon: FaCheckCircle, color: C.success, delta: null },
    { label: 'Rejected Today', value: overview.rejected_today ?? 0, icon: FaTimesCircle, color: C.danger, delta: null },
    { label: 'Avg Review Time', value: `${overview.average_review_hours ?? 0}h`, icon: FaClock, color: C.info, delta: null },
  ] : [], [overview])

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--at-bg)' }}>
        <FaUserShield style={{ fontSize: 48, color: C.danger }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Admin Access Required</h2>
        <p style={{ color: 'var(--at-muted)', fontSize: 13 }}>Please log in with an admin account to access the Admin Dashboard.</p>
        <a href="/auth.html" style={{ padding: '10px 24px', background: C.primary, color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Sign In</a>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--at-bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--at-border)', borderTopColor: C.primary, borderRadius: '50%', animation: 'at-spin .8s linear infinite' }} />
        <p style={{ color: 'var(--at-muted)', fontSize: 13, fontWeight: 500 }}>Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', background: 'var(--at-bg)', minHeight: '60vh', color: 'var(--at-text)' }}>
      <style>{ADMIN_CSS}</style>

      <div style={{ background: 'var(--at-card)', borderBottom: '0.5px solid var(--at-border)', padding: '0 20px', display: 'flex', gap: 2, position: 'sticky', top: 0, zIndex: 90 }}>
        {adminTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? C.primary : 'var(--at-muted)',
            borderBottom: activeTab === tab.id ? `2px solid ${C.primary}` : '2px solid transparent',
            transition: 'color .15s'
          }}>
            <tab.icon style={{ fontSize: 11 }} />
            {tab.labelKey}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 20px 40px' }}>
        {activeTab === 1 && renderOverview()}
        {activeTab === 2 && renderManagement()}
      </div>

      {showRejectModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div style={{
            background: 'var(--at-card)', borderRadius: 14, padding: 20, width: 400,
            border: '0.5px solid var(--at-border)', boxShadow: '0 16px 48px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Reject Project</h3>
            <textarea
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid var(--at-border)', resize: 'vertical', fontFamily: 'inherit', fontSize: 12, background: 'var(--at-surface)', color: 'var(--at-text)' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setShowRejectModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--at-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--at-muted)' }}>Cancel</button>
              <button onClick={handleReject}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.danger, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500 }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function renderOverview() {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {overviewKpis.map((k, i) => <KpiCard key={i} {...k} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <Card span={2}>
            <CardHeader icon={FaChartLine} title="User Registration Evolution" sub="Monthly user signups" iconBg="#E6F1FB" iconColor={C.primary} />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={signupChart} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 9 }} angle={-30} textAnchor="end" interval={1} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2.5} dot={{ fill: C.primary, r: 3 }} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaChartArea} title="Project Submission Evolution" sub="Monthly project submissions" iconBg="#E1F5EE" iconColor={C.success} />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={subTrends} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
                <defs>
                  <linearGradient id="admin-grad-sub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.primary} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 9 }} angle={-30} textAnchor="end" interval={1} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2} fill="url(#admin-grad-sub)" name="Submissions" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaFlag} title="Validation Workflow" sub="Submitted \u2192 Approved \u2192 Rejected" iconBg="#FAEEDA" iconColor={C.warning} />
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={validationData} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Projects" radius={[5, 5, 0, 0]} barSize={50}>
                  {validationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader icon={FaBuilding} title="Organization Status" sub="Org approval breakdown" iconBg="#EEEDFE" iconColor={C.secondary} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={orgStatusWithColors} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="count" nameKey="status" stroke="none">
                    {orgStatusWithColors.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader icon={FaUsers} title="Users by Type" sub="Role distribution" iconBg="#FAEEDA" iconColor={C.warning} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={usersByRoleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="count" nameKey="role" stroke="none">
                    {usersByRoleData.map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaStar} title="Top Organizations" sub="Most active organizations" iconBg="#FAEEDA" iconColor={C.warning} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topOrgs} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis type="category" dataKey="organization_name" axisLine={false} tickLine={false} tick={{ fill: '#555', fontSize: 9 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="project_count" fill={C.secondary} radius={[0, 5, 5, 0]} barSize={16} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaDownload} title="Most Downloaded Resources" sub="Top resources by downloads" iconBg="#E1F5EE" iconColor={C.success} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topResourcesData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis type="category" dataKey="title" axisLine={false} tickLine={false} tick={{ fill: '#555', fontSize: 9 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="downloads" fill={C.info} radius={[0, 5, 5, 0]} barSize={16} name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card span={4}>
            <CardHeader icon={FaGlobeAmericas} title="Activity by Country" sub="User distribution by country" iconBg="#EEEDFE" iconColor={C.secondary} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={userMgmt?.usersByCountry || []} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
                <XAxis dataKey="country" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 9 }} angle={-30} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={C.primary} radius={[3, 3, 0, 0]} barSize={20} name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </>
    )
  }

  function renderManagement() {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {moderationKpis.map((k, i) => <KpiCard key={i} {...k} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <Card span={2}>
            <CardHeader icon={FaGlobeAmericas} title="Users by Country" sub="Geographic distribution" iconBg="#EEEDFE" iconColor={C.secondary} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userMgmt?.usersByCountry || []} margin={{ top: 6, right: 6, left: 0, bottom: 6 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis type="category" dataKey="country" axisLine={false} tickLine={false} tick={{ fill: '#555', fontSize: 10 }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={16}>
                  {(userMgmt?.usersByCountry || []).map((entry, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader icon={FaUserCheck} title="Account Status" sub="Active vs Inactive" iconBg="#E1F5EE" iconColor={C.success} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={userStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                    {userStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader icon={FaBuilding} title="Users by Role" sub="Role distribution" iconBg="#FAEEDA" iconColor={C.warning} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={userMgmt?.usersByRole || []} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    paddingAngle={3} dataKey="count" nameKey="role" stroke="none">
                    {(userMgmt?.usersByRole || []).map((e, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaClock} title="Pending Queue" sub={`${moderation?.pendingQueue?.length || 0} projects awaiting review`} iconBg="#FAEEDA" iconColor={C.warning} />
            <div style={{ maxHeight: 260, overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Title', 'Organization', 'Sector', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--at-muted)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '0.5px solid var(--at-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(moderation?.pendingQueue || []).map(p => (
                    <tr key={p.id} style={{ borderBottom: '0.5px solid var(--at-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.title}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--at-muted)' }}>{p.organization}</td>
                      <td style={{ padding: '6px 8px' }}><span style={{ background: 'var(--at-surface)', color: 'var(--at-muted)', padding: '2px 7px', borderRadius: 20, fontSize: 10 }}>{p.sector}</span></td>
                      <td style={{ padding: '6px 8px' }}>
                        <button onClick={() => handleApprove(p.id)} disabled={actionLoading === p.id}
                          style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: C.success, color: '#fff', cursor: 'pointer', fontSize: 10, marginRight: 4 }}>
                          <FaCheck style={{ fontSize: 9 }} />
                        </button>
                        <button onClick={() => openReject(p.id)} disabled={actionLoading === p.id}
                          style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: C.danger, color: '#fff', cursor: 'pointer', fontSize: 10 }}>
                          <FaBan style={{ fontSize: 9 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!moderation?.pendingQueue || moderation.pendingQueue.length === 0) && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--at-muted)', fontSize: 12 }}>No pending projects</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader icon={FaCheckCircle} title="Recently Approved" sub="Last 20 approved" iconBg="#E1F5EE" iconColor={C.success} />
            <div style={{ maxHeight: 200, overflowY: 'auto', flex: 1 }}>
              {(moderation?.recentlyApproved || []).slice(0, 6).map(p => (
                <div key={p.id} style={{ padding: '5px 0', borderBottom: '0.5px solid var(--at-border)', fontSize: 11 }}>
                  <strong>{p.title}</strong>
                  <div style={{ color: 'var(--at-muted)', fontSize: 10 }}>{p.organization} · {p.moderated_at?.split('T')[0]}</div>
                </div>
              ))}
              {!(moderation?.recentlyApproved || []).length && (
                <p style={{ textAlign: 'center', padding: 16, color: 'var(--at-muted)', fontSize: 12 }}>No approved projects</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={FaTimesCircle} title="Recently Rejected" sub="Last 20 rejected" iconBg="#FAECE7" iconColor={C.danger} />
            <div style={{ maxHeight: 200, overflowY: 'auto', flex: 1 }}>
              {(moderation?.recentlyRejected || []).slice(0, 6).map(p => (
                <div key={p.id} style={{ padding: '5px 0', borderBottom: '0.5px solid var(--at-border)', fontSize: 11 }}>
                  <strong>{p.title}</strong>
                  <div style={{ color: C.danger, fontSize: 10 }}>{p.rejection_reason}</div>
                  <div style={{ color: 'var(--at-muted)', fontSize: 10 }}>{p.moderated_at?.split('T')[0]}</div>
                </div>
              ))}
              {!(moderation?.recentlyRejected || []).length && (
                <p style={{ textAlign: 'center', padding: 16, color: 'var(--at-muted)', fontSize: 12 }}>No rejected projects</p>
              )}
            </div>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaUserPlus} title="Latest Registrations" sub="Most recent user signups" iconBg="#E6F1FB" iconColor={C.primary} badge={`${(latestRegs || []).length} users`} />
            <div style={{ maxHeight: 260, overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Organization', 'Email', 'Role', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--at-muted)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '0.5px solid var(--at-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(latestRegs || []).slice(0, 8).map(u => (
                    <tr key={u.id} style={{ borderBottom: '0.5px solid var(--at-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{u.organization_name}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--at-muted)' }}>{u.email}</td>
                      <td style={{ padding: '6px 8px' }}><span style={{ background: 'var(--at-surface)', color: 'var(--at-muted)', padding: '2px 7px', borderRadius: 20, fontSize: 10 }}>{u.role}</span></td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ color: u.is_active ? C.success : C.danger, fontSize: 10, fontWeight: 500 }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--at-muted)', fontSize: 10 }}>{u.created_at?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card span={2}>
            <CardHeader icon={FaStar} title="Most Active Users" sub="Users with most projects" iconBg="#FAEEDA" iconColor={C.warning} />
            <div style={{ maxHeight: 260, overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Organization', 'Email', 'Country', 'Projects'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--at-muted)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '0.5px solid var(--at-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(userMgmt?.mostActiveUsers || []).slice(0, 8).map((u, i) => (
                    <tr key={u.id || i} style={{ borderBottom: '0.5px solid var(--at-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{u.organization_name}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--at-muted)' }}>{u.email}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--at-muted)' }}>{u.country}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{u.project_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card span={4}>
            <CardHeader icon={FaChartBar} title="Submission Trends" sub="Monthly project submissions" iconBg="#E6F1FB" iconColor={C.primary} badge={`${subTrends.reduce((a, b) => a + b.count, 0)} total`} />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={subTrends} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--at-border)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 9 }} angle={-30} textAnchor="end" interval={1} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={C.primary} radius={[3, 3, 0, 0]} barSize={16} name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </>
    )
  }
}

const ADMIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --at-bg:      #f4f6f9;
    --at-card:    #ffffff;
    --at-surface: #f1f5f9;
    --at-border:  rgba(15,23,42,0.1);
    --at-text:    #0f172a;
    --at-muted:   #64748b;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --at-bg:      #0f172a;
      --at-card:    #1e293b;
      --at-surface: #334155;
      --at-border:  rgba(255,255,255,0.08);
      --at-text:    #f1f5f9;
      --at-muted:   #94a3b8;
    }
  }

  * { box-sizing: border-box; }

  @keyframes at-spin { to { transform: rotate(360deg); } }
`

export default memo(AdminDashboard)
