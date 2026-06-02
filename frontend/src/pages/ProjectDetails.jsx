import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaGlobeAmericas, FaHeart, FaCity, FaRocket, FaLeaf, FaShieldAlt, FaMicrochip, FaCalendarAlt, FaExternalLinkAlt, FaBuilding, FaUserTie, FaFlag, FaProjectDiagram, FaDownload } from 'react-icons/fa'

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
  return map[sector] || { class: 'default', icon: <FaProjectDiagram /> }
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
    <div className="modern-project-details">
      <section className="details-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge"><FaProjectDiagram /><span>Project Details</span></div>
          </div>
        </div>
      </section>
      <section className="details-body">
        <div className="container" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--p-text-light)', marginTop: 16 }}>Loading project details...</p>
        </div>
      </section>
    </div>
  )

  if (error || !data) return (
    <div className="modern-project-details">
      <section className="details-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge"><FaProjectDiagram /><span>Project Details</span></div>
          </div>
        </div>
      </section>
      <section className="details-body">
        <div className="container" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>Project Not Found</h2>
          <p style={{ color: 'var(--p-text-light)', marginBottom: 24 }}>{error || 'The project you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/projects')} className="action-btn">Back to Projects</button>
        </div>
      </section>
    </div>
  )

  const project = data
  const stakeholders = data.stakeholders || []
  const sectorInfo = getSectorInfo(project.sector)

  return (
    <div className="modern-project-details">
      <section className="details-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content animate-up">
            <div className="hero-badge">
              <FaProjectDiagram />
              <span>Project Details</span>
            </div>
            <h1>{project.title}</h1>
            <div className="hero-meta">
              <span className="hero-meta-item">
                <FaGlobeAmericas /> {project.country_name || 'Regional'}
              </span>
              <span className="hero-meta-item">
                <FaCalendarAlt /> {formatDate(project.start_date)} — {formatDate(project.end_date)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="details-body">
        <div className="container">
          <div className="body-top animate-up delay-1">
            <button onClick={() => navigate(-1)} className="back-link">
              <FaArrowLeft /> Back
            </button>
            <div className="top-badges">
              <span className={`sector-badge ${sectorInfo.class}`}>
                {sectorInfo.icon} {project.sector}
              </span>
              <span className={`status-badge ${project.status}`}>
                {project.status}
              </span>
            </div>
          </div>

          <div className="info-cards-grid animate-up delay-1">
            <div className="info-card">
              <div className="info-card-icon"><FaBuilding /></div>
              <span className="info-card-label">Organization</span>
              <span className="info-card-value">{project.organization || '-'}</span>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><FaGlobeAmericas /></div>
              <span className="info-card-label">Country</span>
              <span className="info-card-value">{project.country_name || 'Regional'}</span>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><FaMicrochip /></div>
              <span className="info-card-label">Technology</span>
              <span className="info-card-value">{project.technology || '-'}</span>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><FaFlag /></div>
              <span className="info-card-label">SDG Alignment</span>
              <span className="info-card-value">{project.sdg_alignment || '-'}</span>
            </div>
          </div>

          <section className="detail-section animate-up delay-2">
            <h2>Project Overview</h2>
            <div className="content-card">
              <p className="description-text">{project.description}</p>
            </div>
          </section>

          {(project.website || (project.documents && project.documents.length > 0)) && (
            <section className="detail-section animate-up delay-2">
              <h2>Resources & Links</h2>
              <div className="resources-flex">
                {project.website && (
                  <a href={project.website} target="_blank" rel="noopener noreferrer" className="resource-link-btn">
                    <FaExternalLinkAlt /> Visit Official Website
                  </a>
                )}
                {project.documents && project.documents.length > 0 && project.documents.map((doc, idx) => (
                  <a key={idx} href={`${API_BASE}${doc.path}`} target="_blank" rel="noopener noreferrer" className="resource-link-btn outline">
                    <FaDownload /> {doc.original_name || doc.original_filename}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="detail-section animate-up delay-2">
            <h2>Stakeholders ({stakeholders.length})</h2>
            {stakeholders.length > 0 ? (
              <div className="stakeholders-grid">
                {stakeholders.map((s, idx) => (
                  <div key={idx} className="stakeholder-card">
                    <div className="stakeholder-top">
                      <div className="stakeholder-icon"><FaBuilding /></div>
                      <span className="stakeholder-role"><FaUserTie /> {s.role}</span>
                    </div>
                    <h3>{s.name}</h3>
                    <p className="stakeholder-type">{s.type}</p>
                    <p className="stakeholder-location">{s.city ? `${s.city}, ` : ''}{s.country}</p>
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="stakeholder-link">
                        <FaExternalLinkAlt /> Website
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="content-card empty-state">
                <p>No stakeholder information available for this project.</p>
              </div>
            )}
          </section>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .modern-project-details {
          --p-primary: #2563eb;
          --p-secondary: #0f172a;
          --p-text: #1e293b;
          --p-text-light: #64748b;
          font-family: 'Outfit', sans-serif;
          color: var(--p-text);
          background: #fff;
          min-height: 100vh;
        }

        .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

        .details-hero {
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
          background: var(--p-primary);
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

        .details-hero h1 {
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
          color: var(--p-secondary);
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-meta {
          display: flex;
          justify-content: center;
          gap: 32px;
          flex-wrap: wrap;
        }
        .hero-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--p-text-light);
          font-weight: 600;
          font-size: 1rem;
        }
        .hero-meta-item svg { color: var(--p-primary); }

        .details-body {
          padding-bottom: 100px;
          margin-top: -30px;
        }

        .body-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #f1f5f9;
          padding: 10px 20px;
          border-radius: 14px;
          color: var(--p-text-light);
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s;
          font-family: inherit;
          font-size: 0.9rem;
        }
        .back-link:hover { color: var(--p-primary); border-color: #bfdbfe; background: #eff6ff; }

        .top-badges { display: flex; gap: 10px; flex-wrap: wrap; }

        .sector-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sector-badge svg { font-size: 1rem; }

        .health { background: #fef2f2; color: #ef4444; }
        .edu { background: #eff6ff; color: #3b82f6; }
        .agri { background: #ecfdf5; color: #10b981; }
        .fin { background: #f5f3ff; color: #8b5cf6; }
        .trans { background: #fff7ed; color: #f97316; }
        .energy { background: #fffbeb; color: #f59e0b; }
        .env { background: #f0fdf4; color: #22c55e; }
        .security { background: #f8fafc; color: #475569; }
        .default { background: #f1f5f9; color: var(--p-text-light); }

        .status-badge {
          padding: 8px 18px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-badge.approved,
        .status-badge.active { background: #ecfdf5; color: #10b981; }
        .status-badge.pending { background: #fffbeb; color: #f59e0b; }
        .status-badge.rejected { background: #fef2f2; color: #ef4444; }
        .status-badge.completed { background: #ecfdf5; color: #10b981; }
        .status-badge.ongoing { background: #eff6ff; color: #3b82f6; }

        .info-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 48px;
        }

        .info-card {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          transition: 0.3s;
        }
        .info-card:hover { border-color: #e2e8f0; box-shadow: 0 8px 24px rgba(0,0,0,0.02); }

        .info-card-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          background: #f8fafc;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: var(--p-primary);
        }
        .info-card-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--p-text-light);
          margin-bottom: 6px;
        }
        .info-card-value {
          display: block;
          font-weight: 800;
          font-size: 1rem;
          color: var(--p-secondary);
        }

        .detail-section {
          margin-bottom: 48px;
        }
        .detail-section h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--p-secondary);
          margin-bottom: 20px;
        }

        .content-card {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }

        .description-text {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #475569;
          white-space: pre-line;
          margin: 0;
        }

        .resources-flex {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .resource-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          transition: 0.3s;
          background: var(--p-secondary);
          color: #fff;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .resource-link-btn:hover { transform: translateY(-2px); background: #1e293b; }
        .resource-link-btn.outline {
          background: #f8fafc;
          color: var(--p-primary);
          border: 1.5px solid #e2e8f0;
        }
        .resource-link-btn.outline:hover {
          background: var(--p-primary);
          color: #fff;
          border-color: var(--p-primary);
        }

        .stakeholders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .stakeholder-card {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 24px;
          transition: 0.3s;
        }
        .stakeholder-card:hover { transform: translateY(-4px); border-color: #e2e8f0; box-shadow: 0 12px 24px rgba(0,0,0,0.02); }

        .stakeholder-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .stakeholder-icon {
          width: 44px;
          height: 44px;
          background: #f1f5f9;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--p-primary);
          font-size: 1.2rem;
        }
        .stakeholder-role {
          background: rgba(37,99,235,0.08);
          color: var(--p-primary);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stakeholder-card h3 {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--p-secondary);
          margin: 0 0 6px;
        }
        .stakeholder-type {
          color: var(--p-primary);
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 4px;
        }
        .stakeholder-location {
          color: var(--p-text-light);
          font-weight: 500;
          font-size: 0.9rem;
          margin: 0 0 16px;
        }
        .stakeholder-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--p-secondary);
          font-weight: 700;
          font-size: 0.85rem;
          text-decoration: none;
        }
        .stakeholder-link:hover { color: var(--p-primary); }

        .empty-state { text-align: center; padding: 48px; }
        .empty-state p { color: var(--p-text-light); font-size: 1rem; margin: 0; }

        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #f1f5f9;
          border-top-color: var(--p-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .action-btn {
          background: var(--p-primary);
          color: #fff;
          border: none;
          padding: 14px 28px;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s;
          font-family: inherit;
          font-size: 0.9rem;
        }
        .action-btn:hover { background: #1d4ed8; transform: translateY(-2px); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeUp 0.5s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }

        @media (max-width: 900px) {
          .info-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .info-cards-grid { grid-template-columns: 1fr; }
          .body-top { flex-direction: column; align-items: flex-start; }
          .hero-meta { flex-direction: column; align-items: center; gap: 8px; }
          .details-hero h1 { font-size: 1.8rem; }
          .content-card { padding: 24px; }
          .details-hero { padding: 100px 0 60px; }
        }
      `}</style>
    </div>
  )
}

export default ProjectDetails
