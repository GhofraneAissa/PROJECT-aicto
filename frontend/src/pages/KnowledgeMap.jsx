import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { FaGlobeAmericas, FaRocket, FaChartBar, FaArrowRight, FaTimes, FaMapMarkerAlt } from 'react-icons/fa'
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

const getColor = (count) => {
  if (count === 0) return '#94a3b8'
  if (count <= 2) return '#bfdbfe'
  if (count <= 4) return '#3b82f6'
  return '#1e3a8a'
}

const getRadius = (count) => {
  if (count === 0) return 8
  if (count <= 2) return 14
  if (count <= 4) return 22
  return 32
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
        const circle = L.circleMarker(coords, {
          radius: getRadius(stats?.project_count || 0),
          fillColor: getColor(stats?.project_count || 0),
          fillOpacity: 0.85,
          color: '#475569',
          weight: 2,
        }).addTo(map)

        circle.on({
          mouseover: () => {
            circle.setStyle({ fillOpacity: 1, weight: 3, color: '#f59e0b' })
            circle.bindTooltip(`<strong>${name}</strong><br/>${stats?.project_count || 0} Projects`, {
              direction: 'top', offset: L.point(0, -10), className: 'custom-tooltip'
            }).openTooltip()
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
      .catch(err => {
        console.error('Error loading map data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="knowledge-map-page">
      <div className="map-loading-screen">
        <div className="spinner"></div>
        <p>Loading Interactive Regional Data...</p>
        <style>{`
          .map-loading-screen { height: 500px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc, #f1f5f9); gap: 20px; font-family: 'Inter', sans-serif; border-radius: 24px; }
          .map-loading-screen p { color: #64748b; font-size: 1.1rem; }
          .spinner { width: 50px; height: 50px; border: 3px solid rgba(0,0,0,0.08); border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )

  return (
    <div className="knowledge-map-page">
      <div className="interactive-map-page">
        <div className="map-container-wrapper">
          <div className="map-floating-header">
            <div className="badge"><FaMapMarkerAlt /> Ecosystem Heatmap</div>
            <h1>Arab AI Activity <span className="text-primary">Map</span></h1>
            <p>Each circle represents a country — size & color show project density.</p>
          </div>

        <MapContainer
          center={[24, 35]}
          zoom={4}
          className="main-leaflet-map"
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#f1f5f9' }}
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

        <div className="map-legend">
          <h4>Project Density</h4>
          <div className="legend-items">
            <div className="legend-item"><span className="dot" style={{ background: '#94a3b8' }}></span> 0 projects</div>
            <div className="legend-item"><span className="dot" style={{ background: '#bfdbfe' }}></span> 1-2 projects</div>
            <div className="legend-item"><span className="dot" style={{ background: '#3b82f6' }}></span> 3-4 projects</div>
            <div className="legend-item"><span className="dot" style={{ background: '#1e3a8a' }}></span> 5+ projects</div>
          </div>
        </div>
      </div>

      <div className={`country-panel ${selectedCountry ? 'open' : ''}`}>
        {selectedCountry && (
          <div className="panel-content">
            <button className="close-panel" onClick={() => setSelectedCountry(null)}>
              <FaTimes />
            </button>

            <header className="panel-header">
              <div className="header-main">
                <FaGlobeAmericas className="globe-icon" />
                <h2>{selectedCountry.country}</h2>
              </div>
              <p className="panel-subtitle">Regional AI Intelligence Report</p>
            </header>

            <div className="panel-stats-grid">
              <div className="panel-stat">
                <span className="label">Projects</span>
                <span className="value">{selectedCountry.project_count}</span>
              </div>
              <div className="panel-stat">
                <span className="label">Stakeholders</span>
                <span className="value">{selectedCountry.stakeholder_count}</span>
              </div>
            </div>

            <div className="panel-section">
              <h3><FaRocket /> Project Status</h3>
              <div className="mini-chart-box">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ongoing', value: selectedCountry.ongoing_projects },
                        { name: 'Completed', value: selectedCountry.completed_projects }
                      ]}
                      cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value"
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mini-legend">
                  <div className="ml-item"><span className="d" style={{ background: '#f59e0b' }}></span> Ongoing ({selectedCountry.ongoing_projects})</div>
                  <div className="ml-item"><span className="d" style={{ background: '#10b981' }}></span> Completed ({selectedCountry.completed_projects})</div>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <h3><FaChartBar /> Sector Breakdown</h3>
              <div className="mini-chart-box">
                {selectedCountry.sector_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={selectedCountry.sector_distribution} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="sector" type="category" width={100} fontSize={10} stroke="#64748b" />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                      <RechartsTooltip />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data-msg">No sector data available.</p>
                )}
              </div>
            </div>

            <div className="panel-info-list">
              <div className="info-item">
                <span className="il">Top Sector</span>
                <span className="iv">{selectedCountry.top_sector || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="il">Dominant Tech</span>
                <span className="iv">{selectedCountry.top_ai_technology || 'N/A'}</span>
              </div>
            </div>

            <Link to={`/projects?country=${encodeURIComponent(selectedCountry.country)}`} className="view-projects-btn">
              Explore All Projects <FaArrowRight />
            </Link>
          </div>
        )}
      </div>

      <style>{`
        .interactive-map-page { height: 500px; width: 100%; position: relative; overflow: hidden; font-family: 'Inter', sans-serif; background: #f1f5f9; border-radius: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }

        .map-container-wrapper { width: 100%; height: 100%; position: relative; }

        .map-floating-header {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          text-align: center;
          width: auto;
          pointer-events: none;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          padding: 16px 32px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .map-floating-header .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; background: rgba(37, 99, 235, 0.1); color: #2563eb; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; border: 1px solid rgba(37, 99, 235, 0.15); }
        .map-floating-header h1 { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.5px; }
        .map-floating-header p { color: #64748b; font-size: 0.8rem; font-weight: 500; margin: 0; }
        .text-primary { color: #2563eb; }

        .map-legend {
          position: absolute;
          bottom: 30px;
          left: 30px;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .map-legend h4 { margin: 0 0 10px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
        .legend-items { display: flex; flex-direction: column; gap: 6px; }
        .legend-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #334155; font-weight: 500; }
        .legend-item .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.08); }

        .country-panel {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 420px;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          box-shadow: -10px 0 40px rgba(0,0,0,0.08);
          transform: translateX(100%);
          transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 2000;
          overflow-y: auto;
          border-left: 1px solid rgba(0,0,0,0.04);
        }
        .country-panel.open { transform: translateX(0); }

        .close-panel { position: absolute; top: 24px; right: 24px; background: rgba(0,0,0,0.04); border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: 0.3s; }
        .close-panel:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .panel-content { padding: 40px; }
        .panel-header { margin-bottom: 32px; }
        .header-main { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
        .header-main h2 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
        .globe-icon { color: #2563eb; font-size: 1.5rem; }
        .panel-subtitle { color: #64748b; font-size: 0.85rem; font-weight: 500; }

        .panel-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
        .panel-stat { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; text-align: center; }
        .panel-stat .label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
        .panel-stat .value { font-size: 1.5rem; font-weight: 800; color: #2563eb; }

        .panel-section { margin-bottom: 32px; }
        .panel-section h3 { font-size: 0.85rem; font-weight: 700; color: #334155; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .mini-chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; min-height: 100px; display: flex; flex-direction: column; justify-content: center; }
        .no-data-msg { text-align: center; color: #94a3b8; font-size: 0.85rem; margin: 0; }

        .mini-legend { display: flex; justify-content: center; gap: 16px; margin-top: 12px; }
        .ml-item { font-size: 10px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .ml-item .d { width: 8px; height: 8px; border-radius: 50%; }

        .panel-info-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
        .info-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .info-item .il { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        .info-item .iv { font-size: 0.85rem; color: #0f172a; font-weight: 700; }

        .view-projects-btn { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; padding: 16px; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; border-radius: 14px; font-weight: 700; text-decoration: none; transition: 0.3s; text-align: center; border: none; cursor: pointer; }
        .view-projects-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4); }

        .main-leaflet-map .leaflet-control-zoom { display: none; }

        .custom-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          padding: 8px 14px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
        }
        .custom-tooltip::before { border-top-color: rgba(15, 23, 42, 0.95) !important; }
        .knowledge-map-page { padding: 40px; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
    </div>
  )
}

export default KnowledgeMap
