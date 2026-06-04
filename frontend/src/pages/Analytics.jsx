import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap,
  ComposedChart
} from 'recharts'
import {
  FaProjectDiagram, FaBuilding, FaGlobeAmericas, FaRocket,
  FaArrowUp, FaChartLine, FaUsers, FaClipboardList,
  FaLayerGroup, FaHandshake, FaCheckCircle, FaTimesCircle,
  FaClock, FaPercentage, FaCalendarAlt,
  FaMapMarkerAlt, FaLightbulb, FaChartBar, FaChartPie,
  FaUserGraduate, FaChartArea, FaBook, FaFlag, FaMicrochip,
  FaRedo
} from 'react-icons/fa'

import { API_BASE } from '../config'

const COLORS = {
  primary: '#2563eb', secondary: '#7c3aed', success: '#10b981',
  warning: '#f59e0b', danger: '#ef4444', info: '#06b6d4',
  slate: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
  chart: ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#6366f1'],
  status: { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444' }
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="analytics-tooltip">
        <p className="tooltip-label">{label}</p>
        <div className="tooltip-divider"></div>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            <span className="tooltip-dot" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

function Analytics() {
  const { t } = useTranslation()
  const [activeDashboard, setActiveDashboard] = useState(1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})

  const STATUS_LABELS = {
    pending: t('analytics.statusPending'), approved: t('analytics.statusApproved'),
    rejected: t('analytics.statusRejected'), draft: t('analytics.statusDraft')
  }

  const DASHBOARDS = [
    { id: 1, label: t('analytics.dashboard1Label'), title: t('analytics.dashboard1Title'), icon: FaClipboardList },
    { id: 2, label: t('analytics.dashboard2Label'), title: t('analytics.dashboard2Title'), icon: FaLayerGroup },
    { id: 3, label: t('analytics.dashboard3Label'), title: t('analytics.dashboard3Title'), icon: FaUsers },
  ]

  const safeFetch = async (url, fallback) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return fallback
      return await res.json()
    } catch { return fallback }
  }

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const allEndpoints = {
        overview: safeFetch(`${API_BASE}/api/analytics/overview`, null),
        statusDistribution: safeFetch(`${API_BASE}/api/analytics/status-distribution`, []),
        projectsByCountry: safeFetch(`${API_BASE}/api/analytics/projects-by-country`, []),
        projectsBySector: safeFetch(`${API_BASE}/api/analytics/projects-by-sector`, []),
        aiTech: safeFetch(`${API_BASE}/api/analytics/ai-technologies`, []),
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
        statusBreakdown: safeFetch(`${API_BASE}/api/analytics/status-breakdown`, { approvalPipeline: [], activityStatus: [] }),
        stakeholdersByCountry: safeFetch(`${API_BASE}/api/analytics/stakeholders-by-country`, []),
        resourcesByType: safeFetch(`${API_BASE}/api/analytics/resources-by-type`, []),
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

  function CustomTreemapContent(props) {
    const { depth, x, y, width, height, index, colors, name, value } = props
    if (depth > 1) return null
    return (
      <g>
        <rect x={x} y={y} width={width} height={height}
          style={{ fill: colors[index % colors.length], stroke: '#fff', strokeWidth: 2 }} />
        {width > 50 && height > 30 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>
              {name}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>
              {t('analytics.projects', { count: value })}
            </text>
          </>
        )}
      </g>
    )
  }

  if (loading) return (
    <div className="analytics-loading-page">
      <div className="loading-spinner"><div className="spinner-ring"></div></div>
      <p className="loading-text">{t('analytics.loading')}</p>
      <style>{`
        .analytics-loading-page {
          height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #f8fafc; font-family: 'Outfit', sans-serif; gap: 20px;
        }
        .loading-spinner { width: 48px; height: 48px; position: relative; }
        .spinner-ring { width: 48px; height: 48px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: aspin 0.8s linear infinite; }
        @keyframes aspin { to { transform: rotate(360deg); } }
        .loading-text { color: #64748b; font-size: 1rem; font-weight: 600; }
      `}</style>
    </div>
  )

  const { overview } = data

  const Dashboard1 = () => {
    const { statusDistribution, projectsByCountry, projectsBySector, submissionsByMonth, moderationQueue, approvedRejected, aiTech, statusBreakdown } = data

    const d1Kpis = overview ? [
      { label: t('analytics.totalProjects'), value: overview.total_projects, icon: FaProjectDiagram, color: COLORS.primary },
      { label: t('analytics.pendingCount'), value: overview.pending_count, icon: FaClock, color: COLORS.warning },
      { label: t('analytics.approvedThisMonth'), value: overview.approved_this_month, icon: FaCheckCircle, color: COLORS.success },
      { label: t('analytics.rejectedThisMonth'), value: overview.rejected_this_month, icon: FaTimesCircle, color: COLORS.danger },
      { label: t('analytics.moderationDelay'), value: `${overview.average_moderation_hours}${t('analytics.hoursAbbr')}`, icon: FaClock, color: COLORS.info },
      { label: t('analytics.approvalRate'), value: `${overview.approval_rate}%`, icon: FaPercentage, color: COLORS.secondary },
    ] : []

    const submissionsChart = (submissionsByMonth || []).map(s => ({
      label: `${s.year}-${String(s.month).padStart(2, '0')}`,
      count: s.count
    }))

    return (
      <>
        <div className="kpi-grid">
          {d1Kpis.map((kpi, index) => (
            <div key={index} className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}><kpi.icon /></div>
              <div className="kpi-info">
                <span className="kpi-label">{kpi.label}</span>
                <span className="kpi-value">{kpi.value ?? 0}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="chart-grid">
          <div className="chart-card span-2">
            <div className="chart-header">
              <h3>{t('analytics.statusDistribution')}</h3>
              <p>{t('analytics.statusDistributionDesc')}</p>
            </div>
            <div className="chart-body flex-row">
              <div className="mini-pie">
                <h4>{t('analytics.approvalPipeline')}</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusBreakdown.approvalPipeline} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      paddingAngle={4} dataKey="count" nameKey="label" stroke="none">
                      {statusBreakdown.approvalPipeline.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS.chart[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {statusBreakdown.approvalPipeline.map((entry, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                      <span>{entry.label}</span>
                      <span className="legend-count">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mini-pie">
                <h4>{t('analytics.activeCompleted')}</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusBreakdown.activityStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      paddingAngle={4} dataKey="count" nameKey="label" stroke="none">
                      {statusBreakdown.activityStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS.chart[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {statusBreakdown.activityStatus.map((entry, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                      <span>{entry.label}</span>
                      <span className="legend-count">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.projectsByCountry')}</h3>
              <p>{t('analytics.geographicDistribution')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectsByCountry} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="country" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={-35} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="projects" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={32} name={t('analytics.projects')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.projectsBySector')}</h3>
              <p>{t('analytics.volumeBySector')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectsBySector} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="sector" axisLine={false} tickLine={false}
                    tick={{ fill: '#334155', fontSize: 12 }} width={130} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 6, 6, 0]} barSize={22} name={t('analytics.projects')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card span-2">
            <div className="chart-header">
              <h3>{t('analytics.submissionsByMonth')}</h3>
              <p>{t('analytics.submissionsByMonthDesc')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={submissionsChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }} angle={-35} textAnchor="end" interval={1} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={3}
                    fillOpacity={1} fill="url(#gradSub)" name={t('analytics.submissions')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.keyTechnologies')}</h3>
              <p>{t('analytics.topTechnologiesUsed')}</p>
            </div>
            <div className="chart-body tech-list">
              {(aiTech || []).slice(0, 8).map((tech, i) => (
                <div key={i} className="tech-row">
                  <span className="tech-rank">{i + 1}</span>
                  <span className="tech-name">{tech.technology}</span>
                  <div className="tech-bar">
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

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.approvedVsRejected')}</h3>
              <p>{t('analytics.byMonth')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={approvedRejected || []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }} angle={-35} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="approved" fill={COLORS.success} name={t('analytics.approved')} radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="rejected" fill={COLORS.danger} name={t('analytics.rejected')} radius={[4, 4, 0, 0]} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card span-3">
            <div className="chart-header">
              <h3>{t('analytics.moderationQueue')}</h3>
              <p>{t('analytics.moderationQueueDesc')}</p>
            </div>
            <div className="chart-body">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>{t('analytics.title')}</th>
                    <th>{t('analytics.organization')}</th>
                    <th>{t('analytics.country')}</th>
                    <th>{t('analytics.sector')}</th>
                    <th>{t('analytics.submittedOn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(moderationQueue || []).length === 0 ? (
                    <tr><td colSpan={5} className="empty-row">{t('analytics.noProjectsPending')}</td></tr>
                  ) : (
                    (moderationQueue || []).slice(0, 6).map(p => (
                      <tr key={p.id}>
                        <td className="td-title">{p.title}</td>
                        <td>{p.organization || '-'}</td>
                        <td><span className="badge-country">{p.country || '-'}</span></td>
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

  const Dashboard2 = () => {
    const { sdgCoverage, projectsByRegion, regionSdg, techBySector, durationVsSdg, activeTimeline, avgDuration, orgsActive, aiTech } = data

    const radarData = (sdgCoverage || []).map(s => ({
      subject: `${t('analytics.sdgAbbr')} ${s.goal_number}`,
      value: s.count,
      fullTitle: s.title,
      color: s.color
    }))

    const topSdgs = (sdgCoverage || []).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10)
    const techSectorData = (techBySector || []).map(item => ({
      name: `${item.technology} (${item.sector})`,
      size: item.count,
      sector: item.sector,
      technology: item.technology
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
      { label: t('analytics.topSdg'), value: topSdgs[0]?.goal_number ? `${t('analytics.sdgAbbr')} ${topSdgs[0].goal_number}` : '-', icon: FaLightbulb, color: '#10b981' },
      { label: t('analytics.projectsWithSdg'), value: (sdgCoverage || []).reduce((a, b) => a + b.count, 0), icon: FaProjectDiagram, color: COLORS.primary },
      { label: t('analytics.activeRegions'), value: (projectsByRegion || []).length, icon: FaGlobeAmericas, color: COLORS.secondary },
      { label: t('analytics.avgDuration'), value: avgDuration?.avg_duration_days ? `${avgDuration.avg_duration_days} ${t('analytics.daysAbbr')}` : `0 ${t('analytics.daysAbbr')}`, icon: FaClock, color: COLORS.warning },
      { label: t('analytics.activeOrganizations'), value: orgsActive?.count ?? 0, icon: FaBuilding, color: COLORS.info },
      { label: t('analytics.technologies'), value: (aiTech || []).length, icon: FaMicrochip, color: COLORS.danger },
    ]

    return (
      <>
        <div className="kpi-grid">
          {d2Kpis.map((kpi, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}><kpi.icon /></div>
              <div className="kpi-info">
                <span className="kpi-label">{kpi.label}</span>
                <span className="kpi-value">{kpi.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="chart-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.radarSdg')}</h3>
              <p>{t('analytics.sdgCoverageDesc')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar name={t('analytics.projects')} dataKey="value" stroke={COLORS.primary}
                    fill={COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.topSdgChart')}</h3>
              <p>{t('analytics.sdgRankingDesc')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topSdgs} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="goal_number" axisLine={false} tickLine={false}
                    tick={{ fill: '#334155', fontSize: 12 }}
                    tickFormatter={(v) => `${t('analytics.sdgAbbr')} ${v}`} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name={t('analytics.projects')} radius={[0, 6, 6, 0]} barSize={20}>
                    {topSdgs.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS.chart[i % COLORS.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card span-2">
            <div className="chart-header">
              <h3>{t('analytics.techBySector')}</h3>
              <p>{t('analytics.techBySectorDesc')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <Treemap data={techSectorData} dataKey="size" aspectRatio={4 / 3}
                  stroke="#fff" fill="#2563eb" content={<CustomTreemapContent colors={COLORS.chart} />}>
                  <Tooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.projectsByRegion')}</h3>
              <p>{t('analytics.withDominantSdg')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectsByRegion} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="region" axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name={t('analytics.projects')} radius={[6, 6, 0, 0]} barSize={28}>
                    {(projectsByRegion || []).map((entry, i) => {
                      const r = (regionSdg || []).find(rs => rs.region === entry.region)
                      return <Cell key={i} fill={r?.dominant_sdg_color || COLORS.chart[i % COLORS.chart.length]} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="inline-legend">
                {(regionSdg || []).filter(r => r.dominant_sdg).map((r, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: r.dominant_sdg_color }}></span>
                    <span>{r.region}: {t('analytics.sdgAbbr')} {r.dominant_sdg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.durationVsSdg')}</h3>
              <p>{t('analytics.durationSdgCorrelation')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="x" name={t('analytics.durationDays')} unit={` ${t('analytics.daysAbbr')}`}
                    axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name={t('analytics.sdgCount')}
                    axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 200]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={scatterData} fill={COLORS.primary} fillOpacity={0.6} name={t('analytics.projects')} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card span-2">
            <div className="chart-header">
              <h3>{t('analytics.activeTimeline')}</h3>
              <p>{t('analytics.durationByProject')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={durationData} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="title" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 9 }} interval={0} angle={-55} textAnchor="end" height={80} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} unit={` ${t('analytics.daysAbbr')}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="duration" name={t('analytics.durationDays')} radius={[4, 4, 0, 0]} barSize={18}>
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
      { label: t('analytics.totalSignups'), value: (userSignups || []).reduce((a, b) => a + b.count, 0), icon: FaUsers, color: COLORS.primary },
      { label: t('analytics.active30Days'), value: activeUsers?.active_30_days ?? 0, icon: FaUserGraduate, color: COLORS.success },
      { label: t('analytics.activationRateLabel'), value: `${activationRate?.activation_rate ?? 0}%`, icon: FaPercentage, color: COLORS.secondary },
      { label: t('analytics.orgTypes'), value: (usersByOrgType || []).length, icon: FaBuilding, color: COLORS.warning },
      { label: t('analytics.stakeholders'), value: (stakeholdersByType || []).reduce((a, b) => a + b.count, 0), icon: FaHandshake, color: COLORS.info },
      { label: t('analytics.projectsPerUser'), value: projectsPerUser?.average ?? 0, icon: FaProjectDiagram, color: COLORS.danger },
    ]

    const stakeholderCategoryData = (stakeholdersByCategory || []).map(s => ({
      ...s,
      fill: COLORS.chart[(stakeholdersByCategory || []).indexOf(s) % COLORS.chart.length]
    }))

    const recentUsersList = (recentUsers || []).slice(0, 10)

    return (
      <>
        <div className="kpi-grid">
          {d3Kpis.map((kpi, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}><kpi.icon /></div>
              <div className="kpi-info">
                <span className="kpi-label">{kpi.label}</span>
                <span className="kpi-value">{kpi.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="chart-grid">
          <div className="chart-card span-2">
            <div className="chart-header">
              <h3>{t('analytics.signupGrowth')}</h3>
              <p>{t('analytics.monthlyCumulative')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={signupChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }} angle={-35} textAnchor="end" interval={1} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="count" fill={COLORS.primary} name={t('analytics.newUsers')} radius={[4, 4, 0, 0]} barSize={14} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.success}
                    strokeWidth={3} name={t('analytics.cumulative')} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.orgTypeDistribution')}</h3>
              <p>{t('analytics.userDistribution')}</p>
            </div>
            <div className="chart-body flex-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={usersByOrgType} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={4} dataKey="count" nameKey="type" stroke="none">
                    {(usersByOrgType || []).map((entry, i) => (
                      <Cell key={i} fill={orgTypeColors[entry.type] || COLORS.chart[i % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pie-legend compact">
              {(usersByOrgType || []).map((entry, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-dot"
                    style={{ backgroundColor: orgTypeColors[entry.type] || COLORS.chart[i % COLORS.chart.length] }}></span>
                  <span>{entry.type}</span>
                  <span className="legend-count">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.stakeholdersByCategory')}</h3>
              <p>{t('analytics.categoryDistribution')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stakeholderCategoryData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="category" axisLine={false} tickLine={false}
                    tick={{ fill: '#334155', fontSize: 11 }} width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name={t('analytics.stakeholders')} radius={[0, 6, 6, 0]} barSize={20}>
                    {stakeholderCategoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.usersByCountry')}</h3>
              <p>{t('analytics.geographicDistribution')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={usersByCountry} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="country" axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-35} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name={t('analytics.users')} radius={[6, 6, 0, 0]} barSize={28} fill={COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>{t('analytics.projectsPerUserChart')}</h3>
              <p>{t('analytics.engagementDistribution')}</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectsPerUser?.distribution || []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="range" axisLine={false} tickLine={false}
                    tick={{ fill: '#334155', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name={t('analytics.users')} radius={[6, 6, 0, 0]} barSize={40} fill={COLORS.info} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card span-2">
            <div className="chart-header">
              <h3>{t('analytics.recentUsers')}</h3>
              <p>{t('analytics.recentConnections')}</p>
            </div>
            <div className="chart-body">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>{t('analytics.organization')}</th>
                    <th>{t('analytics.type')}</th>
                    <th>{t('analytics.country')}</th>
                    <th>{t('analytics.role')}</th>
                    <th>{t('analytics.status')}</th>
                    <th>{t('analytics.lastConnection')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsersList.length === 0 ? (
                    <tr><td colSpan={6} className="empty-row">{t('analytics.noUsers')}</td></tr>
                  ) : (
                    recentUsersList.map(u => (
                      <tr key={u.id}>
                        <td className="td-title">{u.organization_name}</td>
                        <td><span className="badge-org-type">{u.organization_type}</span></td>
                        <td>{u.country || '-'}</td>
                        <td><span className={`badge-role ${u.role}`}>{u.role}</span></td>
                        <td>
                          <span className={`status-indicator ${u.is_active ? 'active' : 'inactive'}`}></span>
                          {u.is_active ? t('analytics.active') : t('analytics.inactive')}
                        </td>
                        <td className="td-date">{u.last_login ? new Date(u.last_login).toLocaleDateString() : t('analytics.never')}</td>
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
    <div className="analytics-page">
      <section className="analytics-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content animate-up">
            <div className="hero-badge">
              <FaChartLine />
              <span>{t('analytics.heroBadge')}</span>
            </div>
            <h1>{t('analytics.heroTitleSuffix')} <span className="text-gradient">{t('analytics.heroTitle')}</span></h1>
            <p>{t('analytics.heroDescription')}</p>
          </div>
        </div>
      </section>

      <section className="analytics-body">
        <div className="container">
          <div className="analytics-controls animate-up delay-1">
            <div className="dashboard-tabs">
              {DASHBOARDS.map(db => {
                const Icon = db.icon
                return (
                  <button key={db.id}
                    className={`tab-btn ${activeDashboard === db.id ? 'active' : ''}`}
                    onClick={() => setActiveDashboard(db.id)}>
                    <Icon />
                    <span className="tab-title">{db.title}</span>
                  </button>
                )
              })}
            </div>
            <button className="refresh-btn" onClick={fetchAllData}>
              <FaRedo /> {t('analytics.refresh')}
            </button>
          </div>

          <div className="dashboard-content animate-up delay-1">
            {activeDashboard === 1 && <Dashboard1 />}
            {activeDashboard === 2 && <Dashboard2 />}
            {activeDashboard === 3 && <Dashboard3 />}
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .analytics-page {
          --p-primary: #2563eb;
          --p-secondary: #0f172a;
          --p-text: #1e293b;
          --p-text-light: #64748b;
          font-family: 'Outfit', sans-serif;
          color: var(--p-text);
          background: #f8fafc;
          min-height: 100vh;
        }

        .container { max-width: 1360px; margin: 0 auto; padding: 0 24px; }

        .analytics-hero {
          position: relative;
          padding: 120px 0 80px;
          background: #fff;
          overflow: hidden;
          text-align: center;
        }

        .animated-blobs {
          position: absolute; width: 100%; height: 100%;
          top: 0; left: 0;
          filter: blur(70px);
          opacity: 0.3;
        }
        .blob { position: absolute; border-radius: 50%; animation: float 15s infinite alternate; }
        .blob-1 { width: 300px; height: 300px; top: -50px; left: 5%; background: #60a5fa; }
        .blob-2 { width: 250px; height: 250px; bottom: -50px; right: 5%; background: #93c5fd; animation-delay: -5s; }
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 20px) scale(1.1); }
        }

        .hero-container { position: relative; z-index: 2; }

        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; background: rgba(37, 99, 235, 0.08);
          border-radius: 100px; color: var(--p-primary);
          font-weight: 700; font-size: 0.8rem;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;
        }

        .analytics-hero h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 800; line-height: 1.1;
          margin-bottom: 20px; letter-spacing: -0.02em;
          color: var(--p-secondary);
        }

        .text-gradient {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .analytics-hero p {
          font-size: 1.15rem; color: var(--p-text-light);
          max-width: 600px; margin: 0 auto; line-height: 1.6;
        }

        .analytics-body { padding-bottom: 80px; margin-top: -30px; }

        .analytics-controls {
          display: flex; justify-content: space-between;
          align-items: center; gap: 16px; margin-bottom: 32px; flex-wrap: wrap;
        }

        .dashboard-tabs { display: flex; gap: 8px; flex-wrap: wrap; }

        .tab-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 24px; border: 1.5px solid #f1f5f9;
          border-radius: 16px; background: #fff; cursor: pointer;
          transition: 0.3s; font-family: inherit; font-size: 0.9rem;
          font-weight: 700; color: var(--p-text-light);
        }
        .tab-btn svg { font-size: 1.1rem; color: var(--p-primary); }
        .tab-btn:hover { border-color: #bfdbfe; background: #eff6ff; color: var(--p-primary); }
        .tab-btn.active { border-color: var(--p-primary); background: #eff6ff; color: var(--p-primary); }

        .refresh-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 24px; background: var(--p-secondary);
          color: #fff; border: none; border-radius: 14px;
          font-weight: 700; cursor: pointer; transition: 0.3s;
          font-family: inherit; font-size: 0.9rem;
        }
        .refresh-btn:hover { background: #1e293b; transform: translateY(-2px); }

        .dashboard-content { animation: fadeUp 0.5s ease both; }

        .kpi-grid {
          display: grid; grid-template-columns: repeat(6, 1fr);
          gap: 16px; margin-bottom: 32px;
        }

        .kpi-card {
          display: flex; align-items: center; gap: 16px;
          background: #fff; border: 1px solid #f1f5f9;
          border-radius: 20px; padding: 20px;
          transition: 0.3s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0,0,0,0.04); border-color: #e2e8f0; }

        .kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .kpi-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .kpi-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: var(--p-text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kpi-value { font-size: 1.4rem; font-weight: 800; color: var(--p-secondary); line-height: 1.2; }

        .chart-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

        .chart-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 24px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; flex-direction: column; }
        .span-2 { grid-column: span 2; }
        .span-3 { grid-column: span 3; }

        .chart-header { margin-bottom: 16px; }
        .chart-header h3 { font-size: 1rem; font-weight: 800; color: var(--p-secondary); margin: 0 0 4px; }
        .chart-header p { font-size: 0.8rem; color: var(--p-text-light); margin: 0; }

        .chart-body { flex: 1; min-height: 200px; }
        .flex-center { display: flex; align-items: center; justify-content: center; }
        .flex-row { display: flex; gap: 24px; }
        .flex-row .mini-pie { flex: 1; min-width: 0; }

        .mini-pie h4 { font-size: 0.8rem; font-weight: 700; color: var(--p-text-light); text-align: center; margin: 0 0 8px; }

        .analytics-tooltip { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); border-radius: 12px; padding: 12px 16px; color: white; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .analytics-tooltip .tooltip-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; opacity: 0.7; }
        .analytics-tooltip .tooltip-divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 8px; }
        .analytics-tooltip .tooltip-value { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin: 4px 0; }
        .analytics-tooltip .tooltip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .pie-legend { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 12px; }
        .pie-legend.compact { gap: 8px; }

        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: #475569; }
        .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .legend-count { font-weight: 800; color: var(--p-secondary); margin-left: 4px; }

        .inline-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }

        .tech-list { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
        .tech-row { display: flex; align-items: center; gap: 12px; }
        .tech-rank { font-size: 0.7rem; font-weight: 800; color: #94a3b8; background: #f1f5f9; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tech-name { font-size: 0.85rem; font-weight: 700; color: #334155; width: 100px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tech-bar { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .tech-bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease-out; }
        .tech-count { font-size: 0.85rem; font-weight: 800; color: var(--p-secondary); width: 30px; text-align: right; }

        .analytics-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .analytics-table th { text-align: left; padding: 12px 8px; color: var(--p-text-light); font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; }
        .analytics-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .analytics-table tr:hover td { background: #f8fafc; }
        .td-title { font-weight: 700; color: var(--p-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .td-date { color: var(--p-text-light); font-size: 0.8rem; white-space: nowrap; }
        .empty-row { text-align: center; color: #94a3b8; padding: 40px !important; font-weight: 600; }

        .badge-country { background: #e0e7ff; color: #4338ca; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-org-type { background: #f1f5f9; color: #475569; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-role { padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
        .badge-role.admin { background: #fef3c7; color: #b45309; }
        .badge-role.organization { background: #dbeafe; color: #1d4ed8; }

        .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .status-indicator.active { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.4); }
        .status-indicator.inactive { background: #94a3b8; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeUp 0.5s ease both; }
        .delay-1 { animation-delay: 0.1s; }

        .chart-body :global(.recharts-responsive-container) { min-height: 180px; }

        @media (max-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr); }
          .chart-grid { grid-template-columns: 1fr 1fr; }
          .span-3 { grid-column: span 2; }
        }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .chart-grid { grid-template-columns: 1fr; }
          .span-2, .span-3 { grid-column: span 1; }
          .flex-row { flex-direction: column; }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr; }
          .analytics-hero h1 { font-size: 1.8rem; }
          .analytics-hero { padding: 100px 0 60px; }
          .analytics-body { margin-top: -20px; }
          .tab-btn { flex: 1; justify-content: center; }
          .analytics-controls { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

export default Analytics
