import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPlus, FaCheck, FaFilter, FaTimes, FaLightbulb, FaGlobeAmericas, FaHeart, FaCity, FaRocket, FaMicrochip, FaShieldAlt, FaLeaf, FaSearch, FaArrowRight } from 'react-icons/fa'
import { toast } from 'react-toastify'
import SearchBar from '../components/SearchBar'
import { useTranslation } from 'react-i18next'

import { API_BASE } from '../config'

const sectors = ['Health', 'EduTech', 'AgriTech', 'Finance', 'Tourism', 'Transportation', 'Energy', 'Environment', 'Cybersecurity', 'Governance', 'Telecommunications', 'Data Science', 'Business Intelligence', 'Other']
const technologies = ['NLP', 'Computer Vision', 'Robotics', 'Machine Learning', 'Deep Learning', 'Speech Recognition', 'Business Intelligence', 'Data Engineering', 'Data Science', 'Generative AI', 'IoT']
const arabCountries = [
  'Algeria', 'Bahrain', 'Comoros', 'Djibouti', 'Egypt', 'Iraq',
  'Jordan', 'Kuwait', 'Lebanon', 'Libya', 'Mauritania', 'Morocco',
  'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Somalia', 'Sudan',
  'Syria', 'Tunisia', 'United Arab Emirates', 'Yemen'
]

const getCountryName = (id, countriesList) => {
  const country = countriesList.find(c => c.id === id)
  return country ? country.country : null
}

const getCountryRegion = (countryName) => {
  const regions = {
    'Morocco': 'North Africa', 'Algeria': 'North Africa', 'Tunisia': 'North Africa', 'Libya': 'North Africa', 'Mauritania': 'North Africa',
    'Egypt': 'MENA', 'Sudan': 'East Africa', 'Somalia': 'East Africa', 'Djibouti': 'East Africa', 'Comoros': 'East Africa',
    'Saudi Arabia': 'Gulf', 'United Arab Emirates': 'Gulf', 'Qatar': 'Gulf', 'Kuwait': 'Gulf', 'Bahrain': 'Gulf', 'Oman': 'Gulf',
    'Jordan': 'Levant', 'Lebanon': 'Levant', 'Palestine': 'Levant', 'Syria': 'Levant', 'Iraq': 'Levant', 'Yemen': 'Levant'
  }
  return regions[countryName] || 'Arab Region'
}

const getSectorInfo = (sector) => {
  const map = {
    'Health':       { class: 'health', icon: <FaHeart /> },
    'EduTech':      { class: 'edu',    icon: <FaLightbulb /> },
    'Education':    { class: 'edu',    icon: <FaLightbulb /> },
    'AgriTech':     { class: 'agri',   icon: <FaGlobeAmericas /> },
    'Agriculture':  { class: 'agri',   icon: <FaGlobeAmericas /> },
    'Finance':      { class: 'fin',    icon: <FaCity /> },
    'Transportation': { class: 'trans',  icon: <FaRocket /> },
    'Energy':       { class: 'energy', icon: <FaLightbulb /> },
    'Environment':  { class: 'env',    icon: <FaLeaf /> },
    'Cybersecurity':{ class: 'security',icon: <FaShieldAlt /> },
    'Security':     { class: 'security', icon: <FaShieldAlt /> },
    'Governance':   { class: 'gov',   icon: <FaCity /> },
    'Telecommunications': { class: 'telecom', icon: <FaRocket /> },
    'SmartCities':  { class: 'fin', icon: <FaCity /> },
    'Industry':     { class: 'trans', icon: <FaRocket /> },
    'Business Intelligence': { class: 'fin', icon: <FaCity /> },
    'Tourism':     { class: 'trans', icon: <FaGlobeAmericas /> },
    'Data Science': { class: 'edu', icon: <FaMicrochip /> },
    'Other':       { class: 'default', icon: <FaMicrochip /> }
  }
  return map[sector] || { class: 'default', icon: <FaMicrochip /> }
}

function ProjectStocktaking() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState([])
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '', description: '', start_date: '', end_date: '', status: 'ongoing',
    sector: '', technology: '', sdg_id: '', country_id: '',
    files: []
  })
  const [user, setUser] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [allStakeholders, setAllStakeholders] = useState([])
  const [selectedStakeholders, setSelectedStakeholders] = useState([])
  const [showAddStakeholder, setShowAddStakeholder] = useState(false)
  const [newStakeholder, setNewStakeholder] = useState({ name: '', type: '', country: '', website: '', contact_email: '' })
  const [sdgList, setSdgList] = useState([])
  const [filterCountry, setFilterCountry] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterSdg, setFilterSdg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [stakeholderSearch, setStakeholderSearch] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchProjects()
    fetchCountries()
    fetchStakeholders()
    fetchSdgs()
    checkAuth()
  }, [filterCountry, filterSector, filterSdg, searchQuery, page])

  const fetchStakeholders = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/stakeholders/`)
      if (response.ok) setAllStakeholders(await response.json())
    } catch (err) { console.error('Failed to fetch stakeholders:', err) }
  }

  const checkAuth = () => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (storedUser && token) {
      try { setUser(JSON.parse(storedUser)) } catch { setUser(null) }
    }
  }

  const fetchSdgs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sdgs/`)
      if (response.ok) setSdgList(await response.json())
    } catch (err) { console.error('Failed to fetch SDGs:', err) }
  }

  const fetchCountries = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/countries/`)
      if (response.ok) setCountries(await response.json())
    } catch (err) { console.error('Failed to fetch countries:', err) }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (page) params.set('page', page)
      if (searchQuery) params.set('search', searchQuery)
      if (filterCountry) params.set('country', filterCountry)
      if (filterSector) params.set('sector', filterSector)
      if (filterSdg) params.set('sdg', filterSdg)
      const response = await fetch(`${API_BASE}/api/projects/?${params}`)
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      setProjects(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
      setError(null)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleFileChange = (e) => {
    setFormData({ ...formData, files: Array.from(e.target.files) })
  }

  const extractFromUrl = async () => {
    if (!linkedinUrl.trim()) return
    setExtracting(true)
    setExtractedData(null)
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    let user = null
    try { user = JSON.parse(storedUser) } catch {}
    try {
      const res = await fetch(`${API_BASE}/api/projects/extract-from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url: linkedinUrl.trim(),
          user_country: user?.country || '',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || 'Extraction failed')
        return
      }
      const data = await res.json()
      if (!data.extracted) {
        toast.error(data.error || 'Could not extract project info')
        return
      }
      setExtractedData(data.fields)
      const f = data.fields
      const countryId = countries.find(
        c => c.country.toLowerCase() === (f.country?.value || '').toLowerCase()
      )?.id || ''
      const sdgArr = Array.isArray(f.sdg_alignment?.value) ? f.sdg_alignment.value : []
      const sdgId = sdgArr.length > 0
        ? sdgList.find(s => s.goal_number === sdgArr[0])?.id || ''
        : ''
      setFormData(prev => ({
        ...prev,
        title: f.title?.value && f.title.value !== 'Non détecté' ? f.title.value : prev.title,
        description: f.description?.value && f.description.value !== 'Non détecté' ? f.description.value : prev.description,
        sector: f.primary_sector?.value && sectors.includes(f.primary_sector.value) ? f.primary_sector.value : prev.sector,
        technology: f.core_ai_technology?.value && technologies.includes(f.core_ai_technology.value) ? f.core_ai_technology.value : prev.technology,
        country_id: countryId || prev.country_id,
        sdg_id: sdgId || prev.sdg_id,
      }))
      toast.success('Project info extracted successfully!')
    } catch (err) {
      toast.error('Extraction failed: ' + err.message)
    } finally {
      setExtracting(false)
    }
  }

  const getConfidenceColor = (score) => {
    if (score >= 0.7) return { bg: '#dcfce7', color: '#166534', text: 'High' }
    if (score >= 0.4) return { bg: '#fef9c3', color: '#854d0e', text: 'Medium' }
    return { bg: '#fee2e2', color: '#991b1b', text: 'Low' }
  }

  const isAutoFilled = (field) => {
    return extractedData && extractedData[field]?.value && extractedData[field].value !== 'Non détecté'
  }

  const resetExtraction = () => {
    setExtractedData(null)
    setLinkedinUrl('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (!token) { toast.error(t('projects.pleaseLogin')); return }
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    let userId = null
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser)
        userId = u.id
      } catch {}
    }
    if (!userId) { toast.error(t('projects.userInfoNotFound')); return }

    try {
      const projectData = {
        title: formData.title,
        country_id: formData.country_id ? parseInt(formData.country_id) : null,
        sector: formData.sector,
        ai_technology: formData.technology,
        user_id: userId,
        status: 'pending',
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      }
      if (formData.description) projectData.description = formData.description
      if (formData.sdg_id) projectData.sdg_id = parseInt(formData.sdg_id)

      const response = await fetch(`${API_BASE}/api/projects/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(projectData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        let message = t('projects.failedToSubmit')
        if (response.status === 422 && Array.isArray(errorData.detail)) {
          message = errorData.detail.map(e => `${e.loc?.join('.') || 'field'}: ${e.msg}`).join('\n')
        } else if (typeof errorData.detail === 'string') {
          message = errorData.detail
        }
        throw new Error(message)
      }

      const project = await response.json()

      if (formData.files && formData.files.length > 0) {
        const fileFormData = new FormData()
        formData.files.forEach(file => {
          fileFormData.append('files', file)
        })

        try {
          await fetch(`${API_BASE}/api/projects/${project.id}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fileFormData
          })
        } catch (err) {
          console.error('Failed to upload files:', err)
          toast.warning(t('projects.fileUploadFailed'))
        }
      }

      for (const s of selectedStakeholders) {
        try {
          const linkRes = await fetch(`${API_BASE}/api/projects/${project.id}/stakeholders/${s.stakeholder_id}?role=${s.role}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (!linkRes.ok) {
            const linkErr = await linkRes.json().catch(() => ({}))
            console.error(`Failed to link stakeholder ${s.stakeholder_id}:`, linkErr.detail || linkRes.statusText)
          }
        } catch (err) {
          console.error(`Failed to link stakeholder ${s.stakeholder_id}:`, err)
        }
      }

      toast.success(t('projects.submittedForModeration'), {
        icon: '🚀'
      })
      setShowForm(false)
      setSelectedStakeholders([])
      setExtractedData(null)
      setLinkedinUrl('')
      setFormData({
        title: '', description: '', start_date: '', end_date: '', status: 'ongoing',
        sector: '', technology: '', sdg_id: '', country_id: '',
        files: []
      })
      fetchProjects()
    } catch (err) {
      console.error('Error creating project:', err)
      toast.error(t('projects.errorPrefix') + err.message)
    }
  }

  const toggleStakeholder = (stakeholderId) => {
    setSelectedStakeholders(prev =>
      prev.some(s => s.stakeholder_id === stakeholderId)
        ? prev.filter(s => s.stakeholder_id !== stakeholderId)
        : [...prev, { stakeholder_id: stakeholderId, role: 'partner' }]
    )
  }

  const updateStakeholderRole = (stakeholderId, role) => {
    setSelectedStakeholders(prev =>
      prev.map(s => s.stakeholder_id === stakeholderId ? { ...s, role } : s)
    )
  }

  const handleNewStakeholderChange = (e) => {
    setNewStakeholder({ ...newStakeholder, [e.target.name]: e.target.value })
  }

  const addNewStakeholder = async () => {
    if (!newStakeholder.name.trim() || !newStakeholder.type) {
      toast.warning(t('projects.fillRequiredFields'))
      return
    }
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    try {
      const res = await fetch(`${API_BASE}/api/stakeholders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newStakeholder)
      })
      if (!res.ok) throw new Error(t('projects.failedCreateStakeholder'))
      const created = await res.json()
      
      setAllStakeholders(prev => [created, ...prev])
      setSelectedStakeholders(prev => [...prev, { stakeholder_id: created.id, role: 'partner' }])
      
      setNewStakeholder({ name: '', type: '', country: '', website: '', contact_email: '' })
      setShowAddStakeholder(false)
      toast.success(t('projects.orgCreatedAndAdded'))
    } catch (err) {
      toast.error(t('projects.errorPrefix') + err.message)
    }
  }

  const clearFilters = () => { setFilterCountry(''); setFilterSector(''); setFilterSdg(''); setSearchQuery(''); setPage(1) }

  const formatDate = (dateStr) => {
    if (!dateStr) return t('projects.ongoing')
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  return (
    <div className="modern-projects">
      <section className="projects-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        
        <div className="container hero-container">
          <div className="hero-content animate-up">
            <div className="hero-badge">
              <FaRocket />
              <span>{t('projects.regionalActivity')}</span>
            </div>
            <h1>{t('projects.heroTitle')} <span className="text-gradient">{t('projects.heroTitleGradient')}</span></h1>
            <p>{t('projects.heroDesc')}</p>
          </div>
        </div>
      </section>

      <section className="projects-body">
        <div className="container">
          <div className="projects-action-bar animate-up delay-1">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('projects.searchPlaceholder')}
            />
            
            <div className="action-buttons">
              <button className={`filter-btn ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}>
                <FaFilter /> {t('projects.filters')}
                {(filterCountry || filterSector || filterSdg) && <span className="badge-dot"></span>}
              </button>
              
              {user && (
                <button className="submit-btn" onClick={() => setShowForm(!showForm)}>
                  <FaPlus /> {showForm ? t('projects.closeForm') : t('projects.submitProject')}
                </button>
              )}
            </div>
          </div>

          {filtersOpen && (
            <div className="modern-filters-panel animate-up">
              <div className="filters-grid">
                <div className="filter-item">
                  <label>{t('projects.country')}</label>
                  <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                    <option value="">{t('projects.allCountries')}</option>
                    {arabCountries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <label>{t('projects.sector')}</label>
                  <select value={filterSector} onChange={e => setFilterSector(e.target.value)}>
                    <option value="">{t('projects.allSectors')}</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <label>{t('projects.sdgAlignment')}</label>
                  <select value={filterSdg} onChange={e => setFilterSdg(e.target.value)}>
                    <option value="">{t('projects.allSdgs')}</option>
                    {sdgList.map(s => <option key={s.id} value={s.id}>SDG {s.goal_number}: {s.title}</option>)}
                  </select>
                </div>
              </div>
              <button className="clear-filters-link" onClick={clearFilters}>{t('projects.resetAllFilters')}</button>
            </div>
          )}

          {showForm && user && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal-content modal-project-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3><span className="text-gradient">{t('projects.shareInitiative')}</span></h3>
                  <button className="close-btn" onClick={() => setShowForm(false)}><FaTimes /></button>
                </div>

                <div className="form-header">
                  <div className="form-step-indicator">
                    <span className="step-dot active"></span>
                    <span className="step-line"></span>
                    <span className="step-dot"></span>
                    <span className="step-line"></span>
                    <span className="step-dot"></span>
                  </div>
                  <p>{t('projects.shareInitiativeDesc')}</p>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                <div className="extract-url-section">
                  <div className="extract-url-row">
                    <input
                      type="url"
                      className="extract-url-input"
                      placeholder="Paste LinkedIn post URL to auto-extract project info..."
                      value={linkedinUrl}
                      onChange={e => setLinkedinUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="extract-btn"
                      onClick={extractFromUrl}
                      disabled={extracting || !linkedinUrl.trim()}
                    >
                      {extracting ? <span className="extract-spinner"></span> : 'Extract'}
                    </button>
                    {extractedData && (
                      <button type="button" className="extract-clear-btn" onClick={resetExtraction} title="Clear extraction">
                        ✕
                      </button>
                    )}
                  </div>
                  {extractedData && (
                    <div className="extract-summary">
                      <span className="extract-badge success">AI extracted</span>
                      <span className="extract-hint">Form fields have been pre-filled. Review and adjust below.</span>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <div className="section-heading">
                    <span className="section-step">01</span>
                    <div>
                      <h4>{t('projects.basicInfo')}</h4>
                      <p>{t('projects.basicInfoDesc')}</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>{t('projects.projectTitle')} <span className="required-star">*</span></label>
                      <div className="field-input-row">
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder={t('projects.titlePlaceholder')} />
                        {isAutoFilled('title') && (() => {
                          const c = getConfidenceColor(extractedData.title.confidence)
                          return <span className="conf-badge" style={{ background: c.bg, color: c.color }} title={`Confidence: ${Math.round(extractedData.title.confidence * 100)}%`}>{c.text}</span>
                        })()}
                      </div>
                    </div>
                    <div className="field">
                      <label>{t('projects.startDate')}</label>
                      <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                    </div>
                    <div className="field">
                      <label>{t('projects.endDate')}</label>
                      <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
                    </div>
                    <div className="field">
                      <label>{t('projects.targetCountry')}</label>
                      <div className="field-input-row">
                        <select name="country_id" value={formData.country_id} onChange={handleChange}>
                          <option value="">{t('projects.selectCountry')}</option>
                          {countries.map(c => <option key={c.id} value={c.id}>{c.country}</option>)}
                        </select>
                        {isAutoFilled('country') && (() => {
                          const c = getConfidenceColor(extractedData.country.confidence)
                          return <span className="conf-badge" style={{ background: c.bg, color: c.color }}>{c.text}</span>
                        })()}
                      </div>
                    </div>
                    <div className="field">
                      <label>{t('projects.primarySector')} <span className="required-star">*</span></label>
                      <div className="field-input-row">
                        <select name="sector" value={formData.sector} onChange={handleChange} required>
                          <option value="">{t('projects.selectSector')}</option>
                          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {isAutoFilled('primary_sector') && (() => {
                          const c = getConfidenceColor(extractedData.primary_sector.confidence)
                          return <span className="conf-badge" style={{ background: c.bg, color: c.color }}>{c.text}</span>
                        })()}
                      </div>
                    </div>
                    <div className="field">
                      <label>{t('projects.coreTechnology')} <span className="required-star">*</span></label>
                      <div className="field-input-row">
                        <select name="technology" value={formData.technology} onChange={handleChange} required>
                          <option value="">{t('projects.selectTechnology')}</option>
                          {technologies.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {isAutoFilled('core_ai_technology') && (() => {
                          const c = getConfidenceColor(extractedData.core_ai_technology.confidence)
                          return <span className="conf-badge" style={{ background: c.bg, color: c.color }}>{c.text}</span>
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-heading">
                    <span className="section-step">02</span>
                    <div>
                      <h4>{t('projects.projectDetails')}</h4>
                      <p>{t('projects.projectDetailsDesc')}</p>
                    </div>
                  </div>

                  <div className="field full">
                    <label>{t('projects.projectDescription')} <span className="required-star">*</span></label>
                    <div className="field-input-row">
                      <textarea name="description" value={formData.description} onChange={handleChange} required rows="5" placeholder={t('projects.describeProject')}></textarea>
                      {isAutoFilled('description') && (() => {
                        const c = getConfidenceColor(extractedData.description.confidence)
                        return <span className="conf-badge" style={{ background: c.bg, color: c.color }}>{c.text}</span>
                      })()}
                    </div>
                  </div>

                  <div className="field full">
                    <label>{t('projects.sdgAlignment')}</label>
                    <div className="field-input-row">
                      <select name="sdg_id" value={formData.sdg_id} onChange={handleChange}>
                        <option value="">{t('projects.selectSdg')}</option>
                        {sdgList.map(s => <option key={s.id} value={s.id}>SDG {s.goal_number}: {s.title}</option>)}
                      </select>
                      {isAutoFilled('sdg_alignment') && (() => {
                        const c = getConfidenceColor(extractedData.sdg_alignment.confidence)
                        return <span className="conf-badge" style={{ background: c.bg, color: c.color }}>{c.text}</span>
                      })()}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-heading">
                    <span className="section-step">03</span>
                    <div>
                      <h4>{t('projects.attachmentsStakeholders')}</h4>
                      <p>{t('projects.attachmentsStakeholdersDesc')}</p>
                    </div>
                  </div>

                  <div className="field full">
                    <label>{t('projects.attachments')}</label>
                    <div className="file-upload-wrapper">
                      <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        className="file-input-hidden"
                        id="project-files"
                      />
                      <label htmlFor="project-files" className="file-upload-label">
                        <FaPlus className="upload-icon" />
                        <span>{formData.files.length > 0 ? t('projects.filesSelected', { count: formData.files.length }) : t('projects.clickToSelectFiles')}</span>
                      </label>
                      {formData.files.length > 0 && (
                        <div className="file-preview-list">
                          {formData.files.map((f, idx) => (
                            <div key={idx} className="file-preview-item">
                              <span className="file-name">{f.name}</span>
                              <span className="file-size">({(f.size / 1024).toFixed(1)} KB)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="field full stakeholders-field">
                    <label>{t('projects.projectStakeholders')} <span className="required-star">*</span></label>
                    <p className="field-hint">{t('projects.stakeholdersHint')}</p>
                    
                    <div className="multi-choice-container">
                      <div className="list-search-wrapper">
                        <FaSearch className="search-icon" />
                        <input 
                          type="text" 
                          placeholder={t('projects.filterOrganizations')} 
                          value={stakeholderSearch}
                          onChange={(e) => setStakeholderSearch(e.target.value)}
                        />
                        {selectedStakeholders.length > 0 && (
                          <span className="selected-count-badge">{t('projects.selectedCount', { count: selectedStakeholders.length })}</span>
                        )}
                      </div>

                      <div className="stakeholders-multi-list">
                        {allStakeholders
                          .filter(s => s.name.toLowerCase().includes(stakeholderSearch.toLowerCase()))
                          .map(s => {
                            const isSelected = selectedStakeholders.some(ss => ss.stakeholder_id === s.id)
                            return (
                              <div key={s.id} className={`list-choice-item ${isSelected ? 'selected' : ''}`}>
                                <div className="item-main-info" onClick={() => toggleStakeholder(s.id)}>
                                  <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <FaCheck />}
                                  </div>
                                  <div className="org-details">
                                    <span className="org-name">{s.name}</span>
                                    <span className="org-meta">{s.type} · {s.country}</span>
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="role-picker">
                                    <label>{t('projects.role')}</label>
                                    <select 
                                      value={selectedStakeholders.find(ss => ss.stakeholder_id === s.id)?.role || 'partner'}
                                      onChange={(e) => updateStakeholderRole(s.id, e.target.value)}
                                    >
                                      <option value="partner">{t('projects.rolePartner')}</option>
                                      <option value="developer">{t('projects.roleDeveloper')}</option>
                                      <option value="research">{t('projects.roleResearch')}</option>
                                      <option value="funding">{t('projects.roleFunding')}</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        {allStakeholders.filter(s => s.name.toLowerCase().includes(stakeholderSearch.toLowerCase())).length === 0 && (
                          <div className="no-results-msg">{t('projects.noOrganizations')}</div>
                        )}
                      </div>

                      <div className="list-footer">
                        <button type="button" className="btn-create-new" onClick={() => setShowAddStakeholder(true)}>
                          <FaPlus /> {t('projects.createNewOrg')}
                        </button>
                      </div>
                    </div>

                    {showAddStakeholder && (
                      <div className="new-stakeholder-modal-overlay">
                        <div className="new-stakeholder-modal">
                          <div className="modal-header">
                            <h3>{t('projects.createOrgTitle')}</h3>
                            <button type="button" className="close-btn" onClick={() => setShowAddStakeholder(false)}><FaTimes /></button>
                          </div>
                          <div className="modal-body">
                            <div className="form-grid-mini">
                              <div className="field">
                                <label>{t('projects.name')} <span className="required-star">*</span></label>
                                <input name="name" value={newStakeholder.name} onChange={handleNewStakeholderChange} placeholder={t('projects.orgNamePlaceholder')} required />
                              </div>
                              <div className="field">
                                <label>{t('projects.type')} <span className="required-star">*</span></label>
                                <select name="type" value={newStakeholder.type} onChange={handleNewStakeholderChange} required>
                                  <option value="">{t('projects.selectType')}</option>
                                  <option value="business">{t('projects.orgBusiness')}</option>
                                  <option value="university">{t('projects.orgUniversity')}</option>
                                  <option value="government">{t('projects.orgGovernment')}</option>
                                  <option value="NGO">{t('projects.orgNgo')}</option>
                                  <option value="lab">{t('projects.orgResearchLab')}</option>
                                  <option value="company">{t('projects.orgCompany')}</option>
                                </select>
                              </div>
                              <div className="field">
                                <label>{t('projects.country')}</label>
                                <input name="country" value={newStakeholder.country} onChange={handleNewStakeholderChange} placeholder={t('projects.countryPlaceholder')} />
                              </div>
                              <div className="field">
                                <label>{t('projects.websiteLabel')}</label>
                                <input name="website" value={newStakeholder.website} onChange={handleNewStakeholderChange} placeholder={t('projects.websitePlaceholder')} />
                              </div>
                            </div>
                          </div>
                          <div className="modal-footer">
                            <button type="button" className="cancel-btn" onClick={() => setShowAddStakeholder(false)}>{t('projects.cancel')}</button>
                            <button type="button" className="add-btn" onClick={addNewStakeholder}>{t('projects.createAndAdd')}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>{t('projects.discard')}</button>
                  <button type="submit" className="submit-action-btn">{t('projects.submitInitiative')} <FaArrowRight /></button>
                </div>
              </form>
              </div>
            </div>
          )}

          <div className="results-grid animate-up delay-2">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{t('projects.loading')}</p>
              </div>
            ) : projects.length > 0 ? (
              <div className="modern-projects-grid">
                {projects.map((p, i) => {
                  const info = getSectorInfo(p.sector)
                  const countryName = getCountryName(p.country_id, countries) || t('projects.regional')
                  const region = getCountryRegion(countryName)
                  return (
                    <div key={p.id} className="modern-project-card" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="card-top">
                        <div className={`sector-icon-box ${info.class}`}>
                          {info.icon}
                        </div>
                        <span className="status-dot-badge">
                          <span className={`dot ${p.status}`}></span>
                          {p.status || t('projects.status_active')}
                        </span>
                      </div>
                      
                      <div className="card-mid">
                        <span className="sector-text">{p.sector}</span>
                        <h3>{p.title}</h3>
                        <p className="project-dates">
                          {formatDate(p.start_date)} — {formatDate(p.end_date)}
                        </p>
                        <p className="country-tag">{countryName} · {region}</p>
                      </div>

                      <div className="stakeholders-list">
                        <div className="stakeholder-avatars">
                          {p.stakeholders && p.stakeholders.slice(0, 3).map((assoc, idx) => (
                            <div key={idx} className="stakeholder-tag" title={assoc.stakeholder?.name}>
                              {assoc.stakeholder?.name?.substring(0, 2).toUpperCase() || 'NA'}
                            </div>
                          ))}
                          {p.stakeholders && p.stakeholders.length > 3 && (
                            <div className="stakeholder-tag more">+{p.stakeholders.length - 3}</div>
                          )}
                        </div>
                        <span className="stakeholder-count">
                          {p.stakeholders?.length || 0} {t('projects.stakeholders')}
                        </span>
                      </div>

                      <div className="card-bottom">
                        <div className="meta-info">
                          <div className="meta-col">
                            <span className="meta-label">{t('projects.technology')}</span>
                            <span className="meta-value">{p.technology}</span>
                          </div>
                        </div>
                        <div className="sdg-badge">
                          {p.sdg ? `SDG${p.sdg.goal_number}` : t('projects.n/a')}
                        </div>
                      </div>

                      <div className="card-actions">
                        <Link to={`/projects/${p.id}`} className="learn-more-btn">
                          {t('projects.seeMore')} <FaArrowRight />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="no-results-card">
                <div className="no-results-icon">🚀</div>
                <h3>{t('projects.noProjects')}</h3>
                <p>{t('projects.noProjectsHint')}</p>
                <button className="reset-btn" onClick={clearFilters}>{t('projects.resetFilters')}</button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="search-pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="pag-ellipsis">...</span>}
                      <button
                        className={`pag-btn ${page === p ? 'active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .modern-projects {
          --p-primary: #2563eb;
          --p-secondary: #0f172a;
          --p-text: #1e293b;
          --p-text-light: #64748b;
          
          font-family: 'Outfit', sans-serif;
          color: var(--p-text);
          background: #fff;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .projects-hero {
          position: relative;
          padding: 120px 0 80px;
          background: #fff;
          overflow: hidden;
          text-align: center;
        }

        .animated-blobs {
          position: absolute;
          width: 100%; height: 100%;
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

        .projects-hero h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
        }

        .text-gradient {
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .projects-hero p {
          font-size: 1.2rem;
          color: var(--p-text-light);
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .projects-body { padding-bottom: 100px; }

        .projects-action-bar {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 24px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
          margin-bottom: 40px;
          margin-top: -30px;
          position: relative;
          z-index: 10;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          padding-right: 8px;
        }

        .filter-btn, .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.3s;
          border: none;
          font-family: inherit;
        }

        .filter-btn {
          background: #f8fafc;
          color: var(--p-secondary);
          border: 1px solid #f1f5f9;
          position: relative;
        }
        .filter-btn.active { background: #eff6ff; border-color: #bfdbfe; color: var(--p-primary); }
        .badge-dot { width: 8px; height: 8px; background: var(--p-primary); border-radius: 50%; }

        .submit-btn { background: var(--p-secondary); color: #fff; }
        .submit-btn:hover { background: #1e293b; transform: translateY(-2px); }

        .modern-filters-panel {
          background: #f8fafc;
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid #f1f5f9;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .filter-item label { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--p-text-light); margin-bottom: 8px; letter-spacing: 0.5px; }
        .filter-item select {
          width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: #fff;
          font-weight: 600; outline: none; cursor: pointer; font-family: inherit;
        }

        .clear-filters-link {
          margin-top: 16px; background: none; border: none; color: var(--p-primary); font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 0;
        }

        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 20px;
        }
        .modal-content {
          background: #fff; width: 100%; max-width: 800px;
          border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden; animation: fadeUp 0.3s ease;
          max-height: 90vh; overflow-y: auto;
        }
        .modal-project-content { max-width: 800px; }
        .modal-header {
          padding: 24px 32px; display: flex; justify-content: space-between;
          align-items: center; border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0; }
        .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--p-text-light); padding: 4px; }
        .close-btn:hover { color: var(--p-secondary); }

        .form-header {
          text-align: center;
          padding: 24px 32px 0;
        }
        .form-header p { color: var(--p-text-light); font-size: 0.95rem; }

        .form-step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 24px;
        }
        .step-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #e2e8f0;
          transition: 0.3s;
        }
        .step-dot.active { background: var(--p-primary); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15); }
        .step-line {
          width: 48px; height: 2px;
          background: #e2e8f0;
          margin: 0 8px;
        }

        .form-section {
          margin-bottom: 36px;
          padding: 28px;
          background: #fafbfc;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          animation: fadeUp 0.4s ease both;
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .section-step {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .section-heading h4 { font-size: 1.15rem; font-weight: 800; margin: 0 0 2px; }
        .section-heading p { font-size: 0.85rem; color: var(--p-text-light); margin: 0; }

        .modal-form { padding: 24px 32px; display: flex; flex-direction: column; gap: 16px; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field.full { grid-column: span 2; }
        .field label { font-weight: 700; font-size: 0.85rem; color: var(--p-secondary); }
        .required-star { color: #ef4444; }

        .field input, .field select, .field textarea {
          padding: 14px 18px; border-radius: 14px; border: 2px solid #e2e8f0; background: #fff;
          font-family: inherit; font-size: 0.95rem; outline: none; transition: 0.2s;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: var(--p-primary); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
        }

        .modal-footer {
          padding: 16px 32px 24px;
          display: flex; justify-content: flex-end; gap: 12px;
          background: #f8fafc;
        }
        .cancel-btn {
          background: #f8fafc; border: none; padding: 12px 24px;
          border-radius: 12px; font-weight: 700; cursor: pointer; color: var(--p-text-light); font-family: inherit;
        }
        .cancel-btn:hover { background: #f1f5f9; }
        .submit-action-btn {
          background: var(--p-primary); color: #fff; border: none;
          padding: 12px 24px; border-radius: 12px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: 0.2s; font-family: inherit;
        }
        .submit-action-btn:hover { background: #1d4ed8; }

        .selected-count-badge {
          background: #eff6ff;
          color: var(--p-primary);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          white-space: nowrap;
        }

        .modern-projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        .modern-project-card {
          background: #fff;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: 0.3s;
          animation: fadeUp 0.5s ease both;
        }
        .modern-project-card:hover { transform: translateY(-5px); border-color: #e2e8f0; box-shadow: 0 20px 40px rgba(0,0,0,0.03); }

        .card-top { display: flex; justify-content: space-between; align-items: center; }
        .sector-icon-box {
          width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
        }
        .status-dot-badge {
          display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--p-text-light);
          padding: 4px 12px; background: #f8fafc; border-radius: 100px;
        }
        .status-dot-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
        .status-dot-badge .dot.active { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }

        .card-mid .sector-text { font-size: 0.75rem; font-weight: 700; color: var(--p-primary); text-transform: uppercase; letter-spacing: 1px; }
        .card-mid h3 { font-size: 1.25rem; font-weight: 800; margin: 8px 0 4px; line-height: 1.3; }

        .stakeholder-avatars { display: flex; gap: 6px; }
        .stakeholder-tag {
          width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; color: #475569;
          display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800;
          border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .stakeholder-tag.more { background: var(--p-primary); color: #fff; }
        .stakeholder-count { font-size: 0.8rem; color: var(--p-text-light); }

        .card-bottom {
          margin-top: auto; padding-top: 20px; border-top: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .meta-info { display: flex; gap: 20px; }
        .meta-col { display: flex; flex-direction: column; gap: 4px; }
        .meta-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--p-text-light); letter-spacing: 0.5px; }
        .meta-value { font-size: 0.85rem; font-weight: 700; color: var(--p-secondary); }
        .sdg-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; color: var(--p-secondary); }

        .card-actions {
          margin-top: 12px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
        }

        .learn-more-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px;
          background: #f8fafc;
          color: var(--p-primary);
          border-radius: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: 0.3s;
          border: 1.5px solid #e2e8f0;
        }
        .learn-more-btn:hover {
          background: var(--p-primary);
          color: #fff;
          border-color: var(--p-primary);
          transform: translateY(-2px);
        }

        .edu { background: #eff6ff; color: #3b82f6; }
        .agri { background: #ecfdf5; color: #10b981; }
        .health { background: #fef2f2; color: #ef4444; }
        .fin { background: #f5f3ff; color: #8b5cf6; }
        .trans { background: #fff7ed; color: #f97316; }
        .energy { background: #fffbeb; color: #f59e0b; }
        .env { background: #f0fdf4; color: #22c55e; }
        .security { background: #f8fafc; color: #475569; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: var(--p-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state { text-align: center; padding: 60px 0; }
        .no-results-card { text-align: center; background: #fff; padding: 60px; border-radius: 32px; border: 1px solid #f1f5f9; }
        .no-results-icon { font-size: 3rem; margin-bottom: 16px; }
        .reset-btn { margin-top: 24px; background: var(--p-primary); color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; }

        .multi-choice-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
        }

        .list-search-wrapper {
          padding: 16px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .list-search-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: 0.95rem;
        }

        .stakeholders-multi-list {
          max-height: 350px;
          overflow-y: auto;
          background: #fff;
        }

        .list-choice-item {
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid #f1f5f9;
          transition: 0.2s;
        }
        .list-choice-item:hover { background: #f8fafc; }
        .list-choice-item.selected { background: #eff6ff; }

        .item-main-info {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
        }

        .custom-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #fff;
          font-size: 0.7rem;
          transition: 0.2s;
        }
        .custom-checkbox.checked {
          background: var(--p-primary);
          border-color: var(--p-primary);
        }

        .org-details { display: flex; flex-direction: column; }
        .org-name { font-weight: 700; color: var(--p-secondary); font-size: 0.95rem; }
        .org-meta { font-size: 0.75rem; color: var(--p-text-light); }

        .role-picker {
          padding: 8px 16px 16px 54px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: fadeUp 0.2s ease;
        }
        .role-picker label { font-size: 0.75rem; font-weight: 800; color: var(--p-text-light); text-transform: uppercase; }
        .role-picker select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #bfdbfe;
          background: #fff;
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--p-primary);
          outline: none;
        }

        .no-results-msg { padding: 32px; text-align: center; color: var(--p-text-light); font-size: 0.9rem; }

        .list-footer {
          padding: 12px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }
        .btn-create-new {
          background: none;
          border: none;
          color: var(--p-primary);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 auto;
        }

        .new-stakeholder-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }
        .new-stakeholder-modal {
          background: #fff;
          width: 100%;
          max-width: 500px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden;
          animation: fadeUp 0.3s ease;
        }
        .modal-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0; }
        .modal-body { padding: 24px; }
        .form-grid-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .modal-footer {
          padding: 16px 24px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
        }
        .close-btn {
          background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; padding: 4px;
        }
        .close-btn:hover { color: var(--p-secondary); }
        .add-btn {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff; border: none; padding: 12px 24px; border-radius: 12px;
          font-weight: 700; cursor: pointer; font-family: inherit; transition: 0.2s;
        }
        .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); }

        .field-input-row { display: flex; gap: 8px; align-items: flex-start; }
        .field-input-row input, .field-input-row select, .field-input-row textarea { flex: 1; }
        .conf-badge {
          padding: 2px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 800;
          text-transform: uppercase; white-space: nowrap; margin-top: 2px; flex-shrink: 0;
        }
        .extract-url-section {
          background: linear-gradient(135deg, #f0f4ff, #e8f0fe);
          border: 1.5px solid #bfdbfe;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .extract-url-row { display: flex; gap: 8px; align-items: center; }
        .extract-url-input {
          flex: 1; padding: 12px 16px; border-radius: 12px; border: 2px solid #bfdbfe;
          font-family: inherit; font-size: 0.9rem; outline: none; transition: 0.2s; background: #fff;
        }
        .extract-url-input:focus { border-color: var(--p-primary); box-shadow: 0 0 0 4px rgba(37,99,235,0.08); }
        .extract-btn {
          padding: 12px 20px; border-radius: 12px; border: none; background: var(--p-primary); color: #fff;
          font-weight: 700; font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .extract-btn:hover { background: #1d4ed8; }
        .extract-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .extract-clear-btn {
          background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 8px;
        }
        .extract-clear-btn:hover { color: var(--p-secondary); }
        .extract-spinner {
          display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
        }
        .extract-summary {
          display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 10px;
          border-top: 1px solid #bfdbfe;
        }
        .extract-badge {
          padding: 2px 10px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
        }
        .extract-badge.success { background: #dcfce7; color: #166534; }
        .extract-hint { font-size: 0.8rem; color: #475569; }

        .field-hint { font-size: 0.85rem; color: var(--p-text-light); margin-bottom: 16px; margin-top: -8px; }

        .file-upload-wrapper {
          background: #f8fafc;
          border: 2px dashed #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          transition: 0.3s;
        }
        .file-upload-wrapper:hover { border-color: var(--p-primary); background: #eff6ff; }
        .file-input-hidden { display: none; }
        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--p-text-light);
          font-weight: 600;
        }
        .upload-icon { font-size: 1.5rem; color: var(--p-primary); }
        .file-preview-list {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }
        .file-preview-item {
          background: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }
        .file-name { font-weight: 600; color: var(--p-secondary); }
        .file-size { color: var(--p-text-light); }

        .search-pagination {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-top: 32px;
          padding: 16px 0;
        }
        .pag-btn {
          width: 36px; height: 36px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          font-size: 0.85rem; font-weight: 600;
          color: #64748b;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s;
        }
        .pag-btn:hover { border-color: #2563eb; color: #2563eb; }
        .pag-btn.active {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff;
          border-color: transparent;
        }
        .pag-ellipsis {
          padding: 0 4px;
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
        }
        @media (max-width: 1024px) {
          .projects-action-bar { flex-direction: column; padding: 16px; }
          .filters-grid { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
          .field.full { grid-column: span 1; }
          .modal-content { max-width: 95vw; }
          .form-section { padding: 20px; }
          .step-line { width: 24px; }
        }
        @media (max-width: 600px) {
          .modal-content { max-width: 100vw; border-radius: 16px; }
          .modal-header { padding: 16px 20px; }
          .form-header { padding: 16px 20px 0; }
          .modal-form { padding: 16px 20px; }
          .modal-footer { padding: 12px 20px 16px; flex-direction: column-reverse; }
          .modal-footer button { width: 100%; justify-content: center; }
          .section-heading { flex-direction: column; align-items: flex-start; gap: 10px; }
          .form-step-indicator { display: none; }
        }
      `}</style>
    </div>
  )
}

export default ProjectStocktaking
