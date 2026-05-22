import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap,
  ComposedChart
} from 'recharts'
import {
  FaProjectDiagram, FaBuilding, FaGlobeAmericas, FaRocket,
  FaInfoCircle, FaArrowUp, FaChartLine, FaUsers, FaClipboardList,
  FaLayerGroup, FaHandshake, FaCheckCircle, FaTimesCircle,
  FaClock, FaPercentage, FaCalendarAlt, FaSortAmountDown,
  FaMapMarkerAlt, FaLightbulb, FaChartBar, FaChartPie,
  FaUserGraduate, FaChartArea
} from 'react-icons/fa'

const API_BASE = 'http://localhost:8000'

const COLORS = {
  primary: '#2563eb', secondary: '#7c3aed', success: '#10b981',
  warning: '#f59e0b', danger: '#ef4444', info: '#06b6d4',
  slate: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
  chart: ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#6366f1'],
  status: { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444', draft: '#94a3b8', unknown: '#94a3b8' }
}

const STATUS_LABELS = {
  pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté', draft: 'Brouillon'
}

const DASHBOARDS = [
  { id: 1, label: 'Dashboard 1', title: 'Vue d\'ensemble des projets', icon: FaClipboardList },
  { id: 2, label: 'Dashboard 2', title: 'Impact & ODD Stratégique', icon: FaLayerGroup },
  { id: 3, label: 'Dashboard 3', title: 'Communauté & Acteurs', icon: FaUsers },
]

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <div className="tooltip-divider"></div>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            <span className="dot" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

function CustomTreemapContent(props) {
  const { root, depth, x, y, width, height, index, colors, name, value } = props
  if (depth > 1) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: colors[index % colors.length], stroke: '#fff', strokeWidth: 2 / (depth + 1e-10), strokeOpacity: 1 / (depth + 1e-10) }} />
      {width > 50 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>
            {value} projets
          </text>
        </>
      )}
    </g>
  )
}

function Analytics() {
  const [activeDashboard, setActiveDashboard] = useState(1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})

  const safeFetch = async (url, fallback) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return fallback
      return await res.json()
    } catch { return fallback }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const allEndpoints = {
        overview: safeFetch(`${API_BASE}/api/analytics/overview`, null),
        statusDistribution: safeFetch(`${API_BASE}/api/analytics/status-distribution`, []),
        projectsByCountry: safeFetch(`${API_BASE}/api/analytics/projects-by-country`, []),
        projectsBySector: safeFetch(`${API_BASE}/api/analytics/projects-by-sector`, []),
        aiTech: safeFetch(`${API_BASE}/api/analytics/ai-technologies`, []),
        timeline: safeFetch(`${API_BASE}/api/analytics/projects-timeline`, []),
        submissionsByMonth: safeFetch(`${API_BASE}/api/analytics/submissions-by-month`, []),
        moderationQueue: safeFetch(`${API_BASE}/api/analytics/moderation-queue`, []),
        approvedRejected: safeFetch(`${API_BASE}/api/analytics/approved-rejected-by-month`, []),
        sdgCoverage: safeFetch(`${API_BASE}/api/analytics/sdg-coverage`, []),
        projectsByRegion: safeFetch(`${API_BASE}/api/analytics/projects-by-region`, []),
        regionSdg: safeFetch(`${API_BASE}/api/analytics/region-sdg-dominant`, []),
        techBySector: safeFetch(`${API_BASE}/api/analytics/technology-by-sector`, []),
        durationVsSdg: safeFetch(`${API_BASE}/api/analytics/duration-vs-sdg`, []),
        activeTimeline: safeFetch(`${API_BASE}/api/analytics/projects-active-timeline`, []),
        avgDuration: safeFetch(`${API_BASE}/api/analytics/average-project-duration`, { avg_duration_days: 0 }),
        orgsActive: safeFetch(`${API_BASE}/api/analytics/organizations-active`, { count: 0 }),
        userSignups: safeFetch(`${API_BASE}/api/analytics/user-signups`, []),
        usersByOrgType: safeFetch(`${API_BASE}/api/analytics/users-by-organization-type`, []),
        usersByCountry: safeFetch(`${API_BASE}/api/analytics/users-by-country`, []),
        stakeholdersByCategory: safeFetch(`${API_BASE}/api/analytics/stakeholders-by-category`, []),
        stakeholdersByType: safeFetch(`${API_BASE}/api/analytics/stakeholders-by-type`, []),
        projectsPerUser: safeFetch(`${API_BASE}/api/analytics/projects-per-user`, { distribution: [], average: 0 }),
        recentUsers: safeFetch(`${API_BASE}/api/analytics/recent-users`, []),
        activeUsers: safeFetch(`${API_BASE}/api/analytics/active-users`, { active_30_days: 0, total_users: 0 }),
        activationRate: safeFetch(`${API_BASE}/api/analytics/activation-rate`, { activation_rate: 0 }),
      }
      const resolved = {}
      for (const [key, promise] of Object.entries(allEndpoints)) {
        resolved[key] = await promise
      }
      setData(resolved)
    } catch (err) {
      console.error('Failed to fetch analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="analytics-loading">
      <div className="loader-orbit"><div className="orbit-dot"></div></div>
      <p>Gathering Intelligence...</p>
      <style>{`
        .analytics-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: white; gap: 24px; font-family: 'Outfit', sans-serif; }
        .loader-orbit { width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; position: relative; animation: rotate 2s linear infinite; }
        .orbit-dot { width: 10px; height: 10px; background: #2563eb; border-radius: 50%; position: absolute; top: -5px; left: 25px; box-shadow: 0 0 15px #2563eb; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )

  const { overview } = data

  // ──── Dashboard 1 — Vue d'ensemble des projets Admin ────
  const Dashboard1 = () => {
    const { statusDistribution, projectsByCountry, projectsBySector, submissionsByMonth, moderationQueue, approvedRejected, aiTech } = data

    const d1Kpis = overview ? [
      { label: 'Total Projets', value: overview.total_projects, icon: FaProjectDiagram, color: COLORS.primary },
      { label: 'En attente modération', value: overview.pending_count, icon: FaClock, color: COLORS.warning },
      { label: 'Approuvés ce mois', value: overview.approved_this_month, icon: FaCheckCircle, color: COLORS.success },
      { label: 'Rejetés ce mois', value: overview.rejected_this_month, icon: FaTimesCircle, color: COLORS.danger },
      { label: 'Délai moyen modération', value: `${overview.average_moderation_hours}h`, icon: FaClock, color: COLORS.info },
      { label: "Taux d'approbation", value: `${overview.approval_rate}%`, icon: FaPercentage, color: COLORS.secondary },
    ] : []

    const statusData = (statusDistribution || []).map(s => ({
      ...s,
      label: STATUS_LABELS[s.status] || s.status,
      fill: COLORS.status[s.status] || COLORS.slate[3]
    }))

    const submissionsChart = (submissionsByMonth || []).map(s => ({
      label: `${s.year}-${String(s.month).padStart(2, '0')}`,
      count: s.count
    }))

    return (
      <>
        <div className="kpi-row kpi-6">
          {d1Kpis.map((kpi, index) => (
            <div key={index} className="premium-kpi-card">
              <div className="kpi-card-inner">
                <div className="kpi-icon-box" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  <kpi.icon />
                </div>
                <div className="kpi-data">
                  <span className="kpi-label">{kpi.label}</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{kpi.value ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="kpi-progress-bar">
                <div className="progress-fill" style={{ width: '100%', backgroundColor: kpi.color }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Répartition par statut</h3>
                <p>Proportion instantanée des projets</p>
              </div>
            </div>
            <div className="chart-wrapper flex-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={100}
                    paddingAngle={6} dataKey="count" nameKey="label" stroke="none">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="custom-legend">
              {statusData.map((entry, i) => (
                <div key={i} className="legend-row">
                  <span className="legend-dot" style={{ backgroundColor: entry.fill }}></span>
                  <span className="legend-name">{entry.label}</span>
                  <span className="legend-val">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Projets par pays</h3>
                <p>Répartition géographique des initiatives</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={projectsByCountry} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="country" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 11 }} interval={0} angle={-40} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                  <Bar dataKey="projects" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={28}
                    name="Projets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Projets par secteur</h3>
                <p>Volume par domaine d'activité</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectsBySector} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <YAxis type="category" dataKey="sector" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 12 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 6, 6, 0]} barSize={20}
                    name="Projets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Soumissions par mois</h3>
                <p>Évolution temporelle des dépôts de projets</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={submissionsChart}>
                  <defs>
                    <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[3], fontSize: 11 }} angle={-45} textAnchor="end" interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={3}
                    fillOpacity={1} fill="url(#colorSubmissions)" name="Soumissions" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Technologies clés</h3>
                <p>Technologies les plus utilisées</p>
              </div>
            </div>
            <div className="tech-list-premium">
              {(aiTech || []).slice(0, 8).map((tech, i) => (
                <div key={i} className="tech-item-row">
                  <div className="tech-name-box">
                    <span className="tech-rank">{i + 1}</span>
                    <span className="tech-name">{tech.technology}</span>
                  </div>
                  <div className="tech-bar-wrap">
                    <div className="tech-bar-fill" style={{
                      width: `${(tech.count / Math.max(...(aiTech || []).map(t => t.count))) * 100}%`,
                      backgroundColor: COLORS.chart[i % COLORS.chart.length]
                    }}></div>
                  </div>
                  <span className="tech-count">{tech.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Approuvés vs Rejetés</h3>
                <p>Par mois avec motif de rejet</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={approvedRejected || []} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[3], fontSize: 11 }} angle={-45} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="approved" fill={COLORS.success} name="Approuvés" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="rejected" fill={COLORS.danger} name="Rejetés" radius={[4, 4, 0, 0]} barSize={16} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>File de modération</h3>
                <p>Projets en attente triés par soumission</p>
              </div>
            </div>
            <div className="mod-table-wrapper">
              <table className="mod-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Organisation</th>
                    <th>Pays</th>
                    <th>Secteur</th>
                    <th>Soumis le</th>
                  </tr>
                </thead>
                <tbody>
                  {(moderationQueue || []).length === 0 ? (
                    <tr><td colSpan={5} className="empty-row">Aucun projet en attente</td></tr>
                  ) : (
                    (moderationQueue || []).slice(0, 8).map(p => (
                      <tr key={p.id}>
                        <td className="td-title">{p.title}</td>
                        <td>{p.organization}</td>
                        <td><span className="badge-country">{p.country}</span></td>
                        <td>{p.sector}</td>
                        <td className="td-date">{p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ──── Dashboard 2 — Impact & ODD Stratégique ────
  const Dashboard2 = () => {
    const { sdgCoverage, projectsByRegion, regionSdg, techBySector, durationVsSdg, activeTimeline, avgDuration, orgsActive, aiTech } = data

    const radarData = (sdgCoverage || []).map(s => ({
      subject: `ODD ${s.goal_number}`,
      value: s.count,
      fullTitle: s.title,
      color: s.color
    }))

    const topSdgs = (sdgCoverage || []).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10)

    const techSectorData = (techBySector || []).map(t => ({
      name: `${t.technology} (${t.sector})`,
      size: t.count,
      sector: t.sector,
      technology: t.technology
    }))

    const scatterData = (durationVsSdg || []).map(d => ({
      x: d.duration_days,
      y: d.sdg_count,
      name: d.title,
      sector: d.sector,
      z: 200
    }))

    const durationData = (activeTimeline || []).map(p => ({
      ...p,
      start: new Date(p.start_date).getTime(),
      end: new Date(p.end_date).getTime(),
      duration: (new Date(p.end_date) - new Date(p.start_date)) / (1000 * 60 * 60 * 24)
    })).sort((a, b) => a.start - b.start).slice(0, 30)

    const sectorColors = {
      'Healthcare': '#06b6d4', 'Education': '#8b5cf6', 'Agriculture': '#10b981',
      'Finance': '#f59e0b', 'Energy': '#ef4444', 'Transport': '#6366f1',
      'Government': '#ec4899', 'Environment': '#14b8a6', 'Smart Cities': '#f97316'
    }

    const d2Kpis = [
      { label: 'ODD les plus couverts', value: topSdgs[0]?.goal_number ? `ODD ${topSdgs[0].goal_number}` : '-', icon: FaLightbulb, color: '#10b981' },
      { label: 'Projets avec ODD', value: (sdgCoverage || []).reduce((a, b) => a + b.count, 0), icon: FaProjectDiagram, color: COLORS.primary },
      { label: 'Régions actives', value: (projectsByRegion || []).length, icon: FaGlobeAmericas, color: COLORS.secondary },
      { label: 'Durée moyenne (jours)', value: avgDuration?.avg_duration_days ?? 0, icon: FaClock, color: COLORS.warning },
      { label: 'Organisations actives', value: orgsActive?.count ?? 0, icon: FaBuilding, color: COLORS.info },
      { label: 'Technologies utilisées', value: (aiTech || []).length, icon: FaChartBar, color: COLORS.danger },
    ]

    return (
      <>
        <div className="kpi-row kpi-6">
          {d2Kpis.map((kpi, i) => (
            <div key={i} className="premium-kpi-card">
              <div className="kpi-card-inner">
                <div className="kpi-icon-box" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  <kpi.icon />
                </div>
                <div className="kpi-data">
                  <span className="kpi-label">{kpi.label}</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{kpi.value ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="kpi-progress-bar">
                <div className="progress-fill" style={{ width: '100%', backgroundColor: kpi.color }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Radar - Couverture ODD</h3>
                <p>Les 17 Objectifs de Développement Durable</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: COLORS.slate[2], fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: COLORS.slate[3], fontSize: 10 }} />
                  <Radar name="Projets" dataKey="value" stroke={COLORS.primary}
                    fill={COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Top ODD</h3>
                <p>Classement par nombre de projets</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topSdgs} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <YAxis type="category" dataKey="goal_number" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 12 }}
                    tickFormatter={(v) => `ODD ${v}`} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Projets" radius={[0, 6, 6, 0]} barSize={18}>
                    {topSdgs.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS.chart[i % COLORS.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Technologies × Secteurs</h3>
                <p>Volume de projets par croisement technologique</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <Treemap data={techSectorData} dataKey="size" aspectRatio={4 / 3}
                  stroke="#fff" fill="#2563eb" content={<CustomTreemapContent colors={COLORS.chart} />}>
                  <Tooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Projets par région</h3>
                <p>Intensité ODD dominante par région</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectsByRegion} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="region" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Projets" radius={[6, 6, 0, 0]} barSize={28}>
                    {(projectsByRegion || []).map((entry, i) => {
                      const r = (regionSdg || []).find(rs => rs.region === entry.region)
                      return <Cell key={i} fill={r?.dominant_sdg_color || COLORS.chart[i % COLORS.chart.length]} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="region-legend">
              {(regionSdg || []).filter(r => r.dominant_sdg).map((r, i) => (
                <div key={i} className="legend-row">
                  <span className="legend-dot" style={{ backgroundColor: r.dominant_sdg_color }}></span>
                  <span className="legend-name">{r.region}: ODD {r.dominant_sdg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Durée vs Nombre d'ODD</h3>
                <p>Corrélation entre durée du projet et ODD alignés</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="x" name="Durée (jours)" unit=" j"
                    axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Nb ODD"
                    axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 11 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 200]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={scatterData} fill={COLORS.primary} fillOpacity={0.7} name="Projets" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Timeline projets actifs</h3>
                <p>Chronologie simplifiée par secteur</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={durationData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="title" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[3], fontSize: 9 }} interval={0} angle={-50} textAnchor="end" height={80} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 11 }}
                    unit=" j" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="duration" name="Durée (jours)" radius={[4, 4, 0, 0]} barSize={16}>
                    {durationData.map((entry, i) => (
                      <Cell key={i} fill={sectorColors[entry.sector] || COLORS.chart[i % COLORS.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ──── Dashboard 3 — Communauté & Acteurs Réseau ────
  const Dashboard3 = () => {
    const { userSignups, usersByOrgType, usersByCountry, stakeholdersByCategory,
      stakeholdersByType, projectsPerUser, recentUsers, activeUsers, activationRate, overview } = data

    const signupChart = (userSignups || []).map(s => ({
      label: `${s.year}-${String(s.month).padStart(2, '0')}`,
      count: s.count,
      cumulative: s.cumulative
    }))

    const orgTypeColors = {
      'NGO': '#10b981', 'Startup': '#8b5cf6', 'Company': '#2563eb',
      'Government': '#f59e0b', 'University': '#ec4899', 'Research Lab': '#06b6d4'
    }

    const d3Kpis = [
      { label: 'Nouveaux inscrits (total)', value: (userSignups || []).reduce((a, b) => a + b.count, 0), icon: FaUsers, color: COLORS.primary },
      { label: 'Utilisateurs actifs (30j)', value: activeUsers?.active_30_days ?? 0, icon: FaUserGraduate, color: COLORS.success },
      { label: "Taux d'activation", value: `${activationRate?.activation_rate ?? 0}%`, icon: FaPercentage, color: COLORS.secondary },
      { label: 'Types organisation', value: (usersByOrgType || []).length, icon: FaBuilding, color: COLORS.warning },
      { label: 'Stakeholders by type', value: (stakeholdersByType || []).reduce((a, b) => a + b.count, 0), icon: FaHandshake, color: COLORS.info },
      { label: 'Projets/utilisateur (moy)', value: projectsPerUser?.average ?? 0, icon: FaProjectDiagram, color: COLORS.danger },
    ]

    const stakeholderCategoryData = (stakeholdersByCategory || []).map(s => ({
      ...s,
      fill: COLORS.chart[(stakeholdersByCategory || []).indexOf(s) % COLORS.chart.length]
    }))

    const recentUsersList = (recentUsers || []).slice(0, 10)

    return (
      <>
        <div className="kpi-row kpi-6">
          {d3Kpis.map((kpi, i) => (
            <div key={i} className="premium-kpi-card">
              <div className="kpi-card-inner">
                <div className="kpi-icon-box" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  <kpi.icon />
                </div>
                <div className="kpi-data">
                  <span className="kpi-label">{kpi.label}</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{kpi.value ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="kpi-progress-bar">
                <div className="progress-fill" style={{ width: '100%', backgroundColor: kpi.color }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Croissance des inscrits</h3>
                <p>Évolution cumulative et mensuelle</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={signupChart} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[3], fontSize: 11 }} angle={-45} textAnchor="end" interval={2} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill={COLORS.primary} name="Nouveaux inscrits" radius={[4, 4, 0, 0]} barSize={12} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.success}
                    strokeWidth={3} name="Cumulatif" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Type d'organisation</h3>
                <p>Répartition des utilisateurs</p>
              </div>
            </div>
            <div className="chart-wrapper flex-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={usersByOrgType} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                    paddingAngle={4} dataKey="count" nameKey="type" stroke="none">
                    {(usersByOrgType || []).map((entry, i) => (
                      <Cell key={i} fill={orgTypeColors[entry.type] || COLORS.chart[i % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="custom-legend">
              {(usersByOrgType || []).map((entry, i) => (
                <div key={i} className="legend-row">
                  <span className="legend-dot" style={{
                    backgroundColor: orgTypeColors[entry.type] || COLORS.chart[i % COLORS.chart.length]
                  }}></span>
                  <span className="legend-name">{entry.type}</span>
                  <span className="legend-val">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Stakeholders par catégorie</h3>
                <p>Répartition catégorielle</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stakeholderCategoryData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <YAxis type="category" dataKey="category" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 11 }} width={140} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Stakeholders" radius={[0, 6, 6, 0]} barSize={18}>
                    {stakeholderCategoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Répartition géographique</h3>
                <p>Utilisateurs par pays</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usersByCountry} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="country" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 10 }} interval={0} angle={-40} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Utilisateurs" radius={[6, 6, 0, 0]} barSize={24}
                    fill={COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Projets soumis par utilisateur</h3>
                <p>Distribution de l'engagement</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={projectsPerUser?.distribution || []} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="range" axisLine={false} tickLine={false}
                    tick={{ fill: COLORS.slate[2], fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.slate[3], fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Utilisateurs" radius={[6, 6, 0, 0]} barSize={36}
                    fill={COLORS.info} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Utilisateurs récents</h3>
                <p>Triés par dernière connexion</p>
              </div>
            </div>
            <div className="mod-table-wrapper">
              <table className="mod-table">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Type</th>
                    <th>Pays</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Dernière connexion</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsersList.length === 0 ? (
                    <tr><td colSpan={6} className="empty-row">Aucun utilisateur</td></tr>
                  ) : (
                    recentUsersList.map(u => (
                      <tr key={u.id}>
                        <td className="td-title">{u.organization_name}</td>
                        <td><span className="badge-org-type">{u.organization_type}</span></td>
                        <td>{u.country || '-'}</td>
                        <td><span className={`badge-role ${u.role}`}>{u.role}</span></td>
                        <td>
                          <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`}></span>
                          {u.is_active ? 'Actif' : 'Inactif'}
                        </td>
                        <td className="td-date">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Jamais'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="premium-analytics">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-flex">
            <div className="title-area">
              <div className="breadcrumb">Analytics / Tableaux de bord</div>
              <h1>Pilotage <span className="text-gradient">Stratégique</span></h1>
              <p>Indicateurs clés et visualisations pour le suivi des projets, ODD et communauté.</p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={fetchAllData}><FaChartLine /> Rafraîchir</button>
            </div>
          </div>

          <div className="dashboard-tabs">
            {DASHBOARDS.map(db => {
              const Icon = db.icon
              return (
                <button key={db.id}
                  className={`tab-btn ${activeDashboard === db.id ? 'active' : ''}`}
                  onClick={() => setActiveDashboard(db.id)}>
                  <Icon />
                  <div className="tab-text">
                    <span className="tab-label">{db.label}</span>
                    <span className="tab-title">{db.title}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="dashboard-body container">
        {activeDashboard === 1 && <Dashboard1 />}
        {activeDashboard === 2 && <Dashboard2 />}
        {activeDashboard === 3 && <Dashboard3 />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .premium-analytics {
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Outfit', sans-serif;
          color: #1e293b;
          padding-bottom: 80px;
        }

        .container { max-width: 1360px; margin: 0 auto; padding: 0 32px; }

        .dashboard-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 40px 0 0; margin-bottom: 40px; }
        .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; }
        .breadcrumb { font-size: 0.8rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .dashboard-header h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 8px; color: #0f172a; letter-spacing: -1px; }
        .dashboard-header p { color: #64748b; font-size: 1.1rem; max-width: 600px; line-height: 1.5; }
        .text-gradient { background: linear-gradient(135deg, #2563eb, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .btn-refresh { background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; font-family: 'Outfit', sans-serif; }
        .btn-refresh:hover { background: #1e293b; transform: translateY(-2px); }

        /* Tabs */
        .dashboard-tabs { display: flex; gap: 12px; padding-bottom: 0; }
        .tab-btn { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border: none; border-radius: 16px 16px 0 0; background: transparent; cursor: pointer; transition: 0.3s; font-family: 'Outfit', sans-serif; opacity: 0.5; }
        .tab-btn:hover { opacity: 0.8; background: #f1f5f9; }
        .tab-btn.active { opacity: 1; background: #f8fafc; box-shadow: 0 -2px 12px rgba(0,0,0,0.04); }
        .tab-btn svg { font-size: 1.3rem; color: #6366f1; }
        .tab-text { display: flex; flex-direction: column; align-items: flex-start; }
        .tab-label { font-size: 0.7rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px; }
        .tab-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; }

        /* KPI */
        .kpi-row { display: grid; gap: 20px; margin-bottom: 36px; }
        .kpi-6 { grid-template-columns: repeat(6, 1fr); }
        .premium-kpi-card { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px; position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: 0.3s; }
        .premium-kpi-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.08); border-color: #cbd5e1; }
        .kpi-card-inner { display: flex; align-items: center; gap: 16px; }
        .kpi-icon-box { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
        .kpi-data { flex: 1; min-width: 0; }
        .kpi-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
        .kpi-value-row { display: flex; align-items: baseline; gap: 8px; margin-top: 2px; }
        .kpi-value { font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .kpi-progress-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: #f1f5f9; }
        .progress-fill { height: 100%; border-radius: 0 2px 2px 0; }

        /* Grid */
        .dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .grid-card { background: #fff; border-radius: 28px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; }
        .col-span-2 { grid-column: span 2; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .header-text h3 { font-size: 1.2rem; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
        .header-text p { font-size: 0.85rem; color: #64748b; margin: 0; }
        .chart-wrapper { flex: 1; min-height: 250px; position: relative; }
        .flex-center { display: flex; align-items: center; justify-content: center; }

        /* Tooltip */
        .custom-chart-tooltip { background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(8px); border-radius: 12px; padding: 12px 16px; color: white; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .tooltip-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; opacity: 0.7; }
        .tooltip-divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 8px; }
        .tooltip-value { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin: 4px 0; }
        .tooltip-value .dot { width: 8px; height: 8px; border-radius: 50%; }

        /* Legend */
        .custom-legend { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .legend-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; }
        .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .legend-name { flex: 1; color: #475569; min-width: 0; }
        .legend-val { color: #0f172a; font-weight: 800; }
        .region-legend { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px; }

        /* Tech list */
        .tech-list-premium { display: flex; flex-direction: column; gap: 12px; }
        .tech-item-row { display: flex; align-items: center; gap: 12px; }
        .tech-name-box { display: flex; align-items: center; gap: 10px; width: 120px; flex-shrink: 0; }
        .tech-rank { font-size: 0.65rem; font-weight: 800; color: #94a3b8; background: #f1f5f9; width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tech-name { font-size: 0.85rem; font-weight: 700; color: #334155; white-space: nowrap; }
        .tech-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .tech-bar-fill { height: 100%; border-radius: 4px; transition: 1s ease-out; }
        .tech-count { font-size: 0.85rem; font-weight: 800; color: #0f172a; width: 30px; text-align: right; }

        /* Table */
        .mod-table-wrapper { overflow-x: auto; flex: 1; }
        .mod-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .mod-table th { text-align: left; padding: 12px 8px; color: #64748b; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; }
        .mod-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .mod-table tr:hover td { background: #f8fafc; }
        .td-title { font-weight: 700; color: #0f172a; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .td-date { color: #64748b; font-size: 0.8rem; white-space: nowrap; }
        .empty-row { text-align: center; color: #94a3b8; padding: 40px !important; font-weight: 600; }
        .badge-country { background: #e0e7ff; color: #4338ca; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-org-type { background: #f1f5f9; color: #475569; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-role { padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
        .badge-role.admin { background: #fef3c7; color: #b45309; }
        .badge-role.organization { background: #dbeafe; color: #1d4ed8; }
        .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .status-dot.active { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.4); }
        .status-dot.inactive { background: #94a3b8; }

        @media (max-width: 1200px) {
          .kpi-6 { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 1024px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr); }
          .dashboard-grid { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: span 1; }
          .header-flex { flex-direction: column; align-items: flex-start; gap: 20px; }
          .dashboard-tabs { flex-direction: column; }
          .tab-btn { border-radius: 12px; }
          .tab-btn.active { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        }

        @media (max-width: 640px) {
          .kpi-row { grid-template-columns: 1fr; }
          .container { padding: 0 20px; }
          .dashboard-header h1 { font-size: 1.8rem; }
        }
      `}</style>
    </div>
  )
}

export default Analytics
