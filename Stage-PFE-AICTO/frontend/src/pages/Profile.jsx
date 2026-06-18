import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaStar,
  FaCog, FaLock, FaUserShield, FaExternalLinkAlt,
  FaSpinner, FaUserCircle, FaBuilding, FaEdit, FaSave, FaTimes,
  FaCheckCircle, FaCopy, FaEye, FaCity, FaGlobeAmericas,
  FaUsers, FaProjectDiagram, FaHandshake, FaInfoCircle,
  FaCheckDouble, FaClock, FaBan, FaArrowRight
} from 'react-icons/fa'
import { API_BASE } from '../config'

const ORG_TYPES = [
  { value: 'NGO', label: 'NGO' },
  { value: 'Startup', label: 'Startup' },
  { value: 'Company', label: 'Company' },
  { value: 'Government', label: 'Government' },
  { value: 'University', label: 'University' },
  { value: 'Research Lab', label: 'Research Lab' },
]

function Profile() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [avatarHover, setAvatarHover] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [stakeholder, setStakeholder] = useState(null)
  const [stakeholderLoading, setStakeholderLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})

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
      resetForm(parsed)
    } catch {
      navigate('/')
    }
    setLoading(false)
  }, [navigate])

  useEffect(() => {
    if (user?.id) fetchStakeholder(user.id)
  }, [user?.id])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const fetchStakeholder = async (userId) => {
    setStakeholderLoading(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/users/${userId}/stakeholder`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStakeholder(data.stakeholder)
      }
    } catch {} finally {
      setStakeholderLoading(false)
    }
  }

  const resetForm = (u) => {
    setForm({
      organization_name: u.organization_name || '',
      organization_type: u.organization_type || '',
      phone: u.phone || '',
      website: u.website || '',
      country: u.country || '',
      city: u.city || '',
      address: u.address || '',
      sector: u.sector || '',
      description: u.description || ''
    })
    setErrors({})
    setDirty(false)
  }

  const showToast = (type, message) => setToast({ type, message })

  const validate = () => {
    const errs = {}
    if (!form.organization_name?.trim()) errs.organization_name = t('profile.orgNameRequired')
    if (!form.organization_type) errs.organization_type = t('profile.typeRequired')
    if (form.website && !/^https?:\/\/.+/.test(form.website)) errs.website = t('profile.urlValidation')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setDirty(true)
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organization_name: form.organization_name,
          organization_type: form.organization_type,
          phone: form.phone || null,
          website: form.website || null,
          country: form.country || null,
          city: form.city || null,
          address: form.address || null,
          sector: form.sector || null,
          description: form.description || null
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t('profile.failedToUpdate'))
      }
      const updated = await res.json()
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      setEditing(false)
      setDirty(false)
      showToast('success', t('profile.profileUpdated'))
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    resetForm(user)
    setEditing(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ logo: ev.target.result })
        })
        if (!res.ok) throw new Error('Failed')
        const updated = await res.json()
        const storage = localStorage.getItem('user') ? localStorage : sessionStorage
        storage.setItem('user', JSON.stringify(updated))
        setUser(updated)
        showToast('success', t('profile.logoUpdated'))
      } catch {
        showToast('error', t('profile.logoFailed'))
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePasswordChange = async () => {
    const errs = {}
    if (!passwordForm.newPassword) errs.newPassword = t('profile.passwordRequired')
    else if (passwordForm.newPassword.length < 8) errs.newPassword = t('profile.passwordMinLength')
    else if (!/[A-Z]/.test(passwordForm.newPassword)) errs.newPassword = t('profile.passwordNeedUppercase')
    else if (!/[0-9]/.test(passwordForm.newPassword)) errs.newPassword = t('profile.passwordNeedDigit')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = t('profile.passwordsDoNotMatch')
    setPasswordErrors(errs)
    if (Object.keys(errs).length > 0) return

    setPasswordSaving(true)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: passwordForm.newPassword })
      })
      if (!res.ok) throw new Error('Failed')
      showToast('success', t('profile.passwordChanged'))
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } catch {
      showToast('error', t('profile.passwordChangeFailed'))
    }
    setPasswordSaving(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return t('profile.notAvailable')
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    } catch { return t('profile.notAvailable') }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">{t('profile.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const sectorTags = user.sector
    ? user.sector.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border backdrop-blur-sm ${
          toast.type === 'success'
            ? 'bg-white/95 border-green-100 shadow-green-100/50'
            : 'bg-white/95 border-red-100 shadow-red-100/50'
        } animate-slide-in`}>
          <div className={`${toast.type === 'success' ? 'text-green-500' : 'text-red-500'} text-lg`}>
            {toast.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
          </div>
          <span className="text-gray-800 font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">

          {/* === LEFT COLUMN === */}
          <div className="lg:sticky lg:top-6 h-fit space-y-6">

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition hover:shadow-md">
              <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 relative">
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)`
                  }} />
              </div>

              <div className="px-6 pb-6">
                <div className="relative -mt-16 mb-4 flex flex-col items-center">
                  <div
                    className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 shadow-lg overflow-hidden relative cursor-pointer group"
                    onMouseEnter={() => editing && setAvatarHover(true)}
                    onMouseLeave={() => setAvatarHover(false)}
                    onClick={() => editing && fileInputRef.current?.click()}
                  >
                    {user.logo ? (
                      <img src={user.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl">
                        <FaBuilding />
                      </div>
                    )}
                    {editing && (
                      <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-1 transition-all duration-200 ${
                        avatarHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
                      }`}>
                        <FaEdit className="text-xl" />
                        <span className="font-medium">{t('profile.changeLogo')}</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>

                  <div className="text-center mt-3 w-full">
                    {editing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          className={`text-center w-full text-xl font-bold border rounded-xl px-4 py-2.5 bg-gray-50 outline-none transition ${
                            errors.organization_name
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                          }`}
                          value={form.organization_name}
                          onChange={e => handleChange('organization_name', e.target.value)}
                          placeholder={t('profile.namePlaceholder')}
                        />
                        {errors.organization_name && (
                          <p className="text-xs text-red-500 text-left px-1">{t('profile.orgNameRequired')}</p>
                        )}
                        <select
                          className={`w-full text-sm border rounded-xl px-4 py-2.5 bg-gray-50 outline-none transition ${
                            errors.organization_type
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                          }`}
                          value={form.organization_type}
                          onChange={e => handleChange('organization_type', e.target.value)}
                        >
                          <option value="">{t('profile.selectType')}</option>
                          {ORG_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {errors.organization_type && (
                          <p className="text-xs text-red-500 text-left px-1">{errors.organization_type}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl font-bold text-gray-900">{user.organization_name}</h2>
                        <span className="inline-block mt-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                          {user.organization_type}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!editing && (
                  <button
                    className="w-full mb-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    onClick={() => setEditing(true)}
                  >
                    <FaEdit /> {t('profile.editProfile')}
                  </button>
                )}

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {[
                    { label: t('profile.role'), value: user.role === 'admin' ? t('profile.administrator') : t('profile.organization') },
                    { label: t('profile.status'), value: user.is_approved ? t('profile.approved') : t('profile.pending'), color: user.is_approved ? 'text-green-600' : 'text-amber-600' },
                    { label: t('profile.memberSince'), value: formatDate(user.created_at) },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{item.label}</span>
                      <span className={`font-medium ${item.color || 'text-gray-800'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <button className="mt-4 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2">
                  <FaEye /> {t('profile.viewPublicProfile')}
                </button>

                <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                  <span className="text-xs text-gray-400 truncate flex-1 select-all">
                    {window.location.origin}/profile/{user.id}
                  </span>
                  <button
                    className="text-gray-400 hover:text-blue-600 transition p-1"
                    title={t('profile.copyLink')}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/profile/${user.id}`)
                      showToast('success', t('profile.linkCopied'))
                    }}
                  >
                    <FaCopy className="text-sm" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stakeholder Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition hover:shadow-md">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <FaHandshake className="text-green-500" />
                <h3 className="font-bold text-gray-900 text-sm">{t('profile.linkedStakeholder')}</h3>
              </div>
              <div className="px-5 py-4">
                {stakeholderLoading ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ) : stakeholder ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {stakeholder.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{stakeholder.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="capitalize">{stakeholder.type}</span>
                          {stakeholder.country && (
                            <>
                              <span>·</span>
                              <span>{stakeholder.country}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{t('profile.owner')}</span>
                    </div>
                    {stakeholder.website && (
                      <a href={stakeholder.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline">
                        <FaExternalLinkAlt className="text-[10px]" />
                        {stakeholder.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {stakeholder.description && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{stakeholder.description}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <FaUsers className="mx-auto text-gray-300 text-2xl mb-2" />
                    <p className="text-xs text-gray-400">{t('profile.noLinkedStakeholder')}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{t('profile.autoStakeholderHint')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT COLUMN === */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition hover:shadow-md">
            {/* Tabs */}
            <div className="border-b border-gray-100 px-6">
              <div className="flex gap-1 -mb-px">
                {[
                  { key: 'profile', icon: <FaUserCircle />, label: t('profile.tabProfile') },
                  { key: 'settings', icon: <FaCog />, label: t('profile.tabSettings') },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`px-5 py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8">
              {activeTab === 'profile' && (
                <div className="space-y-8">

                  {/* Contact Information */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                        <FaEnvelope className="text-sm" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{t('profile.contactInfo')}</h3>
                        <p className="text-xs text-gray-400">{t('profile.contactInfoDesc')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label={t('profile.email')} icon={<FaEnvelope />}>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 flex items-center gap-2">
                          <FaEnvelope className="text-gray-400 text-xs" />
                          <span>{user.email}</span>
                        </div>
                      </Field>

                      <Field label={t('profile.phone')}>
                        {editing ? (
                          <input type="tel"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                            value={form.phone}
                            onChange={e => handleChange('phone', e.target.value)}
                            placeholder={t('profile.phonePlaceholder')} />
                        ) : (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 flex items-center gap-2">
                            <FaPhone className="text-gray-400 text-xs" />
                            <span>{user.phone || <span className="text-gray-400 italic">{t('profile.notProvided')}</span>}</span>
                          </div>
                        )}
                      </Field>

                      <Field label={t('profile.website')}>
                        {editing ? (
                          <input type="url"
                            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition ${
                              errors.website
                                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                            }`}
                            value={form.website}
                            onChange={e => handleChange('website', e.target.value)}
                            placeholder={t('profile.websitePlaceholder')} />
                        ) : user.website ? (
                          <a href={user.website} target="_blank" rel="noopener noreferrer"
                            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-2 truncate">
                            <FaGlobe className="text-blue-400 text-xs shrink-0" />
                            <span className="truncate">{user.website}</span>
                            <FaExternalLinkAlt className="text-[10px] shrink-0 ml-auto" />
                          </a>
                        ) : (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 italic flex items-center gap-2">
                            <FaGlobe className="text-gray-300 text-xs" />
                            {t('profile.notProvided')}
                          </div>
                        )}
                        {errors.website && <p className="text-xs text-red-500 mt-1">{t('profile.urlValidation')}</p>}
                      </Field>

                      <Field label={t('profile.location')}>
                        {editing ? (
                          <div className="space-y-2">
                            <input type="text"
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                              value={form.country}
                              onChange={e => handleChange('country', e.target.value)}
                              placeholder={t('profile.countryPlaceholder')} />
                            <div className="flex gap-2">
                              <input type="text"
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                                value={form.city}
                                onChange={e => handleChange('city', e.target.value)}
                                placeholder={t('profile.cityPlaceholder')} />
                              <input type="text"
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                                value={form.address}
                                onChange={e => handleChange('address', e.target.value)}
                                placeholder={t('profile.addressPlaceholder')} />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                            {user.country || user.city || user.address ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <FaMapMarkerAlt className="text-gray-400 text-xs" />
                                {[user.address, user.city, user.country].filter(Boolean).join(', ')}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic flex items-center gap-2">
                                <FaMapMarkerAlt className="text-gray-300 text-xs" />
                                {t('profile.notProvided')}
                              </span>
                            )}
                          </div>
                        )}
                      </Field>
                    </div>
                  </section>

                  {/* About & Expertise */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm">
                        <FaStar className="text-sm" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{t('profile.aboutExpertise')}</h3>
                        <p className="text-xs text-gray-400">{t('profile.aboutExpertiseDesc')}</p>
                      </div>
                    </div>
                    {editing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.description')}</label>
                          <textarea
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y min-h-[100px]"
                            value={form.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder={t('profile.descriptionPlaceholder')}
                            rows={4}
                            maxLength={2000}
                          />
                          <div className="flex justify-between mt-1">
                            {form.description && form.description.length >= 1900 && (
                              <p className="text-xs text-amber-500">{form.description.length}/2000</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.sectors')}</label>
                          <input
                            type="text"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                            value={form.sector}
                            onChange={e => handleChange('sector', e.target.value)}
                            placeholder={t('profile.sectorsPlaceholder')}
                          />
                          <p className="text-xs text-gray-400 mt-1.5">{t('profile.sectorsHint')}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {user.description ? (
                          <p className="text-sm text-gray-700 leading-relaxed">{user.description}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">{t('profile.noDescription')}</p>
                        )}
                        {sectorTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {sectorTags.map((tag, i) => (
                              <span key={i}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100/50">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </section>

                  {/* Edit Actions */}
                  {editing && (
                    <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100">
                      <button
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSave}
                        disabled={saving || !dirty}
                      >
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><FaSave /> {t('profile.saveChanges')}</>
                        )}
                      </button>
                      <button
                        className="px-8 py-3 border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl font-medium text-sm transition-all hover:bg-gray-50 flex items-center gap-2"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        <FaTimes /> {t('profile.cancel')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm">
                      <FaLock className="text-sm" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{t('profile.security')}</h3>
                      <p className="text-xs text-gray-400">{t('profile.securityDesc')}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.newPassword')}</label>
                      <input
                        type="password"
                        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition ${
                          passwordErrors.newPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                        value={passwordForm.newPassword}
                        onChange={e => {
                          setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))
                          setPasswordErrors(prev => ({ ...prev, newPassword: '' }))
                        }}
                        placeholder={t('profile.passwordPlaceholder')}
                      />
                      {passwordForm.newPassword && (
                        <div className="flex gap-3 mt-2 text-[11px]">
                          <span className={`flex items-center gap-1 ${passwordForm.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                            <FaCheckCircle className={passwordForm.newPassword.length >= 8 ? 'opacity-100' : 'opacity-30'} /> {t('profile.passwordLength')}
                          </span>
                          <span className={`flex items-center gap-1 ${/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                            <FaCheckCircle className={/[A-Z]/.test(passwordForm.newPassword) ? 'opacity-100' : 'opacity-30'} /> {t('profile.passwordUppercase')}
                          </span>
                          <span className={`flex items-center gap-1 ${/[0-9]/.test(passwordForm.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                            <FaCheckCircle className={/[0-9]/.test(passwordForm.newPassword) ? 'opacity-100' : 'opacity-30'} /> {t('profile.passwordDigit')}
                          </span>
                        </div>
                      )}
                      {passwordErrors.newPassword && (
                        <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.confirmPassword')}</label>
                      <input
                        type="password"
                        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition ${
                          passwordErrors.confirmPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                        value={passwordForm.confirmPassword}
                        onChange={e => {
                          setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                          setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }))
                        }}
                        placeholder={t('profile.repeatPassword')}
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
                      )}
                    </div>

                    <button
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handlePasswordChange}
                      disabled={passwordSaving || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    >
                      {passwordSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><FaLock /> {t('profile.updatePassword')}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-gray-400 text-xs">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

export default Profile