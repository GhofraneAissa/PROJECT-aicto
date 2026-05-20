import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaProjectDiagram, FaArrowRight, FaSpinner, FaExclamationCircle, FaHeart, FaLightbulb, FaGlobeAmericas, FaCity, FaRocket, FaMicrochip, FaShieldAlt, FaLeaf, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa'

const statusConfig = {
  pending: { label: 'Pending', icon: <FaHourglassHalf />, color: '#f59e0b', bg: '#fffbeb' },
  approved: { label: 'Approved', icon: <FaCheckCircle />, color: '#059669', bg: '#ecfdf5' },
  rejected: { label: 'Rejected', icon: <FaTimesCircle />, color: '#dc2626', bg: '#fef2f2' },
  active: { label: 'Active', icon: <FaCheckCircle />, color: '#059669', bg: '#ecfdf5' },
  Active: { label: 'Active', icon: <FaCheckCircle />, color: '#059669', bg: '#ecfdf5' },
  Completed: { label: 'Completed', icon: <FaCheckCircle />, color: '#2563eb', bg: '#eff6ff' },
  'In Progress': { label: 'In Progress', icon: <FaClock />, color: '#7c3aed', bg: '#f5f3ff' },
}

const getSectorInfo = (sector) => {
  const map = {
    Health:       { icon: <FaHeart />, color: '#dc2626' },
    EduTech:      { icon: <FaLightbulb />, color: '#d97706' },
    Education:    { icon: <FaLightbulb />, color: '#d97706' },
    AgriTech:     { icon: <FaGlobeAmericas />, color: '#059669' },
    Agriculture:  { icon: <FaGlobeAmericas />, color: '#059669' },
    Finance:      { icon: <FaCity />, color: '#2563eb' },
    Transportation: { icon: <FaRocket />, color: '#7c3aed' },
    Energy:       { icon: <FaLightbulb />, color: '#f59e0b' },
    Environment:  { icon: <FaLeaf />, color: '#22c55e' },
    Security:     { icon: <FaShieldAlt />, color: '#6b7280' },
  }
  return map[sector] || { icon: <FaMicrochip />, color: '#6b7280' }
}

function MyProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setUser(u)
        fetch(`http://localhost:8000/api/users/${u.id}/projects`)
          .then(res => res.json())
          .then(data => {
            setProjects(data.projects || [])
            setLoading(false)
          })
          .catch(err => {
            setError('Failed to load projects')
            setLoading(false)
          })
      } catch {
        setError('User not found. Please log in.')
        setLoading(false)
      }
    } else {
      setError('Please log in to view your projects.')
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="my-projects-page">
        <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
          <FaSpinner className="spin" size={32} style={{ color: '#2563eb' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading your projects...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="my-projects-page">
        <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
          <FaExclamationCircle size={48} style={{ color: '#9ca3af' }} />
          <h2 style={{ margin: '16px 0', color: '#374151' }}>{error}</h2>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="my-projects-page">
      <div className="container">
        <div className="mp-header">
          <div className="mp-header-left">
            <FaProjectDiagram size={28} style={{ color: '#2563eb' }} />
            <div>
              <h1>My Projects</h1>
              <p>{projects.length} project{projects.length !== 1 ? 's' : ''} submitted</p>
            </div>
          </div>
          <Link to="/projects" className="btn btn-primary">
            <FaProjectDiagram /> Browse All Projects
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mp-empty">
            <FaProjectDiagram size={48} style={{ color: '#d1d5db' }} />
            <h3>No projects yet</h3>
            <p>You haven't submitted any projects yet.</p>
            <Link to="/projects" className="btn btn-primary">
              Submit Your First Project
            </Link>
          </div>
        ) : (
          <div className="mp-grid">
            {projects.map(p => {
              const st = statusConfig[p.status] || { label: p.status, icon: <FaClock />, color: '#6b7280', bg: '#f9fafb' }
              const si = getSectorInfo(p.sector)
              return (
                <Link to={`/projects/${p.id}`} key={p.id} className="mp-card">
                  <div className="mp-card-top">
                    <div className="mp-status" style={{ background: st.bg, color: st.color }}>
                      {st.icon} {st.label}
                    </div>
                    <div className="mp-sector-icon" style={{ color: si.color }}>
                      {si.icon}
                    </div>
                  </div>
                  <h3 className="mp-card-title">{p.title}</h3>
                  <div className="mp-card-meta">
                    {p.country && <span>{p.country}</span>}
                    {p.sector && <span className="mp-tag">{p.sector}</span>}
                    {p.technology && <span className="mp-tag mp-tech">{p.technology}</span>}
                  </div>
                  {p.description && <p className="mp-card-desc">{p.description}</p>}
                  {p.status === 'rejected' && p.rejection_reason && (
                    <div className="mp-rejection">
                      <strong>Reason:</strong> {p.rejection_reason}
                    </div>
                  )}
                  <div className="mp-card-footer">
                    <span className="mp-view-details">
                      View Details <FaArrowRight />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .my-projects-page {
          min-height: 60vh;
          padding: 60px 0;
          background: #f9fafb;
        }
        .spin {
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .mp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 40px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .mp-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .mp-header-left h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }
        .mp-header-left p {
          color: #6b7280;
          margin: 2px 0 0;
          font-size: 0.9rem;
        }
        .mp-empty {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .mp-empty h3 {
          margin: 16px 0 8px;
          color: #374151;
        }
        .mp-empty p {
          color: #9ca3af;
          margin-bottom: 24px;
        }
        .mp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }
        .mp-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid #f3f4f6;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
        }
        .mp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          border-color: transparent;
        }
        .mp-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .mp-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .mp-sector-icon {
          font-size: 1.3rem;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border-radius: 10px;
        }
        .mp-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px;
          line-height: 1.4;
        }
        .mp-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #6b7280;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .mp-tag {
          background: #f3f4f6;
          padding: 2px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #4b5563;
        }
        .mp-tech {
          background: #eff6ff;
          color: #2563eb;
        }
        .mp-card-desc {
          font-size: 0.85rem;
          color: #9ca3af;
          line-height: 1.5;
          flex: 1;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mp-rejection {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.8rem;
          color: #dc2626;
          margin-bottom: 12px;
        }
        .mp-card-footer {
          border-top: 1px solid #f3f4f6;
          padding-top: 14px;
          margin-top: auto;
        }
        .mp-view-details {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2563eb;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .mp-card:hover .mp-view-details svg {
          transform: translateX(4px);
        }
        .mp-view-details svg {
          transition: transform 0.2s;
        }
        @media (max-width: 768px) {
          .mp-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .mp-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default MyProjects