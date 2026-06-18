import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FaArrowLeft, FaGlobeAmericas, FaHeart, FaCity, FaRocket,
  FaLeaf, FaShieldAlt, FaMicrochip, FaCalendarAlt,
  FaExternalLinkAlt, FaBuilding, FaUserTie, FaFlag,
  FaProjectDiagram, FaDownload, FaUsers, FaClock,
  FaMapMarkerAlt, FaLink, FaFileAlt, FaCheckCircle,
  FaTimesCircle, FaHourglassHalf, FaTag, FaLayerGroup,
  FaShareAlt, FaBookmark, FaEye, FaThumbsUp, FaChartPie,
  FaGraduationCap, FaBriefcase, FaHandshake, FaLightbulb
} from 'react-icons/fa'

import { API_BASE } from '../config'

const getSectorInfo = (sector) => {
  const map = {
    'Health': { color: '#EF4444', bg: '#FEF2F2', icon: <FaHeart />, label: 'Healthcare' },
    'Education': { color: '#3B82F6', bg: '#EFF6FF', icon: <FaGraduationCap />, label: 'Education' },
    'Agriculture': { color: '#10B981', bg: '#ECFDF5', icon: <FaLeaf />, label: 'Agriculture' },
    'Finance': { color: '#8B5CF6', bg: '#F5F3FF', icon: <FaBriefcase />, label: 'Finance' },
    'Transportation': { color: '#F97316', bg: '#FFF7ED', icon: <FaRocket />, label: 'Transport' },
    'Energy': { color: '#F59E0B', bg: '#FFFBEB', icon: <FaLightbulb />, label: 'Energy' },
    'Environment': { color: '#22C55E', bg: '#F0FDF4', icon: <FaLeaf />, label: 'Environment' },
    'Security': { color: '#475569', bg: '#F8FAFC', icon: <FaShieldAlt />, label: 'Security' },
    'GovTech': { color: '#8B5CF6', bg: '#F5F3FF', icon: <FaCity />, label: 'GovTech' },
    'Smart Cities': { color: '#06B6D4', bg: '#ECFEFF', icon: <FaCity />, label: 'Smart Cities' },
    'Climate': { color: '#22C55E', bg: '#F0FDF4', icon: <FaLeaf />, label: 'Climate' }
  }
  return map[sector] || { color: '#64748B', bg: '#F1F5F9', icon: <FaProjectDiagram />, label: sector }
}

const getStatusConfig = (status) => {
  const map = {
    'approved': { color: '#10B981', bg: '#ECFDF5', icon: <FaCheckCircle />, label: 'Approved' },
    'active': { color: '#10B981', bg: '#ECFDF5', icon: <FaCheckCircle />, label: 'Active' },
    'pending': { color: '#F59E0B', bg: '#FFFBEB', icon: <FaHourglassHalf />, label: 'Pending' },
    'rejected': { color: '#EF4444', bg: '#FEF2F2', icon: <FaTimesCircle />, label: 'Rejected' },
    'draft': { color: '#64748B', bg: '#F1F5F9', icon: <FaFileAlt />, label: 'Draft' },
    'completed': { color: '#10B981', bg: '#ECFDF5', icon: <FaCheckCircle />, label: 'Completed' },
    'ongoing': { color: '#3B82F6', bg: '#EFF6FF', icon: <FaClock />, label: 'Ongoing' }
  }
  return map[status] || map.draft
}

function ProjectDetails() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const formatDate = (dateStr) => {
    if (!dateStr) return t('projectDetails.ongoing')
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateDuration = (start, end) => {
    if (!start) return null
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const diffTime = Math.abs(endDate - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`
    return `${Math.floor(diffDays / 365)} years`
  }

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.title,
        text: `Check out this project: ${data?.title}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert(t('projectDetails.linkCopied'))
    }
  }

  if (loading) return <LoadingState t={t} />
  if (error || !data) return <ErrorState error={error} navigate={navigate} t={t} />

  const project = data
  const stakeholders = data.stakeholders || []
  const sectorInfo = getSectorInfo(project.sector)
  const statusConfig = getStatusConfig(project.status)
  const duration = calculateDuration(project.start_date, project.end_date)

  return (
    <div className="modern-project-details">
      <section className="details-hero">
        <div className="hero-pattern" />
        <div className="hero-gradient" />
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-top">
              <button onClick={() => navigate(-1)} className="back-btn">
                <FaArrowLeft /> {t('projectDetails.back')}
              </button>
              <div className="hero-actions">
                <button className="hero-action-btn" onClick={handleShare}>
                  <FaShareAlt /> {t('projectDetails.share')}
                </button>
                <button
                  className={`hero-action-btn ${isBookmarked ? 'active' : ''}`}
                  onClick={() => setIsBookmarked(!isBookmarked)}
                >
                  <FaBookmark /> {isBookmarked ? t('projectDetails.saved') : t('projectDetails.save')}
                </button>
              </div>
            </div>

            <div className="hero-badges">
              <span className="hero-badge sector" style={{ background: sectorInfo.bg, color: sectorInfo.color }}>
                {sectorInfo.icon} {sectorInfo.label}
              </span>
              <span className="hero-badge status" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>

            <h1>{project.title}</h1>

            <div className="hero-meta-grid">
              <div className="hero-meta-item">
                <FaGlobeAmericas className="meta-icon" />
                <span>{project.country_name || t('projectDetails.regional')}</span>
              </div>
              <div className="hero-meta-item">
                <FaBuilding className="meta-icon" />
                <span>{project.organization || t('projectDetails.n/a')}</span>
              </div>
              <div className="hero-meta-item">
                <FaCalendarAlt className="meta-icon" />
                <span>{formatDate(project.start_date)} — {formatDate(project.end_date)}</span>
              </div>
              {duration && (
                <div className="hero-meta-item">
                  <FaClock className="meta-icon" />
                  <span>{duration}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="details-body">
        <div className="container">
          <div className="body-grid">
            <div className="main-content">
              <div className="section-card">
                <h2 className="section-title">
                  <FaProjectDiagram className="section-icon" />
                  {t('projectDetails.overview')}
                </h2>
                <p className="description-text">{project.description}</p>
              </div>

              {project.technology && (
                <div className="section-card">
                <h2 className="section-title">
                  <FaMicrochip className="section-icon" />
                  {t('projectDetails.technologyStack')}
                </h2>
                  <div className="tech-tags">
                    {project.technology.split(',').map((tech, idx) => (
                      <span key={idx} className="tech-tag">
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.sdg && (
                <div className="section-card">
                <h2 className="section-title">
                  <FaFlag className="section-icon" />
                  {t('projectDetails.sustainableDevelopmentGoal')}
                </h2>
                  <div className="sdg-card">
                    <div className="sdg-number" style={{ background: SDG_COLORS[project.sdg.goal_number - 1] }}>
                      {project.sdg.goal_number}
                    </div>
                    <div className="sdg-content">
                      <h3>{project.sdg.title}</h3>
                      <p>{project.sdg.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {stakeholders.length > 0 && (
                <div className="section-card">
                  <h2 className="section-title">
                    <FaUsers className="section-icon" />
                    {t('projectDetails.stakeholdersCount', { count: stakeholders.length })}
                  </h2>
                  <div className="stakeholders-grid">
                    {stakeholders.map((s, idx) => (
                      <div key={idx} className="stakeholder-card">
                        <div className="stakeholder-header">
                          <div className="stakeholder-avatar">
                            {s.name?.charAt(0) || '?'}
                          </div>
                          <div className="stakeholder-info">
                            <h3>{s.name}</h3>
                            <span className="stakeholder-role">{s.role}</span>
                          </div>
                        </div>
                        <div className="stakeholder-details">
                          <span className="stakeholder-type">{s.type}</span>
                          {s.city && (
                            <span className="stakeholder-location">
                              <FaMapMarkerAlt /> {s.city}, {s.country}
                            </span>
                          )}
                        </div>
                        {s.website && (
                          <a
                            href={s.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="stakeholder-link"
                          >
                            <FaExternalLinkAlt /> {t('projectDetails.visitWebsite')}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sidebar">
              <div className="sidebar-card">
                <h3 className="sidebar-title">{t('projectDetails.quickInfo')}</h3>
                <div className="sidebar-items">
                  <div className="sidebar-item">
                    <FaTag className="sidebar-icon" />
                    <div>
                      <span className="sidebar-label">{t('projectDetails.status')}</span>
                      <span className="sidebar-value" style={{ color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="sidebar-item">
                    <FaLayerGroup className="sidebar-icon" />
                    <div>
                      <span className="sidebar-label">{t('projectDetails.sector')}</span>
                      <span className="sidebar-value">{sectorInfo.label}</span>
                    </div>
                  </div>
                  <div className="sidebar-item">
                    <FaGlobeAmericas className="sidebar-icon" />
                    <div>
                      <span className="sidebar-label">{t('projectDetails.region')}</span>
                      <span className="sidebar-value">{project.country_name || t('projectDetails.regional')}</span>
                    </div>
                  </div>
                  <div className="sidebar-item">
                    <FaCalendarAlt className="sidebar-icon" />
                    <div>
                      <span className="sidebar-label">{t('projectDetails.duration')}</span>
                      <span className="sidebar-value">{duration || t('projectDetails.n/a')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {(project.website || (project.documents?.length > 0)) && (
                <div className="sidebar-card">
                  <h3 className="sidebar-title">{t('projectDetails.resources')}</h3>
                  <div className="resources-list">
                    {project.website && (
                      <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        <FaExternalLinkAlt />
                        {t('projectDetails.visitProjectWebsite')}
                      </a>
                    )}
                    {project.documents?.map((doc, idx) => (
                      <a
                        key={idx}
                        href={`${API_BASE}${doc.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        <FaFileAlt />
                        {doc.original_name || doc.original_filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="sidebar-card">
                <h3 className="sidebar-title">{t('projectDetails.projectMetrics')}</h3>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-value">{stakeholders.length}</span>
                    <span className="metric-label">{t('projectDetails.stakeholders')}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-value">{project.documents?.length || 0}</span>
                    <span className="metric-label">{t('projectDetails.documents')}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-value">{project.views || 0}</span>
                    <span className="metric-label">{t('projectDetails.views')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .modern-project-details {
          --p-primary: #6366F1;
          --p-secondary: #1E293B;
          --p-text: #0F172A;
          --p-text-light: #64748B;
          --p-border: #F1F5F9;
          --p-shadow: rgba(0,0,0,0.04);
          font-family: 'Inter', -apple-system, sans-serif;
          color: var(--p-text);
          background: #F8FAFC;
          min-height: 100vh;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        /* Hero Section */
        .details-hero {
          position: relative;
          padding: 40px 0 60px;
          background: #FFFFFF;
          border-bottom: 1px solid var(--p-border);
          overflow: hidden;
        }

        .hero-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-gradient {
          position: absolute;
          top: -50%;
          right: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .hero-container {
          position: relative;
          z-index: 2;
        }

        .hero-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--p-text-light);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 8px 0;
          transition: color 0.2s;
          font-family: inherit;
        }
        .back-btn:hover { color: var(--p-primary); }

        .hero-actions {
          display: flex;
          gap: 8px;
        }

        .hero-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--p-border);
          border: none;
          border-radius: 8px;
          color: var(--p-text-light);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .hero-action-btn:hover {
          background: #E2E8F0;
          color: var(--p-text);
        }
        .hero-action-btn.active {
          background: #EEF2FF;
          color: var(--p-primary);
        }

        .hero-badges {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .details-hero h1 {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
          color: var(--p-secondary);
        }

        .hero-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .hero-meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--p-text-light);
          font-weight: 500;
          font-size: 0.9rem;
        }
        .meta-icon { color: var(--p-primary); font-size: 0.9rem; }

        /* Body */
        .details-body {
          padding: 40px 0 80px;
        }

        .body-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .section-card {
          background: #FFFFFF;
          border: 1px solid var(--p-border);
          border-radius: 16px;
          padding: 28px 32px;
          transition: box-shadow 0.2s;
        }
        .section-card:hover { box-shadow: 0 4px 12px var(--p-shadow); }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--p-secondary);
          margin-bottom: 16px;
        }
        .section-icon { color: var(--p-primary); font-size: 1.1rem; }

        .description-text {
          font-size: 1rem;
          line-height: 1.8;
          color: #475569;
          white-space: pre-line;
          margin: 0;
        }

        /* Tech Tags */
        .tech-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tech-tag {
          padding: 6px 14px;
          background: #F1F5F9;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--p-text-light);
        }

        /* SDG Card */
        .sdg-card {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: #F8FAFC;
          border-radius: 12px;
        }

        .sdg-number {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 900;
          color: #FFFFFF;
          flex-shrink: 0;
        }

        .sdg-content h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 4px;
          color: var(--p-secondary);
        }
        .sdg-content p {
          font-size: 0.9rem;
          color: var(--p-text-light);
          margin: 0;
          line-height: 1.5;
        }

        /* Stakeholders */
        .stakeholders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }

        .stakeholder-card {
          padding: 16px 20px;
          background: #F8FAFC;
          border-radius: 12px;
          border: 1px solid var(--p-border);
          transition: all 0.2s;
        }
        .stakeholder-card:hover {
          border-color: var(--p-primary);
          background: #FFFFFF;
          box-shadow: 0 4px 12px var(--p-shadow);
        }

        .stakeholder-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .stakeholder-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--p-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .stakeholder-info h3 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 2px;
          color: var(--p-secondary);
        }

        .stakeholder-role {
          font-size: 0.75rem;
          color: var(--p-primary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .stakeholder-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stakeholder-type {
          font-size: 0.85rem;
          color: var(--p-text-light);
          font-weight: 500;
        }

        .stakeholder-location {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--p-text-light);
        }
        .stakeholder-location svg { font-size: 0.7rem; }

        .stakeholder-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          color: var(--p-primary);
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          transition: color 0.2s;
        }
        .stakeholder-link:hover { color: #4F46E5; }

        /* Sidebar */
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-card {
          background: #FFFFFF;
          border: 1px solid var(--p-border);
          border-radius: 16px;
          padding: 24px;
        }

        .sidebar-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--p-text-light);
          margin: 0 0 16px;
        }

        .sidebar-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--p-text-light);
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .sidebar-item > div {
          display: flex;
          flex-direction: column;
        }

        .sidebar-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: var(--p-text-light);
        }

        .sidebar-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--p-secondary);
        }

        /* Resources */
        .resources-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .resource-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #F8FAFC;
          border-radius: 8px;
          color: var(--p-text);
          font-weight: 500;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .resource-link:hover {
          background: var(--p-primary);
          color: #FFFFFF;
        }
        .resource-link svg { font-size: 0.9rem; }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .metric-item {
          text-align: center;
          padding: 12px;
          background: #F8FAFC;
          border-radius: 8px;
        }

        .metric-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--p-secondary);
        }

        .metric-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: var(--p-text-light);
        }

        /* Loading & Error States */
        .loading-state, .error-state {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F8FAFC;
          gap: 16px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--p-border);
          border-top-color: var(--p-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .body-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .details-hero { padding: 24px 0 40px; }
          .hero-top { flex-direction: column; align-items: stretch; }
          .hero-actions { justify-content: flex-start; }
          .hero-meta-grid { grid-template-columns: 1fr; }
          .section-card { padding: 20px; }
          .stakeholders-grid { grid-template-columns: 1fr; }
          .metrics-grid { grid-template-columns: repeat(3, 1fr); }
          .sdg-card { flex-direction: column; align-items: center; text-align: center; }
          .details-body { padding: 24px 0 60px; }
        }

        @media (max-width: 480px) {
          .hero-badges { flex-direction: column; }
          .hero-meta-item { font-size: 0.8rem; }
        }
      `}</style>
    </div>
  )
}

function LoadingState({ t }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <p style={{ color: '#64748B', fontWeight: 500 }}>{t('projectDetails.loading')}</p>
      <style>{`
        .loading-state {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F8FAFC;
          gap: 16px;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #F1F5F9;
          border-top-color: #6366F1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function ErrorState({ error, navigate, t }) {
  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>
        {t('projectDetails.notFound')}
      </h2>
      <p style={{ color: '#64748B', marginBottom: 8 }}>
        {error || t('projectDetails.notFoundDescAlt')}
      </p>
      <button
        onClick={() => navigate('/projects')}
        className="error-btn"
      >
        {t('projectDetails.browseProjects')}
      </button>
      <style>{`
        .error-state {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F8FAFC;
          gap: 8px;
          padding: 24px;
          text-align: center;
        }
        .error-icon { font-size: 4rem; }
        .error-btn {
          margin-top: 8px;
          padding: 12px 28px;
          background: #6366F1;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }
        .error-btn:hover { background: #4F46E5; }
      `}</style>
    </div>
  )
}

const SDG_COLORS = [
  '#E5243B','#DDA63A','#4C9F38','#C5192D','#FF3A21','#26BDE2',
  '#FCC30B','#A21942','#FD6925','#DD1367','#FD9D24','#BF8B2E',
  '#3F7E44','#0A97D9','#56C02B','#00689D','#19486A'
]

export default ProjectDetails