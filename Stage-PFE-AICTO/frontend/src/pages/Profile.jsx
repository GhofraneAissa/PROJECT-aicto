import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaRocket, FaShareAlt, FaSyncAlt, FaStar,
  FaCog, FaLock, FaCalendarAlt, FaClock, FaUserShield, FaProjectDiagram, FaExternalLinkAlt,
  FaSpinner
} from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { API_BASE } from '../config'

function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [avatarHover, setAvatarHover] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectStats, setProjectStats] = useState({ total: 0 })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (!token || !storedUser) {
      navigate('/')
      return
    }
    try {
      const parsed = JSON.parse(storedUser)
      setUser(parsed)
      setForm({
        organization_name: parsed.organization_name || '',
        organization_type: parsed.organization_type || '',
        phone: parsed.phone || '',
        website: parsed.website || '',
        country: parsed.country || '',
        city: parsed.city || '',
        address: parsed.address || '',
        sector: parsed.sector || '',
        description: parsed.description || ''
      })
    } catch {
      navigate('/')
    }
    setLoading(false)
  }, [navigate])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organization_name: form.organization_name,
          organization_type: form.organization_type,
          phone: form.phone,
          website: form.website,
          country: form.country,
          city: form.city,
          address: form.address,
          sector: form.sector,
          description: form.description
        })
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setUser(prev => ({ ...prev, ...updated }))
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify({ ...user, ...updated }))
      setEditing(false)
      setToast({ type: 'success', message: t('profile.updatedSuccess') })
    } catch (err) {
      setToast({ type: 'error', message: t('profile.updateFailed') })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      organization_name: user?.organization_name || '',
      organization_type: user?.organization_type || '',
      phone: user?.phone || '',
      website: user?.website || '',
      country: user?.country || '',
      city: user?.city || '',
      address: user?.address || '',
      sector: user?.sector || '',
      description: user?.description || ''
    })
    setEditing(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      try {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ logo: base64 })
        })
        if (!res.ok) throw new Error('Failed')
        const updated = await res.json()
        setUser(prev => ({ ...prev, ...updated }))
        const storage = localStorage.getItem('user') ? localStorage : sessionStorage
        storage.setItem('user', JSON.stringify({ ...user, ...updated }))
        setToast({ type: 'success', message: t('profile.logoUpdated') })
      } catch {
        setToast({ type: 'error', message: t('profile.logoFailed') })
      }
    }
    reader.readAsDataURL(file)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return 'N/A' }
  }

  const fetchProjects = useCallback(async () => {
    if (!user) return
    setProjectsLoading(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/users/${user.id}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
        setProjectStats({ total: data.total || 0 })
      }
    } catch { /* ignore */ }
    setProjectsLoading(false)
  }, [user])

  useEffect(() => {
    if (activeTab === 'my-projects') fetchProjects()
  }, [activeTab, fetchProjects])

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ type: 'error', message: t('profile.passwordsDoNotMatch') })
      return
    }
    setPasswordSaving(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: passwordForm.newPassword })
      })
      if (!res.ok) throw new Error('Failed')
      setToast({ type: 'success', message: t('profile.passwordChanged') })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setToast({ type: 'error', message: t('profile.passwordChangeFailed') })
    }
    setPasswordSaving(false)
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>{t('profile.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const sectorTags = user.sector ? user.sector.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []
  const formSectorTags = form.sector ? form.sector.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []

  return (
    <div className="profile-page">
      {toast && (
        <div className={`profile-toast profile-toast-${toast.type}`}>
          {toast.type === 'success' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          )}
          {toast.message}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-banner-gradient"></div>
          <div className="profile-header-content">
            <div
              className="profile-avatar-container"
              onMouseEnter={() => editing && setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
            >
              {user.logo ? (
                <img src={user.logo} alt={user.organization_name} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-placeholder">
                  <svg viewBox="0 0 80 90" fill="none">
                    <ellipse cx="40" cy="28" rx="18" ry="18" fill="#94a3b8"/>
                    <ellipse cx="40" cy="80" rx="34" ry="24" fill="#94a3b8"/>
                  </svg>
                </div>
              )}
              {editing && (
                <>
                  <div className={`profile-avatar-overlay ${avatarHover ? 'visible' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="20" height="20">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <input type="file" accept="image/*" className="profile-avatar-input" onChange={handleLogoUpload} />
                </>
              )}
            </div>

            <div className="profile-header-info">
              {editing ? (
                <input
                  type="text"
                  className="profile-edit-title"
                  value={form.organization_name}
                  onChange={e => handleChange('organization_name', e.target.value)}
                  placeholder={t('profile.namePlaceholder')}
                />
              ) : (
                <h1>{user.organization_name || t('profile.organization')}</h1>
              )}
              {editing ? (
                <select
                  className="profile-edit-select"
                  value={form.organization_type}
                  onChange={e => handleChange('organization_type', e.target.value)}
                >
                  <option value="" disabled>{t('profile.selectType')}</option>
                  <option value="NGO">{t('profile.typeNgo')}</option>
                  <option value="Business">{t('profile.typeBusiness')}</option>
                  <option value="Company">{t('profile.typeCompany')}</option>
                  <option value="Government">{t('profile.typeGovernment')}</option>
                  <option value="University">{t('profile.typeUniversity')}</option>
                  <option value="Research Lab">{t('profile.typeResearchLab')}</option>
                </select>
              ) : (
                <p className="profile-org-type">{user.organization_type}</p>
              )}
              {editing ? (
                <div className="profile-edit-location-row">
                  <input
                    type="text"
                    className="profile-edit-input-sm"
                    value={form.city}
                    onChange={e => handleChange('city', e.target.value)}
                    placeholder={t('profile.city')}
                  />
                  <span className="profile-edit-sep">,</span>
                  <input
                    type="text"
                    className="profile-edit-input-sm"
                    value={form.country}
                    onChange={e => handleChange('country', e.target.value)}
                    placeholder={t('profile.country')}
                  />
                </div>
              ) : (
                <p className="profile-location">
                  <FaMapMarkerAlt size={12} />
                  {user.city && user.country ? `${user.city}, ${user.country}` : user.country || user.city || t('profile.notSpecified')}
                </p>
              )}
            </div>

            <div className="profile-header-actions">
              {editing ? (
                <div className="profile-edit-actions">
                  <button className="profile-btn-edit profile-btn-cancel" onClick={handleCancel} disabled={saving}>
                    {t('profile.cancel')}
                   </button>
                   <button className="profile-btn-edit profile-btn-save" onClick={handleSave} disabled={saving}>
                     {saving ? (
                       <span className="profile-save-spinner"></span>
                     ) : (
                       <>
                         <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                         {t('profile.save')}
                       </>
                     )}
                  </button>
                </div>
              ) : (
                <button className="profile-edit-toggle" onClick={() => setEditing(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {t('profile.editProfile')}
                 </button>
              )}
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <FaUserShield size={16} />
            <div className="profile-stat-info">
              <span className="profile-stat-value">{user.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleOrganization')}</span>
              <span className="profile-stat-label">{t('profile.role')}</span>
            </div>
          </div>
          <div className="profile-stat">
            <FaCalendarAlt size={16} />
            <div className="profile-stat-info">
              <span className="profile-stat-value">{formatDate(user.created_at)}</span>
              <span className="profile-stat-label">{t('profile.memberSince')}</span>
            </div>
          </div>
          <div className="profile-stat">
            <FaClock size={16} />
            <div className="profile-stat-info">
              <span className="profile-stat-value">{formatDate(user.last_login)}</span>
              <span className="profile-stat-label">{t('profile.lastLogin')}</span>
            </div>
          </div>
          <div className="profile-stat">
            <FaProjectDiagram size={16} />
            <div className="profile-stat-info">
              <span className="profile-stat-value">{projectStats.total}</span>
              <span className="profile-stat-label">{t('profile.myProjects')}</span>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUserShield size={13} />
            {t('profile.editProfile')}
          </button>
          <button
            className={`profile-tab ${activeTab === 'my-projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-projects')}
          >
            <FaProjectDiagram size={13} />
            {t('profile.myProjects')}
          </button>
          <button
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <FaCog size={13} />
            {t('profile.settings')}
          </button>
        </div>

        <div className="profile-body">
          {activeTab === 'profile' && (
            <>
              <div className="profile-section">
                <h2 className="profile-section-title">
                  <FaEnvelope size={14} /> {t('profile.contactInfo')}
                </h2>
                <div className="profile-details-grid">
                  <div className="profile-detail-item">
                    <div className="profile-detail-icon-wrap">
                      <FaEnvelope size={14} />
                    </div>
                    <div className="profile-detail-content">
                      <span className="profile-detail-label">{t('profile.email')}</span>
                      {editing ? (
                        <input type="email" className="profile-edit-field" value={user.email} disabled title={t('profile.emailCannotChange')} />
                      ) : (
                        <span className="profile-detail-value">{user.email || t('profile.notProvided')}</span>
                      )}
                    </div>
                  </div>
                  <div className="profile-detail-item">
                    <div className="profile-detail-icon-wrap">
                      <FaPhone size={14} />
                    </div>
                    <div className="profile-detail-content">
                      <span className="profile-detail-label">{t('profile.phone')}</span>
                      {editing ? (
                        <input type="tel" className="profile-edit-field" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder={t('profile.phonePlaceholder')} />
                      ) : (
                        <span className="profile-detail-value">{user.phone || t('profile.notProvided')}</span>
                      )}
                    </div>
                  </div>
                  <div className="profile-detail-item">
                    <div className="profile-detail-icon-wrap">
                      <FaGlobe size={14} />
                    </div>
                    <div className="profile-detail-content">
                      <span className="profile-detail-label">{t('profile.website')}</span>
                      {editing ? (
                        <input type="url" className="profile-edit-field" value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder={t('profile.websitePlaceholder')} />
                      ) : user.website ? (
                        <span className="profile-detail-value"><a href={user.website} target="_blank" rel="noopener noreferrer">{user.website}</a></span>
                      ) : (
                        <span className="profile-detail-value">{t('profile.notProvided')}</span>
                      )}
                    </div>
                  </div>
                  <div className="profile-detail-item">
                    <div className="profile-detail-icon-wrap">
                      <FaMapMarkerAlt size={14} />
                    </div>
                    <div className="profile-detail-content">
                      <span className="profile-detail-label">{t('profile.address')}</span>
                      {editing ? (
                        <input type="text" className="profile-edit-field" value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder={t('profile.addressPlaceholder')} />
                      ) : (
                        <span className="profile-detail-value">{user.address || t('profile.notProvided')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2 className="profile-section-title">
                  <FaStar size={14} /> {t('profile.descriptionExpertise')}
                </h2>
                {editing ? (
                  <div className="profile-edit-section">
                    <textarea
                      className="profile-edit-textarea"
                      value={form.description}
                      onChange={e => handleChange('description', e.target.value)}
                      placeholder={t('profile.orgDescription')}
                      rows={3}
                    />
                    <input
                      type="text"
                      className="profile-edit-field"
                      value={form.sector}
                      onChange={e => handleChange('sector', e.target.value)}
                      placeholder={t('profile.sectorsPlaceholder')}
                    />
                  </div>
                ) : (
                  <>
                    {user.description && (
                      <p className="profile-description">{user.description}</p>
                    )}
                    {sectorTags.length > 0 && (
                      <div className="profile-skills-pills">
                        {sectorTags.map((tag, i) => (
                          <span key={i} className="profile-skill-pill">{tag}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="profile-divider"></div>

              <div className="profile-actions">
                <Link to="/projects" className="profile-action-card">
                  <div className="profile-action-icon-wrap">
                    <FaRocket size={20} />
                  </div>
                  <h3>{t('profile.submitProject')}</h3>
                  <p>{t('profile.readyForWorkDesc')}</p>
                  <div className="profile-arrow-btn">
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                </Link>
                <Link to="/sdgs" className="profile-action-card">
                  <div className="profile-action-icon-wrap">
                    <FaShareAlt size={20} />
                  </div>
                  <h3>{t('profile.sharePosts')}</h3>
                  <p>{t('profile.sharePostsDesc')}</p>
                  <div className="profile-arrow-btn">
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                </Link>
                <div className="profile-action-card" onClick={() => { setActiveTab('settings'); setEditing(false) }}>
                  <div className="profile-action-icon-wrap">
                    <FaSyncAlt size={20} />
                  </div>
                  <h3>{t('profile.updateProfile')}</h3>
                  <p>{t('profile.updateProfileDesc')}</p>
                  <div className="profile-arrow-btn">
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'my-projects' && (
            <div className="profile-tab-content">
              <h2 className="profile-section-title">
                <FaProjectDiagram size={14} /> {t('profile.myProjects')}
              </h2>
              <p className="profile-tab-desc">{t('profile.myProjectsDesc')}</p>
              {projectsLoading ? (
                <div className="profile-loading-inline">
                  <FaSpinner className="spin" /> {t('common.loading')}
                </div>
              ) : projects.length === 0 ? (
                <div className="profile-empty-state">
                  <FaProjectDiagram size={40} />
                  <h3>{t('profile.noProjects')}</h3>
                  <p>{t('profile.noProjectsDesc')}</p>
                  <Link to="/projects" className="btn btn-primary">
                    <FaRocket /> {t('profile.submitProject')}
                  </Link>
                </div>
              ) : (
                <div className="profile-projects-list">
                  {projects.map(project => (
                    <Link to={`/projects/${project.id}`} key={project.id} className="profile-project-card">
                      <div className="profile-project-info">
                        <h3>{project.title}</h3>
                        <div className="profile-project-meta">
                          {project.status && (
                            <span className={`profile-project-badge status-${project.status.toLowerCase()}`}>
                              {project.status}
                            </span>
                          )}
                          {project.sector && <span className="profile-project-tag">{project.sector}</span>}
                          {project.country && <span className="profile-project-tag">{project.country}</span>}
                        </div>
                        {project.description && (
                          <p className="profile-project-desc">{project.description}</p>
                        )}
                      </div>
                      <FaExternalLinkAlt size={12} className="profile-project-link-icon" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="profile-tab-content">
              <h2 className="profile-section-title">
                <FaLock size={14} /> {t('profile.changePassword')}
              </h2>
              <p className="profile-tab-desc">{t('profile.settingsDesc')}</p>
              <div className="profile-password-form">
                <div className="profile-password-field">
                  <label>{t('profile.newPassword')}</label>
                  <input
                    type="password"
                    className="profile-edit-field"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="profile-password-field">
                  <label>{t('profile.confirmPassword')}</label>
                  <input
                    type="password"
                    className="profile-edit-field"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <button
                  className="profile-btn-edit profile-btn-save"
                  onClick={handlePasswordChange}
                  disabled={passwordSaving || !passwordForm.newPassword || !passwordForm.confirmPassword}
                >
                  {passwordSaving ? (
                    <span className="profile-save-spinner"></span>
                  ) : (
                    <><FaLock size={12} /> {t('profile.changePassword')}</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default Profile
