import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FaClipboardList, FaCheckCircle, FaTimesCircle, FaEye, FaSignOutAlt, FaGlobeAmericas, FaLayerGroup, FaMicrochip, FaCalendarAlt, FaBuilding, FaUsers, FaUserShield, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaStar, FaIndustry, FaExclamationTriangle } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { API_BASE } from '../config'

function AdminDashboard() {
  const { t } = useTranslation()
  const [token, setToken] = useState(localStorage.getItem('access_token'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [pendingProjects, setPendingProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectProjectId, setRejectProjectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectType, setRejectType] = useState('project')
  const [activeTab, setActiveTab] = useState('projects')
  const [pendingOrgs, setPendingOrgs] = useState([])
  const [approvedOrgs, setApprovedOrgs] = useState([])
  const [rejectedOrgs, setRejectedOrgs] = useState([])
  const [orgsLoading, setOrgsLoading] = useState(false)
  const [orgStats, setOrgStats] = useState(null)
  const [orgFilter, setOrgFilter] = useState('pending')
  const [orgActionLoading, setOrgActionLoading] = useState(null)

  useEffect(() => {
    if (token) {
      fetchPendingProjects()
      fetchStats()
      fetchOrgStats()
      fetchPendingOrgs()
    }
  }, [token])

  useEffect(() => {
    if (token && activeTab === 'organizations') {
      fetchOrgStats()
      if (orgFilter === 'pending') fetchPendingOrgs()
      else if (orgFilter === 'approved') fetchApprovedOrgs()
      else fetchRejectedOrgs()
    }
  }, [token, activeTab, orgFilter])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t('admin.login.loginFailed'))
      if (data.user.role !== 'admin') throw new Error(t('admin.login.accessDenied'))
      
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.access_token)
    } catch (err) {
      setLoginError(err.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setToken(null)
  }

  const fetchPendingProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/admin/projects/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPendingProjects(data.filter(p => !['Cybersecurity','Telecommunications','Data Science','Business Intelligence'].includes(p.sector)))
      }
    } catch (err) {
      console.error('Error fetching pending projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleApprove = async (projectId) => {
    setActionLoading(projectId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/projects/${projectId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_id: 1 })
      })
      if (res.ok) {
        toast.success(t('admin.projects.approvedToast'))
        fetchPendingProjects()
        fetchStats()
      } else {
        const errData = await res.json()
        toast.error(t('admin.projects.approveFailed', { message: errData.detail || t('admin.unknownError') }))
      }
    } catch (err) {
      console.error(`Error approving project:`, err)
      toast.error(t('admin.projects.networkError', { message: err.message }))
    } finally {
      setActionLoading(null)
    }
  }

  const openRejectModal = (id, type = 'project') => {
    setRejectProjectId(id)
    setRejectType(type)
    setShowRejectModal(true)
    setRejectReason('')
  }

  const fetchOrgStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orgs/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setOrgStats(data)
      }
    } catch (err) {
      console.error('Error fetching org stats:', err)
    }
  }

  const fetchPendingOrgs = async () => {
    try {
      setOrgsLoading(true)
      const res = await fetch(`${API_BASE}/api/admin/orgs/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setPendingOrgs(await res.json())
    } catch (err) {
      console.error('Error fetching pending orgs:', err)
    } finally {
      setOrgsLoading(false)
    }
  }

  const fetchApprovedOrgs = async () => {
    try {
      setOrgsLoading(true)
      const res = await fetch(`${API_BASE}/api/admin/orgs/approved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setApprovedOrgs(await res.json())
    } catch (err) {
      console.error('Error fetching approved orgs:', err)
    } finally {
      setOrgsLoading(false)
    }
  }

  const fetchRejectedOrgs = async () => {
    try {
      setOrgsLoading(true)
      const res = await fetch(`${API_BASE}/api/admin/orgs/rejected`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setRejectedOrgs(await res.json())
    } catch (err) {
      console.error('Error fetching rejected orgs:', err)
    } finally {
      setOrgsLoading(false)
    }
  }

  const handleOrgApprove = async (orgId) => {
    setOrgActionLoading(orgId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/orgs/${orgId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_id: 1 })
      })
      if (res.ok) {
        toast.success(t('admin.organizations.approvedToast'))
        fetchPendingOrgs()
        fetchOrgStats()
      } else {
        const errData = await res.json()
        toast.error(t('admin.organizations.approveFailed', { message: errData.detail || t('admin.unknownError') }))
      }
    } catch (err) {
      console.error('Error approving org:', err)
      toast.error(t('admin.organizations.networkError', { message: err.message }))
    } finally {
      setOrgActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning(t('admin.rejectModal.reasonRequired'))
      return
    }
    setActionLoading(rejectProjectId)
    try {
      const endpoint = rejectType === 'project'
        ? `${API_BASE}/api/admin/projects/${rejectProjectId}/reject`
        : `${API_BASE}/api/admin/orgs/${rejectProjectId}/reject`
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason, admin_id: 1 })
      })
      if (res.ok) {
        toast.info(rejectType === 'project' ? t('admin.rejectModal.rejectedProject') : t('admin.rejectModal.rejectedOrg'))
        setShowRejectModal(false)
        if (rejectType === 'project') {
          fetchPendingProjects()
          fetchStats()
        } else {
          fetchPendingOrgs()
          fetchOrgStats()
        }
      } else {
        const errData = await res.json()
        toast.error(t('admin.rejectModal.rejectFailed', { message: errData.detail || t('admin.unknownError') }))
      }
    } catch (err) {
      console.error(`Error rejecting project:`, err)
      toast.error(t('admin.rejectModal.networkError', { message: err.message }))
    } finally {
      setActionLoading(null)
    }
  }

  if (!token) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-container">
          <div className="admin-login-header">
            <h1>{t('admin.login.title')}</h1>
            <p>{t('admin.login.subtitle')}</p>
          </div>
          <form onSubmit={handleLogin} className="admin-login-form">
            {loginError && <div className="login-error">{loginError}</div>}
            <div className="form-group">
              <label>{t('admin.login.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('admin.login.emailPlaceholder')} required />
            </div>
            <div className="form-group">
              <label>{t('admin.login.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('admin.login.passwordPlaceholder')} required />
            </div>
            <button type="submit" className="btn-login">{t('admin.login.submitBtn')}</button>
          </form>
        </div>
        <style>{styles}</style>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="container header-content">
          <div className="header-title">
            <h1>{t('admin.header.title')} <span className="text-primary">{t('admin.header.titleHighlight')}</span></h1>
            <p>{t('admin.header.welcome')}</p>
          </div>
          <button className="btn-logout-top" onClick={handleLogout}>
            <FaSignOutAlt /> {t('admin.header.signOut')}
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
              <FaClipboardList /> {t('admin.tabs.projects')}
            </button>
            <button className={`admin-tab ${activeTab === 'organizations' ? 'active' : ''}`} onClick={() => setActiveTab('organizations')}>
              <FaUsers /> {t('admin.tabs.organizations')}
            </button>
          </div>

          {activeTab === 'projects' && (
            <>
              <div className="stats-bar">
                <div className="stat-item">
                  <div className="stat-icon pending"><FaClipboardList /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats?.pending || 0}</span>
                    <span className="stat-lab">{t('admin.stats.pending')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon approved"><FaCheckCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats?.approved || 0}</span>
                    <span className="stat-lab">{t('admin.stats.approved')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon rejected"><FaTimesCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats?.rejected || 0}</span>
                    <span className="stat-lab">{t('admin.stats.rejected')}</span>
                  </div>
                </div>
              </div>

              <div className="content-section">
                <div className="section-header">
                  <h2>{t('admin.projects.sectionTitle')}</h2>
                  <span className="count-badge">{t('admin.projects.countLabel', { count: pendingProjects.length })}</span>
                </div>

                {loading ? (
                  <div className="dashboard-loader">
                    <div className="spinner"></div>
                    <p>{t('admin.projects.loading')}</p>
                  </div>
                ) : pendingProjects.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">🛡️</div>
                    <h3>{t('admin.projects.emptyTitle')}</h3>
                    <p>{t('admin.projects.emptyDesc')}</p>
                  </div>
                ) : (
                  <div className="pending-grid">
                    {pendingProjects.map((project) => (
                      <div key={project.id} className="moderation-card animate-up">
                        <div className="card-top">
                          <div className="card-info">
                            <div className="card-header-main">
                              <h3>{project.title}</h3>
                              <div className="status-label">{t('admin.projects.pendingReview')}</div>
                            </div>
                            <div className="card-meta">
                              <span className="meta-tag"><FaGlobeAmericas /> {project.country?.name || t('admin.projects.unknownCountry')}</span>
                              <span className="meta-tag"><FaLayerGroup /> {project.sector}</span>
                              <span className="meta-tag"><FaMicrochip /> {project.ai_technology}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="project-body">
                          <p className="project-preview">{project.description}</p>
                          
                          <div className="submission-details">
                            <div className="detail-item">
                              <FaBuilding className="detail-icon" />
                              <div className="detail-content">
                                <span className="detail-label">{t('admin.projects.submittedBy')}</span>
                                <span className="detail-value">{project.owner?.organization_name || project.owner?.email || t('admin.projects.unknownUser')}</span>
                              </div>
                            </div>
                            <div className="detail-item">
                              <FaCalendarAlt className="detail-icon" />
                              <div className="detail-content">
                                <span className="detail-label">{t('admin.projects.submissionDate')}</span>
                                <span className="detail-value">{new Date(project.submitted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                            </div>
                            {project.website && (
                              <div className="detail-item">
                                <FaEye className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">{t('admin.projects.website')}</span>
                                  <span className="detail-value">
                                    <a href={project.website} target="_blank" rel="noopener noreferrer" className="project-link">
                                      {t('admin.projects.visitProjectSite')}
                                    </a>
                                  </span>
                                </div>
                              </div>
                            )}
                            {project.documents && project.documents.length > 0 && (
                              <div className="detail-item">
                                <FaClipboardList className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">{t('admin.projects.attachments', { count: project.documents.length })}</span>
                                  <div className="admin-files-list">
                                    {project.documents.map((doc, idx) => (
                                      <a 
                                        key={idx} 
                                        href={`${API_BASE}${doc.file_url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="admin-file-link"
                                      >
                                        {doc.original_filename}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="card-footer">
                          <div className="card-actions">
                            <button 
                              className="btn-action-reject" 
                              onClick={() => openRejectModal(project.id, 'project')}
                              disabled={actionLoading === project.id}
                            >
                              {t('admin.projects.rejectBtn')}
                            </button>
                            <button 
                              className="btn-action-approve" 
                              onClick={() => handleApprove(project.id)}
                              disabled={actionLoading === project.id}
                            >
                              {actionLoading === project.id ? t('admin.projects.processing') : t('admin.projects.approveBtn')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'organizations' && (
            <>
              <div className="stats-bar">
                <div className="stat-item">
                  <div className="stat-icon pending"><FaUsers /></div>
                  <div className="stat-data">
                    <span className="stat-val">{orgStats?.pending_approval || 0}</span>
                    <span className="stat-lab">{t('admin.stats.pending')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon approved"><FaCheckCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{orgStats?.approved || 0}</span>
                    <span className="stat-lab">{t('admin.stats.approved')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon rejected"><FaTimesCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{orgStats?.rejected || 0}</span>
                    <span className="stat-lab">{t('admin.stats.rejected')}</span>
                  </div>
                </div>
              </div>

              <div className="content-section">
                <div className="section-header">
                  <div className="filter-tabs">
                    <button className={`filter-tab ${orgFilter === 'pending' ? 'active' : ''}`} onClick={() => setOrgFilter('pending')}>
                      {t('admin.organizations.filterPending')}
                    </button>
                    <button className={`filter-tab ${orgFilter === 'approved' ? 'active' : ''}`} onClick={() => setOrgFilter('approved')}>
                      {t('admin.organizations.filterApproved')}
                    </button>
                    <button className={`filter-tab ${orgFilter === 'rejected' ? 'active' : ''}`} onClick={() => setOrgFilter('rejected')}>
                      {t('admin.organizations.filterRejected')}
                    </button>
                  </div>
                  <span className="count-badge">
                    {t('admin.organizations.countLabel', { count: orgFilter === 'pending' ? pendingOrgs.length : orgFilter === 'approved' ? approvedOrgs.length : rejectedOrgs.length })}
                  </span>
                </div>

                {orgsLoading ? (
                  <div className="dashboard-loader">
                    <div className="spinner"></div>
                    <p>{t('admin.organizations.loading')}</p>
                  </div>
                ) : orgFilter === 'pending' && pendingOrgs.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">🛡️</div>
                    <h3>{t('admin.organizations.emptyPendingTitle')}</h3>
                    <p>{t('admin.organizations.emptyPendingDesc')}</p>
                  </div>
                ) : orgFilter === 'approved' && approvedOrgs.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">📋</div>
                    <h3>{t('admin.organizations.emptyApprovedTitle')}</h3>
                    <p>{t('admin.organizations.emptyApprovedDesc')}</p>
                  </div>
                ) : orgFilter === 'rejected' && rejectedOrgs.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">📋</div>
                    <h3>{t('admin.organizations.emptyRejectedTitle')}</h3>
                    <p>{t('admin.organizations.emptyRejectedDesc')}</p>
                  </div>
                ) : (
                  <div className="pending-grid">
                    {(orgFilter === 'pending' ? pendingOrgs : orgFilter === 'approved' ? approvedOrgs : rejectedOrgs).map((org) => (
                      <div key={org.id} className="moderation-card animate-up">
                        <div className="card-top">
                          <div className="card-info">
                            <div className="card-header-main">
                              <div className="org-header-title">
                                {org.logo ? <img src={org.logo} alt="" className="org-avatar-sm" /> : <div className="org-avatar-sm org-avatar-placeholder-sm"><FaBuilding /></div>}
                                <h3>{org.organization_name}</h3>
                              </div>
                              <div className={`status-label ${orgFilter === 'approved' ? 'status-approved' : orgFilter === 'rejected' ? 'status-rejected' : ''}`}>
                                {orgFilter === 'pending' ? t('admin.organizations.pendingReview') : orgFilter === 'approved' ? t('admin.organizations.approved') : t('admin.organizations.rejected')}
                              </div>
                            </div>
                            <div className="card-meta">
                              <span className="meta-tag"><FaUserShield /> {org.organization_type}</span>
                              {org.country && <span className="meta-tag"><FaGlobeAmericas /> {org.country}</span>}
                              {org.sector && <span className="meta-tag"><FaIndustry /> {org.sector}</span>}
                              {org.city && <span className="meta-tag"><FaMapMarkerAlt /> {org.city}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="project-body">
                          {org.description && <p className="project-preview">{org.description}</p>}

                          <div className="submission-details">
                            <div className="detail-item">
                              <FaEnvelope className="detail-icon" />
                              <div className="detail-content">
                                <span className="detail-label">{t('admin.organizations.email')}</span>
                                <span className="detail-value">{org.email}</span>
                              </div>
                            </div>
                            {org.phone && (
                              <div className="detail-item">
                                <FaPhone className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">{t('admin.organizations.phone')}</span>
                                  <span className="detail-value">{org.phone}</span>
                                </div>
                              </div>
                            )}
                            {org.website && (
                              <div className="detail-item">
                                <FaGlobe className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">{t('admin.organizations.website')}</span>
                                  <span className="detail-value">
                                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="project-link">{org.website}</a>
                                  </span>
                                </div>
                              </div>
                            )}
                            {org.created_at && (
                              <div className="detail-item">
                                <FaCalendarAlt className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">{t('admin.organizations.registered')}</span>
                                  <span className="detail-value">{new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                              </div>
                            )}
                            {org.rejection_reason && (
                              <div className="detail-item">
                                <FaExclamationTriangle className="detail-icon" style={{ color: '#ef4444' }} />
                                <div className="detail-content">
                                  <span className="detail-label">{t('admin.organizations.rejectionReason')}</span>
                                  <span className="detail-value" style={{ color: '#ef4444' }}>{org.rejection_reason}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {orgFilter === 'pending' && (
                          <div className="card-footer">
                            <div className="card-actions">
                              <button 
                                className="btn-action-reject" 
                                onClick={() => openRejectModal(org.id, 'org')}
                                disabled={orgActionLoading === org.id}
                              >
                                {t('admin.organizations.rejectBtn')}
                              </button>
                              <button 
                                className="btn-action-approve" 
                                onClick={() => handleOrgApprove(org.id)}
                                disabled={orgActionLoading === org.id}
                              >
                                {orgActionLoading === org.id ? t('admin.organizations.processing') : t('admin.organizations.approveBtn')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {showRejectModal && (
        <div className="modal-backdrop">
          <div className="modal-content animate-up">
            <div className="modal-header">
              <h3>{rejectType === 'project' ? t('admin.rejectModal.titleProject') : t('admin.rejectModal.titleOrg')}</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}><FaTimesCircle /></button>
            </div>
            <div className="modal-body">
              <p>{rejectType === 'project' ? t('admin.rejectModal.bodyProject') : t('admin.rejectModal.bodyOrg')}</p>
              <textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={rejectType === 'project' 
                  ? t('admin.rejectModal.placeholderProject')
                  : t('admin.rejectModal.placeholderOrg')}
                rows="5"
              ></textarea>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>{t('admin.rejectModal.cancel')}</button>
              <button 
                className="btn-danger" 
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
              >
                {t('admin.rejectModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const styles = `
  .admin-dashboard { background: #f1f5f9; min-height: 100vh; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
  
  .dashboard-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 20px 0; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .header-content { display: flex; justify-content: space-between; align-items: center; }
  .header-title h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: #0f172a; }
  .header-title p { color: #64748b; margin: 2px 0 0 0; font-size: 0.875rem; }
  .text-primary { color: #3b82f6; }
  .btn-logout-top { background: #fee2e2; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; color: #ef4444; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 0.875rem; }
  .btn-logout-top:hover { background: #fecaca; }

  .dashboard-main { padding: 32px 0 64px; }
  .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
  .stat-item { background: #fff; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
  .stat-icon.pending { background: #fff7ed; color: #f59e0b; }
  .stat-icon.approved { background: #f0fdf4; color: #10b981; }
  .stat-icon.rejected { background: #fef2f2; color: #ef4444; }
  .stat-val { display: block; font-size: 1.5rem; font-weight: 700; line-height: 1; color: #0f172a; }
  .stat-lab { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.025em; }

  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .section-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; color: #0f172a; }
  .count-badge { background: #3b82f6; color: #fff; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }

  .pending-grid { display: flex; flex-direction: column; gap: 20px; }
  .moderation-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; }
  .moderation-card:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  
  .card-top { margin-bottom: 16px; }
  .card-header-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .card-header-main h3 { font-size: 1.25rem; font-weight: 700; margin: 0; color: #0f172a; }
  
  .card-meta { display: flex; gap: 12px; flex-wrap: wrap; }
  .meta-tag { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #475569; font-weight: 600; background: #f8fafc; padding: 4px 10px; border-radius: 6px; border: 1px solid #f1f5f9; }
  .meta-tag svg { color: #3b82f6; }
  
  .status-label { background: #fff7ed; color: #c2410c; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #ffedd5; }
  
  .project-body { margin-bottom: 24px; }
  .project-preview { color: #475569; line-height: 1.6; margin-bottom: 20px; font-size: 0.9375rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  
  .submission-details { background: #f8fafc; border-radius: 12px; padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; border: 1px solid #f1f5f9; }
  .detail-item { display: flex; align-items: flex-start; gap: 12px; }
  .detail-icon { color: #64748b; font-size: 1rem; margin-top: 2px; }
  .detail-content { display: flex; flex-direction: column; }
  .detail-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; }
  .detail-value { font-size: 0.875rem; color: #1e293b; font-weight: 600; }
  .project-link { color: #3b82f6; text-decoration: none; border-bottom: 1px solid transparent; transition: 0.2s; }
  .project-link:hover { border-bottom-color: #3b82f6; }
  
  .admin-files-list { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
  .admin-file-link { font-size: 0.8125rem; color: #3b82f6; text-decoration: none; font-weight: 500; }
  .admin-file-link:hover { text-decoration: underline; }

  .card-footer { display: flex; justify-content: flex-end; padding-top: 20px; border-top: 1px solid #f1f5f9; }
  .card-actions { display: flex; gap: 12px; }
  .btn-action-reject { background: #fff; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.875rem; }
  .btn-action-reject:hover { background: #f1f5f9; color: #ef4444; border-color: #fca5a5; }
  .btn-action-approve { background: #0f172a; border: none; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.875rem; }
  .btn-action-approve:hover { background: #334155; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

  .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal-content { background: #fff; width: 100%; max-width: 500px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; }
  .modal-header { padding: 24px 24px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
  .modal-header h3 { font-size: 1.25rem; font-weight: 700; margin: 0; color: #0f172a; }
  .close-btn { background: none; border: none; font-size: 1.25rem; color: #cbd5e1; cursor: pointer; transition: 0.2s; }
  .close-btn:hover { color: #64748b; }
  .modal-body { padding: 24px; }
  .modal-body p { color: #64748b; font-size: 0.9375rem; line-height: 1.5; margin-bottom: 16px; }
  .modal-body textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-family: inherit; font-size: 0.9375rem; outline: none; transition: 0.2s; resize: none; }
  .modal-body textarea:focus { border-color: #3b82f6; }
  .modal-footer { padding: 16px 24px 24px; display: flex; gap: 12px; justify-content: flex-end; }
  .btn-secondary { background: #fff; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
  .btn-danger { background: #ef4444; border: none; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
  .btn-danger:hover { background: #dc2626; }

  .admin-login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 20px; }
  .admin-login-container { background: #fff; padding: 40px; border-radius: 20px; width: 100%; max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
  .admin-login-header { text-align: center; margin-bottom: 32px; }
  .admin-login-header h1 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
  .admin-login-header p { color: #64748b; font-size: 0.875rem; }
  .admin-login-form .form-group { margin-bottom: 20px; }
  .admin-login-form label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: #475569; }
  .admin-login-form input { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9375rem; outline: none; transition: 0.2s; box-sizing: border-box; }
  .admin-login-form input:focus { border-color: #3b82f6; }
  .btn-login { width: 100%; background: #0f172a; color: #fff; border: none; padding: 12px; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .btn-login:hover { background: #334155; }
  .login-error { background: #fef2f2; color: #ef4444; padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 0.8125rem; font-weight: 600; text-align: center; border: 1px solid #fee2e2; }

  .admin-tabs { display: flex; gap: 0; margin-bottom: 24px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .admin-tab { flex: 1; padding: 14px 24px; border: none; background: #fff; font-size: 0.875rem; font-weight: 600; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; font-family: inherit; border-bottom: 2px solid transparent; }
  .admin-tab:hover { background: #f8fafc; color: #1e293b; }
  .admin-tab.active { background: #f8fafc; color: #3b82f6; border-bottom-color: #3b82f6; }

  .filter-tabs { display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: 8px; }
  .filter-tab { padding: 6px 14px; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 6px; transition: 0.2s; font-family: inherit; }
  .filter-tab:hover { color: #1e293b; }
  .filter-tab.active { background: #fff; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

  .org-header-title { display: flex; align-items: center; gap: 12px; }
  .org-avatar-sm { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .org-avatar-placeholder-sm { background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1rem; }

  .status-label.status-approved { background: #f0fdf4; color: #10b981; border-color: #bbf7d0; }
  .status-label.status-rejected { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

  .spinner { width: 32px; height: 32px; border: 3px solid #f1f5f9; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dashboard-loader { text-align: center; padding: 48px 0; color: #64748b; font-size: 0.875rem; }
  .empty-dashboard { text-align: center; padding: 64px 0; background: #fff; border-radius: 16px; border: 1px dashed #e2e8f0; }
  .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-up { animation: fadeUp 0.3s ease-out both; }

  @media (max-width: 640px) {
    .stats-bar { grid-template-columns: 1fr; }
    .card-actions { width: 100%; }
    .card-actions button { flex: 1; }
    .submission-details { grid-template-columns: 1fr; }
  }
`

export default AdminDashboard