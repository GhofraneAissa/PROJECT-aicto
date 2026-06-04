import { useState, useEffect } from 'react'
import { FaClipboardList, FaCheckCircle, FaTimesCircle, FaEye, FaSignOutAlt, FaGlobeAmericas, FaLayerGroup, FaMicrochip, FaCalendarAlt, FaBuilding, FaUsers, FaUserShield, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaStar, FaIndustry, FaExclamationTriangle } from 'react-icons/fa'
import { toast } from 'react-toastify'

const API_BASE = 'http://localhost:8000'

function AdminDashboard() {
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
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      if (data.user.role !== 'admin') throw new Error('Access denied: Admin only')
      
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
        setPendingProjects(data)
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
        toast.success('Project approved and published successfully!')
        fetchPendingProjects()
        fetchStats()
      } else {
        const errData = await res.json()
        toast.error('Failed to approve: ' + (errData.detail || 'Unknown error'))
      }
    } catch (err) {
      console.error(`Error approving project:`, err)
      toast.error('Network error: ' + err.message)
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
        toast.success('Organization approved successfully!')
        fetchPendingOrgs()
        fetchOrgStats()
      } else {
        const errData = await res.json()
        toast.error('Failed to approve: ' + (errData.detail || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error approving org:', err)
      toast.error('Network error: ' + err.message)
    } finally {
      setOrgActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Please provide a reason for rejection.')
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
        toast.info(rejectType === 'project' ? 'Project has been rejected.' : 'Organization has been rejected.')
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
        toast.error('Failed to reject: ' + (errData.detail || 'Unknown error'))
      }
    } catch (err) {
      console.error(`Error rejecting project:`, err)
      toast.error('Network error: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  if (!token) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-container">
          <div className="admin-login-header">
            <h1>Admin Dashboard</h1>
            <p>Moderation portal for AI Initiatives</p>
          </div>
          <form onSubmit={handleLogin} className="admin-login-form">
            {loginError && <div className="login-error">{loginError}</div>}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@aicto.org" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-login">Access Dashboard</button>
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
            <h1>Admin <span className="text-primary">Dashboard</span></h1>
            <p>Welcome back, Administrator</p>
          </div>
          <button className="btn-logout-top" onClick={handleLogout}>
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
              <FaClipboardList /> Projects
            </button>
            <button className={`admin-tab ${activeTab === 'organizations' ? 'active' : ''}`} onClick={() => setActiveTab('organizations')}>
              <FaUsers /> Organizations
            </button>
          </div>

          {activeTab === 'projects' && (
            <>
              <div className="stats-bar">
                <div className="stat-item">
                  <div className="stat-icon pending"><FaClipboardList /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats?.pending || 0}</span>
                    <span className="stat-lab">Pending</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon approved"><FaCheckCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats?.approved || 0}</span>
                    <span className="stat-lab">Approved</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon rejected"><FaTimesCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats?.rejected || 0}</span>
                    <span className="stat-lab">Rejected</span>
                  </div>
                </div>
              </div>

              <div className="content-section">
                <div className="section-header">
                  <h2>Awaiting Moderation</h2>
                  <span className="count-badge">{pendingProjects.length} Projects</span>
                </div>

                {loading ? (
                  <div className="dashboard-loader">
                    <div className="spinner"></div>
                    <p>Loading pending queue...</p>
                  </div>
                ) : pendingProjects.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">🛡️</div>
                    <h3>Queue is Empty</h3>
                    <p>All submitted projects have been reviewed.</p>
                  </div>
                ) : (
                  <div className="pending-grid">
                    {pendingProjects.map((project) => (
                      <div key={project.id} className="moderation-card animate-up">
                        <div className="card-top">
                          <div className="card-info">
                            <div className="card-header-main">
                              <h3>{project.title}</h3>
                              <div className="status-label">Pending Review</div>
                            </div>
                            <div className="card-meta">
                              <span className="meta-tag"><FaGlobeAmericas /> {project.country?.name || 'Unknown Country'}</span>
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
                                <span className="detail-label">Submitted By</span>
                                <span className="detail-value">{project.owner?.organization_name || project.owner?.email || 'Unknown User'}</span>
                              </div>
                            </div>
                            <div className="detail-item">
                              <FaCalendarAlt className="detail-icon" />
                              <div className="detail-content">
                                <span className="detail-label">Submission Date</span>
                                <span className="detail-value">{new Date(project.submitted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                            </div>
                            {project.website && (
                              <div className="detail-item">
                                <FaEye className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">Website</span>
                                  <span className="detail-value">
                                    <a href={project.website} target="_blank" rel="noopener noreferrer" className="project-link">
                                      Visit Project Site
                                    </a>
                                  </span>
                                </div>
                              </div>
                            )}
                            {project.documents && project.documents.length > 0 && (
                              <div className="detail-item">
                                <FaClipboardList className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">Attachments ({project.documents.length})</span>
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
                              Reject Submission
                            </button>
                            <button 
                              className="btn-action-approve" 
                              onClick={() => handleApprove(project.id)}
                              disabled={actionLoading === project.id}
                            >
                              {actionLoading === project.id ? 'Processing...' : 'Approve & Publish'}
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
                    <span className="stat-lab">Pending</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon approved"><FaCheckCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{orgStats?.approved || 0}</span>
                    <span className="stat-lab">Approved</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon rejected"><FaTimesCircle /></div>
                  <div className="stat-data">
                    <span className="stat-val">{orgStats?.rejected || 0}</span>
                    <span className="stat-lab">Rejected</span>
                  </div>
                </div>
              </div>

              <div className="content-section">
                <div className="section-header">
                  <div className="filter-tabs">
                    <button className={`filter-tab ${orgFilter === 'pending' ? 'active' : ''}`} onClick={() => setOrgFilter('pending')}>
                      Pending Review
                    </button>
                    <button className={`filter-tab ${orgFilter === 'approved' ? 'active' : ''}`} onClick={() => setOrgFilter('approved')}>
                      Approved
                    </button>
                    <button className={`filter-tab ${orgFilter === 'rejected' ? 'active' : ''}`} onClick={() => setOrgFilter('rejected')}>
                      Rejected
                    </button>
                  </div>
                  <span className="count-badge">
                    {orgFilter === 'pending' ? pendingOrgs.length : orgFilter === 'approved' ? approvedOrgs.length : rejectedOrgs.length} Organizations
                  </span>
                </div>

                {orgsLoading ? (
                  <div className="dashboard-loader">
                    <div className="spinner"></div>
                    <p>Loading organizations...</p>
                  </div>
                ) : orgFilter === 'pending' && pendingOrgs.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">🛡️</div>
                    <h3>No Pending Organizations</h3>
                    <p>All organizations have been reviewed.</p>
                  </div>
                ) : orgFilter === 'approved' && approvedOrgs.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">📋</div>
                    <h3>No Approved Organizations</h3>
                    <p>No organizations have been approved yet.</p>
                  </div>
                ) : orgFilter === 'rejected' && rejectedOrgs.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">📋</div>
                    <h3>No Rejected Organizations</h3>
                    <p>No organizations have been rejected.</p>
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
                                {orgFilter === 'pending' ? 'Pending Review' : orgFilter === 'approved' ? 'Approved' : 'Rejected'}
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
                                <span className="detail-label">Email</span>
                                <span className="detail-value">{org.email}</span>
                              </div>
                            </div>
                            {org.phone && (
                              <div className="detail-item">
                                <FaPhone className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">Phone</span>
                                  <span className="detail-value">{org.phone}</span>
                                </div>
                              </div>
                            )}
                            {org.website && (
                              <div className="detail-item">
                                <FaGlobe className="detail-icon" />
                                <div className="detail-content">
                                  <span className="detail-label">Website</span>
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
                                  <span className="detail-label">Registered</span>
                                  <span className="detail-value">{new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                              </div>
                            )}
                            {org.rejection_reason && (
                              <div className="detail-item">
                                <FaExclamationTriangle className="detail-icon" style={{ color: '#ef4444' }} />
                                <div className="detail-content">
                                  <span className="detail-label">Rejection Reason</span>
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
                                Reject Organization
                              </button>
                              <button 
                                className="btn-action-approve" 
                                onClick={() => handleOrgApprove(org.id)}
                                disabled={orgActionLoading === org.id}
                              >
                                {orgActionLoading === org.id ? 'Processing...' : 'Approve Organization'}
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
              <h3>Reject {rejectType === 'project' ? 'Submission' : 'Organization'}</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}><FaTimesCircle /></button>
            </div>
            <div className="modal-body">
              <p>Please specify why this {rejectType === 'project' ? 'project' : 'organization'} is being rejected.</p>
              <textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={rejectType === 'project' 
                  ? "e.g. Insufficient description, duplicate entry, or incorrect sector categorization..."
                  : "e.g. Incomplete information, invalid website, activity unrelated to AI..."}
                rows="5"
              ></textarea>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button 
                className="btn-danger" 
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
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