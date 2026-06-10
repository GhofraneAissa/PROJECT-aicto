import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaProjectDiagram, FaArrowRight, FaSpinner, FaExclamationCircle, FaHeart, FaLightbulb, FaGlobeAmericas, FaCity, FaRocket, FaMicrochip, FaShieldAlt, FaLeaf, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaFileAlt, FaDatabase, FaFileContract, FaFileCode, FaChartLine, FaDownload, FaBook, FaNewspaper, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { API_BASE } from '../config'

const statusConfig = {
  pending: { i18nKey: 'projects.status_pending', icon: <FaHourglassHalf />, color: '#f59e0b', bg: '#fffbeb' },
  approved: { i18nKey: 'projects.status_approved', icon: <FaCheckCircle />, color: '#059669', bg: '#ecfdf5' },
  rejected: { i18nKey: 'projects.status_rejected', icon: <FaTimesCircle />, color: '#dc2626', bg: '#fef2f2' },
  active: { i18nKey: 'projects.status_active', icon: <FaCheckCircle />, color: '#059669', bg: '#ecfdf5' },
  Active: { i18nKey: 'projects.status_active', icon: <FaCheckCircle />, color: '#059669', bg: '#ecfdf5' },
  Completed: { i18nKey: 'projects.status_completed', icon: <FaCheckCircle />, color: '#2563eb', bg: '#eff6ff' },
  'In Progress': { i18nKey: 'projects.status_inProgress', icon: <FaClock />, color: '#7c3aed', bg: '#f5f3ff' },
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

const getResourceIcon = (type) => {
  switch (type) {
    case 'Policy Document': return <FaFileContract />
    case 'White Paper': return <FaFileCode />
    case 'Dataset': return <FaDatabase />
    case 'Report': return <FaChartLine />
    default: return <FaFileAlt />
  }
}

const getResourceIconBox = (type) => {
  const map = {
    'Policy Document': 'res-pd',
    'White Paper': 'res-wp',
    'Dataset': 'res-ds',
    'Report': 'res-rp',
  }
  return map[type] || 'res-default'
}

function MyProjects() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('resources')
  const [projects, setProjects] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [editingResource, setEditingResource] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', type: '', category: '', language: '', description: '' })
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projectEditForm, setProjectEditForm] = useState({ title: '', sector: '', technology: '', description: '' })
  const [submittingProjectEdit, setSubmittingProjectEdit] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setUser(u)
        Promise.all([
          fetch(`${API_BASE}/api/users/${u.id}/projects`).then(r => r.json()),
          fetch(`${API_BASE}/api/resources/?user_id=${u.id}`).then(r => r.json()),
        ])
          .then(([projectsData, resourcesData]) => {
            setProjects(projectsData.projects || [])
            setResources(resourcesData || [])
            setLoading(false)
          })
          .catch(() => {
            setError(t('myProjects.loadError'))
            setLoading(false)
          })
      } catch {
        setError(t('myProjects.userNotFound'))
        setLoading(false)
      }
    } else {
      setError(t('myProjects.loginRequired'))
      setLoading(false)
    }
  }, [])

  const handleDownload = async (resource) => {
    if (!resource.file_url) return
    try {
      const filename = resource.file_url.split('/').pop()
      const res = await fetch(`${API_BASE}/api/resources/download/${filename}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      console.error('Download failed')
    }
  }

  const handleDeleteResource = async (id) => {
    if (!window.confirm(t('myProjects.confirmDelete'))) return
    setDeletingId(`res-${id}`)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/resources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      setResources(prev => prev.filter(r => r.id !== id))
      toast.success(t('myProjects.deleted'))
    } catch {
      toast.error(t('myProjects.deleteFailed'))
    }
    setDeletingId(null)
  }

  const handleDeleteProject = async (id) => {
    if (!window.confirm(t('myProjects.confirmDelete'))) return
    setDeletingId(`proj-${id}`)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      setProjects(prev => prev.filter(p => p.id !== id))
      toast.success(t('myProjects.deleted'))
    } catch {
      toast.error(t('myProjects.deleteFailed'))
    }
    setDeletingId(null)
  }

  const handleEditResource = (r) => {
    setEditForm({ title: r.title, type: r.type, category: r.category, language: r.language || '', description: r.description || '' })
    setEditingResource(r)
  }

  const handleUpdateResource = async (e) => {
    e.preventDefault()
    if (!editingResource) return
    setSubmittingEdit(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/resources/${editingResource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await res.json()
      setResources(prev => prev.map(r => r.id === updated.id ? updated : r))
      toast.success(t('myProjects.updated'))
      setEditingResource(null)
    } catch {
      toast.error(t('myProjects.updateFailed'))
    }
    setSubmittingEdit(false)
  }

  const handleEditProject = (p) => {
    setProjectEditForm({ title: p.title, sector: p.sector || '', technology: p.technology || '', description: p.description || '' })
    setEditingProject(p)
  }

  const handleUpdateProject = async (e) => {
    e.preventDefault()
    if (!editingProject) return
    setSubmittingProjectEdit(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(projectEditForm)
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await res.json()
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
      toast.success(t('myProjects.updated'))
      setEditingProject(null)
    } catch {
      toast.error(t('myProjects.updateFailed'))
    }
    setSubmittingProjectEdit(false)
  }

  if (loading) {
    return (
      <div className="my-projects-page">
        <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
          <FaSpinner className="spin" size={32} style={{ color: '#2563eb' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>{t('myProjects.loading')}</p>
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
          <Link to="/" className="btn btn-primary">{t('myProjects.goHome')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="my-projects-page">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="header-icon">
                <FaBook />
              </div>
              <div>
                <h1>{t('nav.myPublications')}</h1>
                <p className="header-sub">
                  {resources.length + projects.length} publication{(resources.length + projects.length) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="header-actions">
              <Link to="/resources" className="btn-outline">
                <FaPlus /> {t('resources.addResource')}
              </Link>
              <Link to="/projects" className="btn-outline">
                <FaPlus /> New Project
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>
              <FaBook /> {t('resources.pageTitle')}
            </button>
            <button className={`admin-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
              <FaProjectDiagram /> {t('myProjects.title')}
            </button>
          </div>

          {activeTab === 'resources' && (
            <>
              <div className="section-header">
                <span className="count-badge">{resources.length} resource{resources.length !== 1 ? 's' : ''}</span>
              </div>
              {resources.length === 0 ? (
                <div className="mp-empty">
                  <FaBook size={48} style={{ color: '#d1d5db' }} />
                  <h3>{t('myProjects.noProjects')}</h3>
                  <p>{t('myProjects.noProjectsDesc')}</p>
                  <Link to="/resources" className="btn btn-primary">
                    {t('resources.submitResource')}
                  </Link>
                </div>
              ) : (
                <div className="pub-grid">
                  {resources.map(r => (
                    <div key={`res-${r.id}`} className="pub-card">
                      <div className="pub-card-top">
                        <div className={`res-type-icon-box ${getResourceIconBox(r.type)}`}>
                          {getResourceIcon(r.type)}
                        </div>
                        <span className="pub-tag">{r.type}</span>
                      </div>
                      <h3 className="pub-card-title">{r.title}</h3>
                      <div className="pub-card-meta">
                        {r.category && <span className="pub-tag">{r.category}</span>}
                        {r.language && <span>{r.language}</span>}
                        {r.file_size && <span>{r.file_size}</span>}
                      </div>
                      {r.description && <p className="pub-card-desc">{r.description}</p>}
                      <div className="pub-card-footer">
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FaDownload /> {r.downloads || 0}
                        </span>
                        <div className="pub-card-actions">
                          <button className="pub-action-btn edit" onClick={() => handleEditResource(r)} title={t('myProjects.edit')}>
                            <FaEdit /> {t('myProjects.edit')}
                          </button>
                          {r.file_url && (
                            <button className="pub-dl-btn" onClick={() => handleDownload(r)}>
                              <FaDownload />
                            </button>
                          )}
                          <button className="pub-action-btn delete" onClick={() => handleDeleteResource(r.id)} disabled={deletingId === `res-${r.id}`} title={t('myProjects.delete')}>
                            {deletingId === `res-${r.id}` ? <FaSpinner className="spin" /> : <FaTrash />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'projects' && (
            <>
              <div className="section-header">
                <span className="count-badge">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              </div>
              {projects.length === 0 ? (
                <div className="mp-empty">
                  <FaProjectDiagram size={48} style={{ color: '#d1d5db' }} />
                  <h3>{t('myProjects.noProjects')}</h3>
                  <p>{t('myProjects.noProjectsDesc')}</p>
                  <Link to="/projects" className="btn btn-primary">
                    {t('myProjects.submitFirst')}
                  </Link>
                </div>
              ) : (
                <div className="pub-grid">
                  {projects.map(p => {
                    const st = statusConfig[p.status] || { i18nKey: null, label: p.status, icon: <FaClock />, color: '#6b7280', bg: '#f9fafb' }
                    const si = getSectorInfo(p.sector)
                    return (
                      <Link to={`/projects/${p.id}`} key={`proj-${p.id}`} className="pub-card">
                        <div className="pub-card-top">
                          <div className="pub-status" style={{ background: st.bg, color: st.color }}>
                            {st.icon} {st.i18nKey ? t(st.i18nKey) : st.label}
                          </div>
                          <div className="pub-sector-icon" style={{ color: si.color }}>
                            {si.icon}
                          </div>
                        </div>
                        <h3 className="pub-card-title">{p.title}</h3>
                        <div className="pub-card-meta">
                          {p.country && <span>{p.country}</span>}
                          {p.sector && <span className="pub-tag">{p.sector}</span>}
                          {p.technology && <span className="pub-tag pub-tech">{p.technology}</span>}
                        </div>
                        {p.description && <p className="pub-card-desc">{p.description}</p>}
                        {p.status === 'rejected' && p.rejection_reason && (
                          <div className="pub-rejection">
                            <strong>{t('myProjects.reason')}:</strong> {p.rejection_reason}
                          </div>
                        )}
                        <div className="pub-card-footer">
                          <span className="pub-view-details">
                            {t('myProjects.viewDetails')} <FaArrowRight />
                          </span>
                          <div className="pub-card-actions">
                            <button className="pub-action-btn edit" onClick={(e) => { e.preventDefault(); handleEditProject(p) }} title={t('myProjects.edit')}>
                              <FaEdit />
                            </button>
                            <button className="pub-action-btn delete" onClick={(e) => { e.preventDefault(); handleDeleteProject(p.id) }} disabled={deletingId === `proj-${p.id}`} title={t('myProjects.delete')}>
                              {deletingId === `proj-${p.id}` ? <FaSpinner className="spin" /> : <FaTrash />}
                            </button>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {editingResource && (
        <div className="modal-overlay" onClick={() => setEditingResource(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 520, padding: '32px', borderRadius: 16 }}>
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h3>{t('myProjects.editResource')}</h3>
              <button className="close-btn" onClick={() => setEditingResource(null)}><FaTimes /></button>
            </div>
            <form onSubmit={handleUpdateResource} className="modal-form">
              <div className="form-grid-mini">
                <div className="field">
                  <label>{t('resources.titleField')} *</label>
                  <input name="title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
                </div>
                <div className="field">
                  <label>{t('resources.language')}</label>
                  <input name="language" value={editForm.language} onChange={e => setEditForm({ ...editForm, language: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t('resources.type')} *</label>
                  <select name="type" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    <option value="Policy Document">{t('resources.types.policyDocument')}</option>
                    <option value="White Paper">{t('resources.types.whitePaper')}</option>
                    <option value="Dataset">{t('resources.types.dataset')}</option>
                    <option value="Report">{t('resources.types.report')}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t('resources.category')} *</label>
                  <select name="category" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="Strategy">{t('resources.categories.strategy')}</option>
                    <option value="Governance">{t('resources.categories.governance')}</option>
                    <option value="Technical">{t('resources.categories.technical')}</option>
                    <option value="Research">{t('resources.categories.research')}</option>
                    <option value="Education">{t('resources.categories.education')}</option>
                  </select>
                </div>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('resources.description')}</label>
                <textarea name="description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn-cancel" onClick={() => setEditingResource(null)}>{t('myProjects.cancel')}</button>
                <button type="submit" className="btn-primary" disabled={submittingEdit}>
                  {submittingEdit ? <><FaSpinner className="spin" /> {t('myProjects.saving')}</> : t('myProjects.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 520, padding: '32px', borderRadius: 16 }}>
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h3>{t('myProjects.editProject')}</h3>
              <button className="close-btn" onClick={() => setEditingProject(null)}><FaTimes /></button>
            </div>
            <form onSubmit={handleUpdateProject} className="modal-form">
              <div className="form-grid-mini">
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('resources.titleField')} *</label>
                  <input name="title" value={projectEditForm.title} onChange={e => setProjectEditForm({ ...projectEditForm, title: e.target.value })} required />
                </div>
                <div className="field">
                  <label>{t('myProjects.sector')}</label>
                  <input name="sector" value={projectEditForm.sector} onChange={e => setProjectEditForm({ ...projectEditForm, sector: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t('myProjects.technology')}</label>
                  <input name="technology" value={projectEditForm.technology} onChange={e => setProjectEditForm({ ...projectEditForm, technology: e.target.value })} />
                </div>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{t('resources.description')}</label>
                <textarea name="description" value={projectEditForm.description} onChange={e => setProjectEditForm({ ...projectEditForm, description: e.target.value })} rows={3} />
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn-cancel" onClick={() => setEditingProject(null)}>{t('myProjects.cancel')}</button>
                <button type="submit" className="btn-primary" disabled={submittingProjectEdit}>
                  {submittingProjectEdit ? <><FaSpinner className="spin" /> {t('myProjects.saving')}</> : t('myProjects.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .my-projects-page {
          min-height: calc(100vh - 60px);
          background: #f8fafc;
        }
        .spin {
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .dashboard-header {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          padding: 32px 0;
        }
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 1.3rem;
        }
        .header-left h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .header-sub {
          color: #64748b;
          margin: 2px 0 0;
          font-size: 0.85rem;
        }
        .header-actions {
          display: flex;
          gap: 10px;
        }
        .btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          color: #0f172a;
          border: 1.5px solid #e2e8f0;
          transition: 0.2s;
          background: #fff;
        }
        .btn-outline:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #f8fafc;
        }
        .dashboard-main {
          padding: 32px 0 80px;
        }
        .admin-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 24px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .admin-tab {
          flex: 1;
          padding: 14px 24px;
          border: none;
          background: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.2s;
          font-family: inherit;
          border-bottom: 2px solid transparent;
        }
        .admin-tab:hover { background: #f8fafc; color: #1e293b; }
        .admin-tab.active { background: #f8fafc; color: #3b82f6; border-bottom-color: #3b82f6; }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .count-badge {
          background: #e2e8f0;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
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
        .pub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
        .pub-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
        }
        .pub-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          border-color: transparent;
        }
        .pub-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .pub-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .pub-sector-icon {
          font-size: 1.3rem;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border-radius: 10px;
        }
        .res-type-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }
        .res-type-icon-box.res-pd { background: #eff6ff; color: #3b82f6; }
        .res-type-icon-box.res-wp { background: #f5f3ff; color: #8b5cf6; }
        .res-type-icon-box.res-ds { background: #ecfdf5; color: #10b981; }
        .res-type-icon-box.res-rp { background: #fff7ed; color: #f97316; }
        .res-type-icon-box.res-default { background: #f8fafc; color: #475569; }
        .pub-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
          line-height: 1.4;
        }
        .pub-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #64748b;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .pub-tag {
          background: #f1f5f9;
          padding: 2px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #475569;
        }
        .pub-tech {
          background: #eff6ff;
          color: #2563eb;
        }
        .pub-card-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.5;
          flex: 1;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pub-rejection {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.8rem;
          color: #dc2626;
          margin-bottom: 12px;
        }
        .pub-card-footer {
          border-top: 1px solid #f1f5f9;
          padding-top: 14px;
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pub-view-details {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2563eb;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .pub-card:hover .pub-view-details svg {
          transform: translateX(4px);
        }
        .pub-view-details svg {
          transition: transform 0.2s;
        }
        .pub-dl-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #f8fafc;
          color: #2563eb;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s;
        }
        .pub-dl-btn:hover {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .pub-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pub-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s;
        }
        .pub-action-btn.edit {
          background: #eff6ff;
          color: #2563eb;
        }
        .pub-action-btn.edit:hover {
          background: #dbeafe;
        }
        .pub-action-btn.delete {
          background: #fef2f2;
          color: #dc2626;
        }
        .pub-action-btn.delete:hover {
          background: #fee2e2;
        }
        .pub-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          color: #9ca3af;
          padding: 4px;
        }
        .modal-form .form-grid-mini {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .modal-form .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .modal-form .field label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
        }
        .modal-form .field input,
        .modal-form .field select,
        .modal-form .field textarea {
          padding: 10px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          font-family: inherit;
          outline: none;
          transition: 0.2s;
        }
        .modal-form .field input:focus,
        .modal-form .field select:focus,
        .modal-form .field textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .btn-cancel {
          padding: 10px 20px;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #374151;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-cancel:hover {
          background: #f8fafc;
        }
        .btn-primary {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: #2563eb;
          color: #fff;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s;
        }
        .btn-primary:hover {
          background: #1d4ed8;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; }
          .btn-outline { flex: 1; justify-content: center; }
          .pub-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

export default MyProjects
