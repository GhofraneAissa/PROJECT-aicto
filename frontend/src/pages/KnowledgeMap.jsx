import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { FaGlobeAmericas, FaRocket, FaChartBar, FaArrowRight, FaTimes, FaMapMarkerAlt, FaProjectDiagram, FaUsers } from 'react-icons/fa'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import L from 'leaflet'

const API_BASE = 'http://localhost:8000'

const COUNTRY_COORDS = {
  'morocco': [31.8, -7.0],
  'algeria': [28.0, 3.0],
  'tunisia': [34.0, 9.5],
  'libya': [26.5, 17.5],
  'egypt': [26.8, 30.8],
  'sudan': [16.0, 30.0],
  'mauritania': [21.0, -10.5],
  'saudi arabia': [24.0, 45.0],
  'yemen': [15.5, 47.5],
  'oman': [22.0, 57.0],
  'uae': [24.0, 54.0],
  'qatar': [25.5, 51.2],
  'bahrain': [26.0, 50.5],
  'kuwait': [29.3, 47.5],
  'iraq': [33.0, 44.0],
  'jordan': [31.2, 36.8],
  'lebanon': [33.9, 35.5],
  'syria': [35.0, 38.5],
  'palestine': [31.9, 35.2],
  'somalia': [5.0, 46.0],
  'djibouti': [11.8, 42.6],
  'comoros': [-11.7, 43.3],
}

const COLORS = {
  primary: '#2563eb', secondary: '#0f172a',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
}

const getColor = (count) => {
  if (count === 0) return '#94a3b8'
  if (count <= 2) return '#93c5fd'
  if (count <= 4) return '#3b82f6'
  return '#1e3a8a'
}

const getRadius = (count) => {
  if (count === 0) return 8
  if (count <= 2) return 16
  if (count <= 4) return 26
  return 36
}

function MapController({ mapData, onSelectCountry }) {
  const map = useMap()
  const circlesRef = useRef([])

  useEffect(() => {
    if (!mapData) return
    circlesRef.current.forEach(c => map.removeLayer(c))
    circlesRef.current = []

    mapData.forEach(stats => {
      const name = stats.country
      const key = name.toLowerCase()
      const coords = COUNTRY_COORDS[key]
      if (!coords) return

      try {
        const radius = getRadius(stats?.project_count || 0)
        const color = getColor(stats?.project_count || 0)
        const circle = L.circleMarker(coords, {
          radius,
          fillColor: color,
          fillOpacity: 0.85,
          color: '#fff',
          weight: 2,
        }).addTo(map)

        circle.on({
          mouseover: () => {
            circle.setStyle({ fillOpacity: 1, weight: 3, color: '#f59e0b' })
            circle.bindTooltip(
              `<strong style="font-size:14px">${name}</strong><br/>
               <span style="color:#93c5fd">Projects:</span> ${stats?.project_count || 0}
               <span style="margin-left:12px;color:#93c5fd">Stakeholders:</span> ${stats?.stakeholder_count || 0}`,
              { direction: 'top', offset: L.point(0, -10), className: 'map-tooltip' }
            ).openTooltip()
          },
          mouseout: () => {
            circle.setStyle({ fillOpacity: 0.85, weight: 2, color: '#fff' })
            circle.unbindTooltip()
          },
          click: () => onSelectCountry(stats)
        })

        circlesRef.current.push(circle)
      } catch (e) { /* skip */ }
    })
  }, [mapData, map, onSelectCountry])

  return null
}

function KnowledgeMap() {
  const [mapData, setMapData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics/map-data`)
      .then(r => r.json())
      .then(stats => {
        setMapData(stats)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="map-page">
      <section className="map-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge"><FaGlobeAmericas /><span>Interactive Map</span></div>
          </div>
        </div>
      </section>
      <section className="map-body">
        <div className="container" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--p-text-light)', marginTop: 16 }}>Loading regional data...</p>
        </div>
      </section>
    </div>
  )

  return (
    <div className="map-page">
      <section className="map-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content animate-up">
            <div className="hero-badge">
              <FaGlobeAmericas />
              <span>Interactive Map</span>
            </div>
            <h1>Arab AI Activity <span className="text-gradient">Map</span></h1>
            <p>Explore AI initiatives across the Arab region. Circle size and color indicate project density.</p>
          </div>
        </div>
      </section>

      <section className="map-body">
        <div className="container map-container-inner animate-up delay-1">
          <div className="map-wrapper">
            <div className="map-header-bar">
              <div className="map-header-left">
                <FaMapMarkerAlt className="header-icon" />
                <span><strong>{mapData.filter(d => d.project_count > 0).length}</strong> active countries · <strong>{mapData.reduce((a, b) => a + b.project_count, 0)}</strong> total projects</span>
              </div>
              <div className="map-legend">
                <span className="legend-label">Project Density</span>
                <div className="legend-items">
                  <span className="legend-item"><span className="dot" style={{ background: '#94a3b8' }}></span> 0</span>
                  <span className="legend-item"><span className="dot" style={{ background: '#93c5fd' }}></span> 1-2</span>
                  <span className="legend-item"><span className="dot" style={{ background: '#3b82f6' }}></span> 3-4</span>
                  <span className="legend-item"><span className="dot" style={{ background: '#1e3a8a' }}></span> 5+</span>
                </div>
              </div>
            </div>
            <MapContainer
              center={[24, 35]}
              zoom={4}
              className="main-map"
              scrollWheelZoom={true}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {mapData.length > 0 && (
                <MapController mapData={mapData} onSelectCountry={setSelectedCountry} />
              )}
            </MapContainer>
          </div>
        </div>
      </section>

      <div className={`country-panel ${selectedCountry ? 'open' : ''}`}>
        {selectedCountry && (
          <div className="panel-content">
            <button className="panel-close" onClick={() => setSelectedCountry(null)}>
              <FaTimes />
            </button>

            <div className="panel-header">
              <FaGlobeAmericas className="panel-globe" />
              <h2>{selectedCountry.country}</h2>
            </div>

            <div className="panel-stats">
              <div className="panel-stat">
                <FaProjectDiagram />
                <span className="stat-value">{selectedCountry.project_count}</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="panel-stat">
                <FaUsers />
                <span className="stat-value">{selectedCountry.stakeholder_count}</span>
                <span className="stat-label">Stakeholders</span>
              </div>
            </div>

            <div className="panel-card">
              <h3><FaRocket /> Project Status</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Ongoing', value: selectedCountry.ongoing_projects },
                      { name: 'Completed', value: selectedCountry.completed_projects }
                    ]}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value"
                  >
                    <Cell fill="#f59e0b" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="panel-mini-legend">
                <span><span className="dot" style={{ background: '#f59e0b' }}></span> Ongoing ({selectedCountry.ongoing_projects})</span>
                <span><span className="dot" style={{ background: '#10b981' }}></span> Completed ({selectedCountry.completed_projects})</span>
              </div>
            </div>

            <div className="panel-card">
              <h3><FaChartBar /> Sector Distribution</h3>
              {selectedCountry.sector_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={selectedCountry.sector_distribution} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="sector" type="category" width={110} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    <RechartsTooltip />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No sector data available.</p>
              )}
            </div>

            <div className="panel-info">
              <div className="panel-info-row">
                <span className="info-label">Top Sector</span>
                <span className="info-value">{selectedCountry.top_sector || 'N/A'}</span>
              </div>
              <div className="panel-info-row">
                <span className="info-label">Dominant Technology</span>
                <span className="info-value">{selectedCountry.top_ai_technology || 'N/A'}</span>
              </div>
            </div>

            <Link to={`/projects?country=${encodeURIComponent(selectedCountry.country)}`} className="panel-cta">
              All Projects in {selectedCountry.country} <FaArrowRight />
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .map-page {
          --p-primary: #2563eb;
          --p-secondary: #0f172a;
          --p-text: #1e293b;
          --p-text-light: #64748b;
          font-family: 'Outfit', sans-serif;
          color: var(--p-text);
          background: #fff;
          min-height: 100vh;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        .map-hero {
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
        .blob {
          position: absolute;
          border-radius: 50%;
          animation: float 15s infinite alternate;
        }
        .blob-1 { width: 300px; height: 300px; top: -50px; left: 5%; background: #60a5fa; }
        .blob-2 { width: 250px; height: 250px; bottom: -50px; right: 5%; background: #93c5fd; animation-delay: -5s; }
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 20px) scale(1.1); }
        }

        .hero-container { position: relative; z-index: 2; }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(37, 99, 235, 0.08);
          border-radius: 100px;
          color: var(--p-primary);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        .map-hero h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
          color: var(--p-secondary);
        }

        .text-gradient {
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .map-hero p {
          font-size: 1.15rem;
          color: var(--p-text-light);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .map-body {
          padding-bottom: 80px;
          margin-top: -30px;
        }

        .map-container-inner { position: relative; z-index: 10; }

        .map-wrapper {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
        }

        .map-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 12px;
        }

        .map-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--p-text-light);
          font-size: 0.9rem;
        }
        .map-header-left strong { color: var(--p-secondary); }
        .header-icon { color: var(--p-primary); font-size: 1.1rem; }

        .map-legend {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .legend-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--p-text-light);
          letter-spacing: 0.5px;
        }
        .legend-items { display: flex; gap: 12px; }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
        }
        .legend-item .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .main-map {
          height: 600px;
          width: 100%;
          background: #f8fafc;
        }

        .main-map .leaflet-control-zoom { display: none; }

        .map-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          padding: 10px 16px !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
          line-height: 1.6 !important;
        }
        .map-tooltip::before { border-top-color: rgba(15, 23, 42, 0.95) !important; }

        .country-panel {
          position: fixed;
          right: 0;
          top: 0;
          bottom: 0;
          width: 440px;
          background: #fff;
          box-shadow: -10px 0 40px rgba(0,0,0,0.1);
          transform: translateX(100%);
          transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 3000;
          overflow-y: auto;
        }
        .country-panel.open { transform: translateX(0); }

        .panel-content { padding: 36px; }

        .panel-close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 40px; height: 40px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: var(--p-text-light);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.3s;
          font-size: 1rem;
        }
        .panel-close:hover { background: #fee2e2; color: #ef4444; }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        .panel-globe {
          font-size: 2rem;
          color: var(--p-primary);
        }
        .panel-header h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--p-secondary);
          margin: 0;
        }

        .panel-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }
        .panel-stat {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .panel-stat svg { font-size: 1.3rem; color: var(--p-primary); }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: var(--p-secondary); line-height: 1; }
        .stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--p-text-light); letter-spacing: 0.5px; }

        .panel-card {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .panel-card h3 {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .panel-mini-legend {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 12px;
        }
        .panel-mini-legend span {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .panel-mini-legend .dot {
          width: 8px; height: 8px;
          border-radius: 50%;
        }

        .no-data {
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
          margin: 0;
          padding: 20px 0;
        }

        .panel-info {
          margin-bottom: 24px;
        }
        .panel-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .panel-info-row:last-child { border-bottom: none; }
        .info-label { font-size: 0.85rem; color: var(--p-text-light); font-weight: 600; }
        .info-value { font-size: 0.9rem; color: var(--p-secondary); font-weight: 700; }

        .panel-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px;
          background: var(--p-secondary);
          color: #fff;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          transition: 0.3s;
        }
        .panel-cta:hover {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
        }

        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #f1f5f9;
          border-top-color: var(--p-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeUp 0.5s ease both; }
        .delay-1 { animation-delay: 0.1s; }

        @media (max-width: 900px) {
          .country-panel { width: 100%; }
          .main-map { height: 450px; }
        }
        @media (max-width: 600px) {
          .main-map { height: 350px; }
          .map-hero { padding: 100px 0 60px; }
          .map-hero h1 { font-size: 1.8rem; }
          .map-header-bar { flex-direction: column; align-items: flex-start; }
          .panel-content { padding: 24px; }
          .panel-stats { gap: 8px; }
          .panel-stat { padding: 16px; }
          .stat-value { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  )
}

export default KnowledgeMap
