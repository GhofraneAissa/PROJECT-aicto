import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaSearch, FaFilter, FaArrowRight, FaExternalLinkAlt } from 'react-icons/fa'

const API_BASE = 'http://localhost:8000'

const SDG_COLORS = [
  '#E5243B', '#DDA63A', '#4C9F38', '#C5192D', '#FF3A21', '#26BDE2',
  '#FCC30B', '#A21942', '#FD6925', '#DD1367', '#FD9D24', '#BF8B2E',
  '#3F7E44', '#0A97D9', '#56C02B', '#00689D', '#19486A'
]

const GLOBAL_GOALS = [
  'No Poverty', 'Zero Hunger', 'Good Health and Well-being', 'Quality Education',
  'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy',
  'Decent Work and Economic Growth', 'Industry, Innovation and Infrastructure',
  'Reduced Inequalities', 'Sustainable Cities and Communities',
  'Responsible Consumption and Production', 'Climate Action',
  'Life Below Water', 'Life on Land', 'Peace, Justice and Strong Institutions',
  'Partnerships for the Goals'
]

const SHORT_NAMES = [
  'No Poverty', 'Zero Hunger', 'Good Health', 'Quality Education',
  'Gender Equality', 'Clean Water', 'Affordable Energy',
  'Decent Work', 'Industry & Innovation', 'Reduced Inequalities',
  'Sustainable Cities', 'Responsible Consumption', 'Climate Action',
  'Life Below Water', 'Life on Land', 'Peace & Justice',
  'Partnerships'
]

function SDGs() {
  const [sdgs, setSdgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [stats, setStats] = useState({})
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/sdgs/`).then(r => { if (!r.ok) throw new Error('Failed to fetch SDGs'); return r.json() }),
      fetch(`${API_BASE}/api/analytics/sdg-coverage`).then(r => { if (!r.ok) throw new Error('Failed to fetch SDG stats'); return r.json() })
    ])
      .then(([sdgData, coverageData]) => {
        setSdgs(sdgData)
        setError(null)
        const coverageMap = {}
        coverageData.forEach(item => { coverageMap[item.goal_number] = item.count })
        const s = {}
        sdgData.forEach(sdg => {
          s[sdg.id] = { projects: coverageMap[sdg.goal_number] || 0 }
        })
        setStats(s)
        if (sdgData.length > 0) setSelectedId(sdgData[0].id)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search) return sdgs
    const q = search.toLowerCase()
    return sdgs.filter(s =>
      s.goal_number.toString().includes(q) ||
      s.title.toLowerCase().includes(q)
    )
  }, [sdgs, search])

  const selected = sdgs.find(s => s.id === selectedId)
  const goalIndex = selected ? selected.goal_number - 1 : 0

  if (loading) {
    return (
      <div className="sdg-page-wrapper">
        <div className="sdg-loading-state">{t('sdgs.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sdg-page-wrapper">
        <div className="sdg-error-state">{t('sdgs.error')}: {error}</div>
      </div>
    )
  }

  return (
    <div className="sdg-page-wrapper">
      <div className="sdg-container">
        <div className="sdg-header-bar">
          <div className="sdg-breadcrumb">FRAMEWORK / GLOBAL GOALS</div>
          <div className="sdg-header-row">
            <h1 className="sdg-main-title">
              Sustainable Development <span className="sdg-title-blue">Goals</span>
            </h1>
            <div className="sdg-header-actions">
              <div className="sdg-search-box">
                <FaSearch className="sdg-search-icon" />
                <input
                  type="text"
                  className="sdg-search-input"
                  placeholder="Find a goal..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="sdg-filter-btn" onClick={() => setShowFilter(!showFilter)}>
                <FaFilter />
              </button>
            </div>
          </div>
        </div>

        <div className="sdg-body">
          <div className="sdg-grid-col">
            <div className="sdg-card-grid">
              {filtered.map((sdg, i) => {
                const color = SDG_COLORS[i % SDG_COLORS.length]
                const isSelected = sdg.id === selectedId
                return (
                  <div
                    key={sdg.id}
                    className={`sdg-grid-card ${isSelected ? 'sdg-grid-card--selected' : ''}`}
                    style={{
                      backgroundColor: color,
                      borderColor: isSelected ? '#E5243B' : 'transparent',
                      boxShadow: isSelected ? '0 0 0 3px #E5243B, 0 4px 20px rgba(229, 36, 59, 0.3)' : 'none'
                    }}
                    onClick={() => setSelectedId(sdg.id)}
                  >
                    <span className="sdg-card-number">{sdg.goal_number}</span>
                    <img src={sdg.image_url} alt={sdg.title} className="sdg-card-icon-img" />
                    <span className="sdg-card-project-count">{stats[sdg.id]?.projects || 0}</span>
                  </div>
                )
              })}
            </div>
            {filtered.length === 0 && (
              <div className="sdg-no-results">No goals match your search</div>
            )}
          </div>

          <div className="sdg-detail-col">
            {selected && (
              <div className="sdg-detail-card">
                <div className="sdg-detail-top">
                  <div className="sdg-detail-badge-row">
                    <span className="sdg-detail-badge" style={{ color: SDG_COLORS[goalIndex], background: `${SDG_COLORS[goalIndex]}18` }}>
                      GOAL {selected.goal_number}
                    </span>
                    <div className="sdg-detail-thumb">
                      <img src={selected.image_url} alt={selected.title} />
                    </div>
                  </div>
                  <h2 className="sdg-detail-title">{selected.title}</h2>
                  <p className="sdg-detail-desc">
                    {GLOBAL_GOALS[goalIndex] && (
                      <>Take action to ensure {GLOBAL_GOALS[goalIndex].toLowerCase()} is achieved for all communities across the Arab region through AI-powered initiatives and collaborative projects.</>
                    )}
                  </p>
                </div>

                <div className="sdg-detail-divider" />

                <div className="sdg-detail-stats">
                  <div className="sdg-stat-box sdg-stat-box--full">
                    <span className="sdg-stat-number">{stats[selected.id]?.projects || 0}</span>
                    <span className="sdg-stat-label">Aligned Projects</span>
                  </div>
                </div>

                <div className="sdg-detail-divider" />

                <div className="sdg-detail-actions">
                  <button className="sdg-btn-primary" onClick={() => navigate(`/projects?sdg=${selected.goal_number}`)}>
                    Explore Aligned Projects <FaArrowRight />
                  </button>
                  <a
                    href={`https://sdgs.un.org/goals/goal${selected.goal_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sdg-btn-secondary"
                  >
                    <FaExternalLinkAlt /> UN Progress Report
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .sdg-page-wrapper {
          min-height: 100vh;
          background: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .sdg-loading-state,
        .sdg-error-state {
          text-align: center;
          padding: 120px 20px;
          font-size: 1.2rem;
          color: var(--gray-500);
        }
        .sdg-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 32px;
        }
        .sdg-header-bar {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 0;
          margin-bottom: 32px;
        }
        .sdg-breadcrumb {
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .sdg-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .sdg-main-title {
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }
        .sdg-title-blue {
          color: #2563eb;
        }
        .sdg-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sdg-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sdg-search-icon {
          position: absolute;
          left: 14px;
          color: #9ca3af;
          font-size: 0.9rem;
          pointer-events: none;
        }
        .sdg-search-input {
          width: 260px;
          padding: 10px 14px 10px 40px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
          background: #fff;
        }
        .sdg-search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .sdg-search-input::placeholder {
          color: #9ca3af;
        }
        .sdg-filter-btn {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sdg-filter-btn:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .sdg-body {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 32px;
          align-items: start;
        }
        .sdg-grid-col {
          min-width: 0;
        }
        .sdg-card-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }
        .sdg-grid-card {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 12px;
        display: flex;
        overflow: hidden;           /* ✅ ajoute ça pour que l'image ne déborde pas */
        cursor: pointer;
        position: relative;
        transition: transform 0.2s, box-shadow 0.2s;
        padding: 0;                 /* ✅ pas de padding */
        border: 3px solid transparent;
        background: transparent;    /* ✅ pas de fond */
        }
        .sdg-grid-card:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
        }
        .sdg-grid-card--selected {
          border-color: #E5243B !important;
          box-shadow: 0 0 0 3px #E5243B, 0 4px 20px rgba(229, 36, 59, 0.3) !important;
        }
        .sdg-card-number {
          position: absolute;
          top: 6px;
          left: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          line-height: 1;
          z-index: 2;
        }
        .sdg-card-project-count {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: rgba(0,0,0,0.5);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          z-index: 2;
        }
        .sdg-card-icon-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0;
        display: block;
        }
        .sdg-no-results {
          text-align: center;
          padding: 80px 20px;
          color: var(--gray-400);
          font-size: 1.1rem;
        }

        .sdg-detail-col {
          position: sticky;
          top: 32px;
        }
        .sdg-detail-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .sdg-detail-top {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sdg-detail-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sdg-detail-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 16px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .sdg-detail-thumb {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 4px;
          background: #fff;
        }
        .sdg-detail-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .sdg-detail-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: #111827;
          margin: 4px 0 0;
          line-height: 1.2;
        }
        .sdg-detail-desc {
          font-size: 0.9rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 4px 0 0;
        }
        .sdg-detail-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 20px 0;
        }
        .sdg-detail-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .sdg-stat-box--full { grid-column: 1 / -1; }
        .sdg-stat-box {
          text-align: center;
          padding: 16px 12px;
          background: #f9fafb;
          border-radius: 12px;
        }
        .sdg-stat-number {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
        }
        .sdg-stat-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        .sdg-detail-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sdg-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          background: #E5243B;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .sdg-btn-primary:hover {
          background: #c81e33;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(229, 36, 59, 0.35);
        }
        .sdg-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          color: #374151;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          text-decoration: none;
        }
        .sdg-btn-secondary:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        @media (max-width: 1200px) {
          .sdg-card-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 1024px) {
          .sdg-body {
            grid-template-columns: 1fr;
          }
          .sdg-detail-col {
            position: static;
          }
          .sdg-card-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        @media (max-width: 768px) {
          .sdg-container { padding: 0 16px; }
          .sdg-main-title { font-size: 1.5rem; }
          .sdg-search-input { width: 180px; }
          .sdg-header-row { flex-direction: column; align-items: flex-start; }
          .sdg-header-actions { width: 100%; }
          .sdg-search-box { flex: 1; }
          .sdg-search-input { width: 100%; }
          .sdg-card-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }
        @media (max-width: 480px) {
          .sdg-card-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}

export default SDGs
