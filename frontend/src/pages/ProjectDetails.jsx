import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaGlobeAmericas, FaHeart, FaCity, FaRocket, FaLeaf, FaShieldAlt, FaMicrochip, FaCalendarAlt, FaExternalLinkAlt, FaBuilding, FaUserTie } from 'react-icons/fa'

const API_BASE = 'http://localhost:8000'

const getSectorInfo = (sector) => {
  const map = {
    'Health':       { class: 'health', icon: <FaHeart /> },
    'Education':    { class: 'edu',    icon: <FaRocket /> },
    'Agriculture':  { class: 'agri',   icon: <FaGlobeAmericas /> },
    'Finance':      { class: 'fin',    icon: <FaCity /> },
    'Transportation': { class: 'trans',  icon: <FaRocket /> },
    'Energy':       { class: 'energy', icon: <FaRocket /> },
    'Environment':  { class: 'env',    icon: <FaLeaf /> },
    'Security':     { class: 'security', icon: <FaShieldAlt /> },
    'GovTech':      { class: 'fin',    icon: <FaCity /> },
    'Smart Cities': { class: 'fin',    icon: <FaCity /> },
    'Climate':      { class: 'env',    icon: <FaLeaf /> }
  }
  return map[sector] || { class: 'default', icon: <FaMicrochip /> }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Ongoing'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProjectDetails()
  }, [id])

  const fetchProjectDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/projects/${id}/details`)
      if (!response.ok) throw new Error('Project not found')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading project details...</p>
    </div>
  )

  if (error || !data) return (
    <div className="error-container">
      <h2>Oops! {error || 'Project not found'}</h2>
      <button onClick={() => navigate('/projects')} className="back-btn">Back to Projects</button>
    </div>
  )

  const project = data
  const stakeholders = data.stakeholders || []
  const sectorInfo = getSectorInfo(project.sector)

  return (
    <div className="project-details-page">
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-link">
          <FaArrowLeft /> Back
        </button>

        <header className="project-header animate-up">
          <div className="header-top">
            <div className={`sector-badge ${sectorInfo.class}`}>
              {sectorInfo.icon} {project.sector}
            </div>
            <div className={`status-badge ${project.status}`}>
              {project.status}
            </div>
          </div>
          
          <h1>{project.title}</h1>
          
          <div className="header-meta">
            <div className="meta-item">
              <FaGlobeAmericas /> <span>{project.country_name || 'Regional'}</span>
            </div>
            <div className="meta-item">
              <FaCalendarAlt /> <span>{formatDate(project.start_date)} — {formatDate(project.end_date)}</span>
            </div>
            <div className="meta-item">
              <FaMicrochip /> <span>{project.technology}</span>
            </div>
          </div>
        </header>

        <section className="project-section description-section animate-up delay-1">
          <h2>Project Overview</h2>
          <div className="description-card">
            <p>{project.description}</p>
            <div className="description-footer">
              {project.website && (
                <a href={project.website} target="_blank" rel="noopener noreferrer" className="project-website-link">
                  <FaExternalLinkAlt /> Visit Official Website
                </a>
              )}
              
              {project.documents && project.documents.length > 0 && (
                <div className="project-attachments">
                  <h3>Attachments</h3>
                  <div className="attachments-list">
                    {project.documents.map((doc, idx) => (
                      <a 
                        key={idx} 
                        href={`${API_BASE}${doc.path}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="attachment-item"
                      >
                        <FaRocket /> {doc.original_name || doc.original_filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="project-section stakeholders-section animate-up delay-2">
          <h2>Stakeholders Involved</h2>
          <div className="stakeholders-grid">
            {stakeholders && stakeholders.length > 0 ? stakeholders.map((s, idx) => (
              <div key={idx} className="stakeholder-card">
                <div className="s-card-header">
                  <div className="s-icon">
                    <FaBuilding />
                  </div>
                  <div className="s-role-badge">
                    <FaUserTie /> {s.role}
                  </div>
                </div>
                <h3>{s.name}</h3>
                <p className="s-type">{s.type}</p>
                <p className="s-location">{s.city}, {s.country}</p>
                {s.website && (
                  <a href={s.website} target="_blank" rel="noopener noreferrer" className="s-link">
                    <FaExternalLinkAlt /> Website
                  </a>
                )}
              </div>
            )) : (
              <p className="no-stakeholders">No detailed stakeholder information available for this project.</p>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .project-details-page {
          padding: 80px 0;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Outfit', sans-serif;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 32px;
          transition: color 0.3s;
        }
        .back-link:hover { color: #2563eb; }

        .project-header {
          background: #fff;
          padding: 40px;
          border-radius: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          border: 1px solid #f1f5f9;
          margin-bottom: 40px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .sector-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .status-badge {
          padding: 6px 16px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-badge.ongoing { background: #eff6ff; color: #2563eb; }
        .status-badge.completed { background: #ecfdf5; color: #10b981; }

        .project-header h1 {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 24px;
          line-height: 1.1;
        }

        .header-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 32px;
          padding-top: 24px;
          border-top: 1px solid #f1f5f9;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-weight: 600;
        }
        .meta-item span { color: #1e293b; }
        .meta-item svg { color: #2563eb; font-size: 1.2rem; }

        .project-section {
          margin-bottom: 60px;
        }

        .project-section h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 24px;
        }

        .description-card {
          background: #fff;
          padding: 40px;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .description-card p {
          font-size: 1.15rem;
          line-height: 1.8;
          color: #475569;
          margin-bottom: 24px;
          white-space: pre-line;
        }

        .project-website-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0f172a;
          color: #fff;
          padding: 14px 28px;
          border-radius: 16px;
          font-weight: 700;
          text-decoration: none;
          transition: 0.3s;
        }
        .project-website-link:hover { transform: translateY(-3px); background: #1e293b; }

        .description-footer {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #f1f5f9;
        }

        .project-attachments h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: #0f172a;
        }

        .attachments-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 10px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          color: #2563eb;
          text-decoration: none;
          transition: 0.2s;
        }
        .attachment-item:hover {
          background: #fff;
          border-color: #2563eb;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .stakeholders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .stakeholder-card {
          background: #fff;
          padding: 24px;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          transition: 0.3s;
        }
        .stakeholder-card:hover { transform: translateY(-5px); border-color: #cbd5e1; }

        .s-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .s-icon {
          width: 44px;
          height: 44px;
          background: #f1f5f9;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          font-size: 1.2rem;
        }

        .s-role-badge {
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stakeholder-card h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .s-type { color: #2563eb; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .s-location { color: #64748b; font-weight: 500; font-size: 0.95rem; margin-bottom: 20px; }

        .s-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
        }
        .s-link:hover { text-decoration: underline; }

        .loading-container, .error-container {
          padding: 100px 24px;
          text-align: center;
        }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .back-btn { background: #2563eb; color: #fff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 20px; }

        .edu { background: #eff6ff; color: #3b82f6; }
        .agri { background: #ecfdf5; color: #10b981; }
        .health { background: #fef2f2; color: #ef4444; }
        .fin { background: #f5f3ff; color: #8b5cf6; }
        .trans { background: #fff7ed; color: #f97316; }
        .energy { background: #fffbeb; color: #f59e0b; }
        .env { background: #f0fdf4; color: #22c55e; }
        .security { background: #f8fafc; color: #475569; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeUp 0.5s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
      `}</style>
    </div>
  )
}

export default ProjectDetails