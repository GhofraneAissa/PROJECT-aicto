import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaRocket, FaShareAlt, FaSyncAlt, FaStar,
  FaCog, FaLock, FaCalendarAlt, FaClock, FaUserShield, FaProjectDiagram, FaExternalLinkAlt,
  FaSpinner
} from 'react-icons/fa'
import { useTranslation } from 'react-i18next'

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
      const res = await fetch(`http://127.0.0.1:8000/api/users/${user.id}`, {
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
        const res = await fetch(`http://127.0.0.1:8000/api/users/${user.id}`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/users/${user.id}/projects`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/users/${user.id}`, {
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
                  <option value="NGO">NGO</option>
                  <option value="Business">Business</option>
                  <option value="Company">Company</option>
                  <option value="Government">Government</option>
                  <option value="University">University</option>
                  <option value="Research Lab">Research Lab</option>
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
              <span className="profile-stat-value">{user.role === 'admin' ? 'Admin' : 'Organization'}</span>
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

      <style>{`
        .profile-page {
          background: var(--gray-50);
          min-height: calc(100vh - 80px);
          padding: 32px 24px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .profile-loading {
          text-align: center;
          color: var(--gray-500);
          margin-top: 120px;
        }
        .profile-loading .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--gray-200);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: pSpin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes pSpin { to { transform: rotate(360deg); } }
        .spin { animation: pSpin 0.8s linear infinite; }

        /* Stats Row */
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 20px 28px;
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-100);
        }
        .profile-stat {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--white);
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--gray-100);
        }
        .profile-stat svg { color: var(--primary-color); flex-shrink: 0; }
        .profile-stat-info { display: flex; flex-direction: column; min-width: 0; }
        .profile-stat-value {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--gray-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-stat-label {
          font-size: 0.65rem;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        /* Tabs */
        .profile-tabs {
          display: flex;
          gap: 4px;
          padding: 16px 28px 0;
          border-bottom: 1px solid var(--gray-100);
          background: var(--white);
        }
        .profile-tab {
          padding: 10px 20px;
          border: none;
          background: none;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gray-500);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: -1px;
        }
        .profile-tab:hover { color: var(--gray-700); }
        .profile-tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        /* Tab Content */
        .profile-tab-content { padding-top: 4px; }
        .profile-tab-desc {
          font-size: 0.85rem;
          color: var(--gray-500);
          margin-bottom: 20px;
        }
        .profile-loading-inline {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 40px 0;
          justify-content: center;
          color: var(--gray-500);
          font-size: 0.9rem;
        }

        /* Empty State */
        .profile-empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--gray-400);
        }
        .profile-empty-state svg { margin-bottom: 12px; }
        .profile-empty-state h3 {
          font-size: 1.1rem;
          color: var(--gray-700);
          margin-bottom: 6px;
        }
        .profile-empty-state p {
          font-size: 0.85rem;
          color: var(--gray-500);
          margin-bottom: 20px;
        }

        /* Projects List */
        .profile-projects-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .profile-project-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 18px;
          background: var(--gray-50);
          border-radius: 14px;
          border: 1.5px solid var(--gray-100);
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }
        .profile-project-card:hover {
          border-color: var(--primary-color);
          background: rgba(37, 99, 235, 0.03);
          transform: translateX(4px);
        }
        .profile-project-info { flex: 1; min-width: 0; }
        .profile-project-info h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 6px;
        }
        .profile-project-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 6px;
        }
        .profile-project-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .profile-project-badge.status-ongoing,
        .profile-project-badge.status-active { background: rgba(5, 150, 105, 0.1); color: #059669; }
        .profile-project-badge.status-completed { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
        .profile-project-badge.status-planned { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .profile-project-tag {
          font-size: 0.72rem;
          font-weight: 500;
          padding: 2px 10px;
          border-radius: 999px;
          background: var(--gray-100);
          color: var(--gray-600);
        }
        .profile-project-desc {
          font-size: 0.82rem;
          color: var(--gray-500);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .profile-project-link-icon {
          flex-shrink: 0;
          margin-top: 4px;
          color: var(--gray-400);
          transition: color 0.2s;
        }
        .profile-project-card:hover .profile-project-link-icon { color: var(--primary-color); }

        /* Password Form */
        .profile-password-form {
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .profile-password-field label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--gray-600);
          margin-bottom: 6px;
        }
        .profile-password-form .profile-btn-save {
          align-self: flex-start;
          padding: 11px 24px;
        }

        .profile-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          animation: toastIn 0.35s ease both;
        }
        .profile-toast-success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .profile-toast-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .profile-card {
          background: var(--white);
          border-radius: 24px;
          box-shadow: var(--shadow-md);
          width: 100%;
          max-width: 720px;
          overflow: hidden;
          animation: cardFadeUp 0.5s ease both;
        }
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .profile-header {
          position: relative;
          overflow: hidden;
        }
        .profile-banner-gradient {
          height: 120px;
          background: linear-gradient(135deg, #2563eb 0%, #059669 25%, #06b6d4 45%, #8b5cf6 65%, #ec4899 85%, #f59e0b 100%);
          position: relative;
        }
        .profile-banner-gradient::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to top, rgba(255,255,255,0.3), transparent);
        }
        .profile-header-content {
          padding: 0 28px 24px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          position: relative;
        }
        .profile-avatar-container {
          position: relative;
          width: 104px;
          height: 104px;
          flex-shrink: 0;
          margin-top: -52px;
          cursor: default;
        }
        .profile-avatar-img {
          width: 104px;
          height: 104px;
          border-radius: 50%;
          border: 4px solid #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          object-fit: cover;
        }
        .profile-avatar-placeholder {
          width: 104px;
          height: 104px;
          border-radius: 50%;
          border: 4px solid #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .profile-avatar-placeholder svg {
          width: 72px;
        }
        .profile-avatar-overlay {
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .profile-avatar-overlay.visible {
          opacity: 1;
        }
        .profile-avatar-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          border-radius: 50%;
        }
        .profile-header-info {
          flex: 1;
          min-width: 0;
          padding-top: 8px;
        }
        .profile-header-info h1 {
          font-size: 1.55rem;
          font-weight: 800;
          color: var(--gray-900);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .profile-org-type {
          font-size: 0.875rem;
          color: var(--primary-color);
          font-weight: 600;
          margin-top: 4px;
        }
        .profile-location {
          font-size: 0.85rem;
          color: var(--gray-500);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .profile-header-actions {
          flex-shrink: 0;
          padding-top: 8px;
        }
        .profile-edit-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border-radius: 999px;
          border: 1.5px solid var(--gray-200);
          background: var(--white);
          color: var(--gray-700);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }
        .profile-edit-toggle:hover {
          background: var(--gray-50);
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .profile-edit-actions {
          display: flex;
          gap: 8px;
        }
        .profile-btn-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }
        .profile-btn-cancel {
          background: var(--gray-100);
          color: var(--gray-700);
        }
        .profile-btn-cancel:hover {
          background: var(--gray-200);
        }
        .profile-btn-save {
          background: var(--primary-color);
          color: #fff;
        }
        .profile-btn-save:hover {
          background: var(--primary-dark);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        .profile-btn-save:disabled,
        .profile-btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .profile-save-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: pSpin 0.6s linear infinite;
          display: inline-block;
        }
        .profile-edit-title {
          width: 100%;
          font-size: 1.55rem;
          font-weight: 800;
          color: var(--gray-900);
          border: none;
          border-bottom: 2px solid var(--gray-200);
          padding: 4px 0;
          outline: none;
          font-family: inherit;
          letter-spacing: -0.02em;
          transition: border-color 0.2s;
        }
        .profile-edit-title:focus {
          border-bottom-color: var(--primary-color);
        }
        .profile-edit-select {
          margin-top: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--gray-200);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--primary-color);
          background: var(--gray-50);
          font-family: inherit;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .profile-edit-select:focus {
          border-color: var(--primary-color);
        }
        .profile-edit-location-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }
        .profile-edit-input-sm {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1.5px solid var(--gray-200);
          font-size: 0.82rem;
          color: var(--gray-700);
          background: var(--gray-50);
          font-family: inherit;
          outline: none;
          width: 100px;
          transition: border-color 0.2s;
        }
        .profile-edit-input-sm:focus {
          border-color: var(--primary-color);
        }
        .profile-edit-sep {
          color: var(--gray-400);
          font-weight: 500;
        }

        .profile-body {
          padding: 0 28px 28px;
        }
        .profile-section {
          margin-top: 24px;
        }
        .profile-section-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .profile-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .profile-detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .profile-detail-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--gray-50);
          border: 1.5px solid var(--gray-100);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-400);
          flex-shrink: 0;
        }
        .profile-detail-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .profile-detail-label {
          font-size: 0.7rem;
          color: var(--gray-400);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        .profile-detail-value {
          font-size: 0.9rem;
          color: var(--gray-800);
          font-weight: 500;
          margin-top: 2px;
          word-break: break-all;
        }
        .profile-detail-value a {
          color: var(--primary-color);
          text-decoration: none;
        }
        .profile-detail-value a:hover {
          text-decoration: underline;
        }
        .profile-edit-field {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--gray-200);
          font-size: 0.875rem;
          color: var(--gray-800);
          background: var(--gray-50);
          font-family: inherit;
          outline: none;
          margin-top: 4px;
          transition: border-color 0.2s;
        }
        .profile-edit-field:focus {
          border-color: var(--primary-color);
          background: var(--white);
        }
        .profile-edit-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--gray-100);
        }
        .profile-edit-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .profile-edit-textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--gray-200);
          font-size: 0.875rem;
          color: var(--gray-800);
          background: var(--gray-50);
          font-family: inherit;
          outline: none;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.2s;
        }
        .profile-edit-textarea:focus {
          border-color: var(--primary-color);
          background: var(--white);
        }
        .profile-description {
          font-size: 0.9rem;
          color: var(--gray-600);
          line-height: 1.7;
          margin-bottom: 16px;
        }
        .profile-skills-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .profile-skill-pill {
          background: rgba(37, 99, 235, 0.08);
          border: 1.5px solid rgba(37, 99, 235, 0.15);
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--primary-color);
          transition: all 0.2s;
        }
        .profile-skill-pill:hover {
          background: rgba(37, 99, 235, 0.12);
          transform: translateY(-1px);
        }
        .profile-divider {
          height: 1px;
          background: var(--gray-100);
          margin: 28px 0 24px;
        }
        .profile-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .profile-action-card {
          background: var(--gray-50);
          border-radius: 16px;
          border: 1.5px solid var(--gray-100);
          padding: 18px 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .profile-action-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          border-color: var(--gray-200);
        }
        .profile-action-icon-wrap {
          width: 40px;
          height: 40px;
          background: var(--white);
          border: 1.5px solid var(--gray-100);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-500);
          margin-bottom: 8px;
          transition: all 0.25s;
        }
        .profile-action-card:hover .profile-action-icon-wrap {
          color: var(--primary-color);
          border-color: rgba(37, 99, 235, 0.2);
          background: rgba(37, 99, 235, 0.05);
        }
        .profile-action-card h3 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--gray-900);
        }
        .profile-action-card p {
          font-size: 0.75rem;
          color: var(--gray-500);
          line-height: 1.5;
          flex: 1;
        }
        .profile-arrow-btn {
          width: 32px;
          height: 32px;
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: flex-end;
          margin-top: 8px;
          transition: all 0.2s;
        }
        .profile-action-card:hover .profile-arrow-btn {
          background: var(--primary-color);
          border-color: var(--primary-color);
        }
        .profile-action-card:hover .profile-arrow-btn svg {
          stroke: #fff;
        }
        .profile-arrow-btn svg {
          width: 14px;
          height: 14px;
          stroke: var(--gray-700);
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: stroke 0.2s;
        }

        @media (max-width: 768px) {
          .profile-page { padding: 16px 12px 48px; }
          .profile-header-content { padding: 0 16px 20px; flex-wrap: wrap; }
          .profile-body { padding: 0 16px 20px; }
          .profile-stats { padding: 16px; grid-template-columns: repeat(2, 1fr); }
          .profile-tabs { padding: 12px 16px 0; overflow-x: auto; }
          .profile-tab { white-space: nowrap; padding: 8px 14px; font-size: 0.8rem; }
          .profile-details-grid { grid-template-columns: 1fr; }
          .profile-actions { grid-template-columns: 1fr; }
          .profile-header-info h1 { font-size: 1.3rem; }
          .profile-avatar-container { width: 88px; height: 88px; margin-top: -44px; }
          .profile-avatar-img { width: 88px; height: 88px; }
          .profile-avatar-placeholder { width: 88px; height: 88px; }
          .profile-avatar-placeholder svg { width: 60px; }
          .profile-header-actions { width: 100%; }
          .profile-edit-toggle,
          .profile-edit-actions { width: 100%; justify-content: flex-end; }
        }
        @media (max-width: 480px) {
          .profile-header-content { flex-direction: column; align-items: center; text-align: center; }
          .profile-header-info { padding-top: 16px; }
          .profile-header-actions { margin-top: 12px; }
          .profile-location { justify-content: center; }
          .profile-edit-location-row { justify-content: center; }
          .profile-stats { grid-template-columns: 1fr 1fr; }
          .profile-stat-value { font-size: 0.75rem; }
        }
      `}</style>
    </div>
  )
}

export default Profile
