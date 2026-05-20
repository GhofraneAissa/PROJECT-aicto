import { useState, useEffect } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts'
import { FaProjectDiagram, FaBuilding, FaGlobeAmericas, FaRocket, FaInfoCircle, FaArrowUp, FaChartLine } from 'react-icons/fa'

const API_BASE = 'http://localhost:8000'

// Professional Color Palette
const COLORS = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  slate: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
  chart: ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#6366f1']
}

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

function Analytics() {
  const [overview, setOverview] = useState(null)
  const [projectsByCountry, setProjectsByCountry] = useState([])
  const [projectsBySector, setProjectsBySector] = useState([])
  const [aiTech, setAiTech] = useState([])
  const [stakeholderTypes, setStakeholderTypes] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
  }, [])

  const safeFetch = async (url, fallback) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return fallback
      return await res.json()
    } catch {
      return fallback
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [ov, pbc, pbs, ait, sbt, tl] = await Promise.all([
        safeFetch(`${API_BASE}/api/analytics/overview`, null),
        safeFetch(`${API_BASE}/api/analytics/projects-by-country`, []),
        safeFetch(`${API_BASE}/api/analytics/projects-by-sector`, []),
        safeFetch(`${API_BASE}/api/analytics/ai-technologies`, []),
        safeFetch(`${API_BASE}/api/analytics/stakeholders-by-type`, []),
        safeFetch(`${API_BASE}/api/analytics/projects-timeline`, [])
      ])

      setOverview(ov)
      setProjectsByCountry(pbc)
      setProjectsBySector(pbs)
      setAiTech(ait)
      setStakeholderTypes(sbt)
      setTimeline(tl)
    } catch (err) {
      console.error('Failed to fetch analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="analytics-loading">
      <div className="loader-orbit">
        <div className="orbit-dot"></div>
      </div>
      <p>Gathering Intelligence...</p>
      <style>{`
        .analytics-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: white; gap: 24px; font-family: 'Outfit', sans-serif; }
        .loader-orbit { width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; position: relative; animation: rotate 2s linear infinite; }
        .orbit-dot { width: 10px; height: 10px; background: #2563eb; border-radius: 50%; position: absolute; top: -5px; left: 25px; box-shadow: 0 0 15px #2563eb; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )

  const kpis = [
    { label: 'Total Ecosystem Projects', value: overview?.total_projects, icon: <FaProjectDiagram />, color: COLORS.primary, trend: '+12%' },
    { label: 'Verified Stakeholders', value: overview?.total_stakeholders, icon: <FaBuilding />, color: COLORS.secondary, trend: '+5%' },
    { label: 'Arab Nations Coverage', value: `${overview?.total_countries_active}/22`, icon: <FaGlobeAmericas />, color: COLORS.success, trend: '98%' },
    { label: 'Active R&D Initiatives', value: overview?.ongoing_projects_count, icon: <FaRocket />, color: COLORS.warning, trend: 'High' }
  ]

  return (
    <div className="premium-analytics">
      {/* Dynamic Dashboard Header */}
      <header className="dashboard-header">
        <div className="container">
          <div className="header-flex">
            <div className="title-area">
              <div className="breadcrumb">Dashboard / Ecosystem Insights</div>
              <h1>Regional AI <span className="text-gradient">Intelligence</span></h1>
              <p>Aggregated metrics from 22 Arab Nations monitor technology adoption and infrastructure growth.</p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={fetchAllData}><FaChartLine /> Refresh Data</button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-body container">
        {/* KPI Row */}
        <div className="kpi-row">
          {kpis.map((kpi, index) => (
            <div key={index} className="premium-kpi-card">
              <div className="kpi-card-inner">
                <div className="kpi-icon-box" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  {kpi.icon}
                </div>
                <div className="kpi-data">
                  <span className="kpi-label">{kpi.label}</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{kpi.value || 0}</span>
                    <span className="kpi-trend" style={{ color: kpi.color }}>
                      <FaArrowUp style={{ fontSize: '10px' }} /> {kpi.trend}
                    </span>
                  </div>
                </div>
              </div>
              <div className="kpi-progress-bar">
                <div className="progress-fill" style={{ width: '70%', backgroundColor: kpi.color }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          
          {/* Main Growth Area */}
          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Launch Timeline & Growth</h3>
                <p>Evolution of project submissions across the region.</p>
              </div>
              <FaInfoCircle className="info-icon" />
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: COLORS.slate[3], fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.slate[3], fontSize: 12}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="projects" 
                    stroke={COLORS.primary} 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorGrowth)" 
                    name="Projects Launched"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Pie */}
          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Sector Distribution</h3>
                <p>Industry-specific AI adoption.</p>
              </div>
            </div>
            <div className="chart-wrapper flex-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectsBySector}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={100}
                    paddingAngle={8}
                    dataKey="count"
                    nameKey="sector"
                    stroke="none"
                  >
                    {projectsBySector.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-center-label">
                <span className="total-num">{overview?.total_projects}</span>
                <span className="total-lab">Total</span>
              </div>
            </div>
            <div className="custom-legend">
              {projectsBySector.slice(0, 4).map((entry, idx) => (
                <div key={idx} className="legend-row">
                  <span className="legend-dot" style={{ backgroundColor: COLORS.chart[idx % COLORS.chart.length] }}></span>
                  <span className="legend-name">{entry.sector}</span>
                  <span className="legend-val">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Country Ranking */}
          <div className="grid-card col-span-2">
            <div className="card-header">
              <div className="header-text">
                <h3>Project Density by Country</h3>
                <p>Comparative analysis of regional participation.</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={projectsByCountry} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="country" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: COLORS.slate[2], fontSize: 11}} 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.slate[3], fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                  <Bar dataKey="projects" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={32}>
                    {projectsByCountry.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.projects > 10 ? COLORS.primary : COLORS.info} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technology Radar/Cloud replacement */}
          <div className="grid-card">
            <div className="card-header">
              <div className="header-text">
                <h3>Core Technologies</h3>
                <p>Dominant AI capabilities.</p>
              </div>
            </div>
            <div className="tech-list-premium">
              {aiTech.map((tech, index) => (
                <div key={index} className="tech-item-row">
                  <div className="tech-name-box">
                    <span className="tech-rank">{index + 1}</span>
                    <span className="tech-name">{tech.technology}</span>
                  </div>
                  <div className="tech-bar-wrap">
                    <div className="tech-bar-fill" style={{ 
                      width: `${(tech.count / Math.max(...aiTech.map(t => t.count))) * 100}%`,
                      backgroundColor: COLORS.chart[index % COLORS.chart.length]
                    }}></div>
                  </div>
                  <span className="tech-count">{tech.count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
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

        .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }

        /* Header */
        .dashboard-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 48px 0; margin-bottom: 48px; }
        .header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
        .breadcrumb { font-size: 0.8rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .dashboard-header h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 8px; color: #0f172a; letter-spacing: -1px; }
        .dashboard-header p { color: #64748b; font-size: 1.1rem; max-width: 600px; line-height: 1.5; }
        .text-gradient { background: linear-gradient(135deg, #2563eb, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .btn-refresh { background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; }
        .btn-refresh:hover { background: #1e293b; transform: translateY(-2px); }

        /* KPI Cards */
        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 48px; }
        .premium-kpi-card { background: #fff; border-radius: 24px; border: 1px solid #e2e8f0; padding: 24px; position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: 0.3s; }
        .premium-kpi-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.08); border-color: #cbd5e1; }
        
        .kpi-card-inner { display: flex; align-items: center; gap: 20px; }
        .kpi-icon-box { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .kpi-data { flex: 1; }
        .kpi-label { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value-row { display: flex; align-items: baseline; gap: 10px; margin-top: 4px; }
        .kpi-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; }
        .kpi-trend { font-size: 0.85rem; font-weight: 700; }

        .kpi-progress-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: #f1f5f9; }
        .progress-fill { height: 100%; border-radius: 0 2px 2px 0; }

        /* Grid Cards */
        .dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .grid-card { background: #fff; border-radius: 32px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; }
        .col-span-2 { grid-column: span 2; }
        
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .header-text h3 { font-size: 1.4rem; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
        .header-text p { font-size: 0.9rem; color: #64748b; margin: 0; }
        .info-icon { color: #cbd5e1; cursor: pointer; transition: 0.2s; }
        .info-icon:hover { color: #64748b; }

        .chart-wrapper { flex: 1; min-height: 250px; position: relative; }
        .flex-center { display: flex; align-items: center; justify-content: center; }

        /* Custom Chart Elements */
        .custom-chart-tooltip { background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border-radius: 12px; padding: 12px 16px; color: white; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .tooltip-label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; opacity: 0.7; }
        .tooltip-divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 8px; }
        .tooltip-value { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; margin: 4px 0; }
        .tooltip-value .dot { width: 8px; height: 8px; border-radius: 50%; }

        .pie-center-label { position: absolute; text-align: center; display: flex; flex-direction: column; }
        .total-num { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .total-lab { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }

        .custom-legend { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .legend-row { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; }
        .legend-dot { width: 10px; height: 10px; border-radius: 3px; }
        .legend-name { flex: 1; color: #475569; }
        .legend-val { color: #0f172a; font-weight: 800; }

        /* Tech List */
        .tech-list-premium { display: flex; flex-direction: column; gap: 16px; }
        .tech-item-row { display: flex; align-items: center; gap: 16px; }
        .tech-name-box { display: flex; align-items: center; gap: 12px; width: 140px; }
        .tech-rank { font-size: 0.7rem; font-weight: 800; color: #94a3b8; background: #f1f5f9; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .tech-name { font-size: 0.9rem; font-weight: 700; color: #334155; }
        .tech-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .tech-bar-fill { height: 100%; border-radius: 4px; transition: 1s ease-out; }
        .tech-count { font-size: 0.9rem; font-weight: 800; color: #0f172a; width: 30px; text-align: right; }

        @media (max-width: 1024px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr); }
          .dashboard-grid { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: span 1; }
          .header-flex { flex-direction: column; align-items: flex-start; gap: 24px; }
        }

        @media (max-width: 640px) {
          .kpi-row { grid-template-columns: 1fr; }
          .container { padding: 0 20px; }
          .dashboard-header h1 { font-size: 2rem; }
        }
      `}</style>
    </div>
  )
}

export default Analytics