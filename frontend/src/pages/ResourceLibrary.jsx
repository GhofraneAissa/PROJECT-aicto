import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FaFileAlt, FaDatabase, FaDownload, FaFileContract, FaFileCode, FaChartLine, FaTimes, FaPlus, FaFilter, FaBook, FaGlobe, FaSearch, FaEdit, FaTrash, FaSpinner } from 'react-icons/fa'
import { toast } from 'react-toastify'
import SearchBar from '../components/SearchBar'
import { API_BASE } from '../config'

const getIcon = (type) => {
  switch (type) {
    case 'Policy Document': return <FaFileContract />
    case 'White Paper': return <FaFileCode />
    case 'Dataset': return <FaDatabase />
    case 'Report': return <FaChartLine />
    default: return <FaFileAlt />
  }
}

const getTypeClass = (type) => {
  const map = {
    'Policy Document': 'pd',
    'White Paper': 'wp',
    'Dataset': 'ds',
    'Report': 'rp'
  }
  return map[type] || 'default'
}

function ResourceLibrary() {
  const { t } = useTranslation()

  const types = [
    { value: 'All', label: t('resources.all') },
    { value: 'Policy Document', label: t('resources.typePolicyDocument') },
    { value: 'White Paper', label: t('resources.typeWhitePaper') },
    { value: 'Report', label: t('resources.typeReport') },
    { value: 'Dataset', label: t('resources.typeDataset') },
  ]

  const categories = [
    { value: 'All', label: t('resources.all') },
    { value: 'Strategy', label: t('resources.categoryStrategy') },
    { value: 'Ethics', label: t('resources.categoryEthics') },
    { value: 'Governance', label: t('resources.categoryGovernance') },
    { value: 'Research', label: t('resources.categoryResearch') },
    { value: 'Data', label: t('resources.categoryData') },
  ]

  const getTypeLabel = (typeVal) => {
    const found = types.find(t => t.value === typeVal)
    return found ? found.label : typeVal
  }

  const getCategoryLabel = (catVal) => {
    const found = categories.find(c => c.value === catVal)
    return found ? found.label : catVal
  }

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [resources, setResources] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'Policy Document', category: 'Strategy', language: '', description: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileSizeDisplay, setFileSizeDisplay] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)) } catch { setUser(null) }
    }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/resources/`)
      .then(res => res.json())
      .then(data => setResources(data))
      .catch(err => console.error('Error fetching resources:', err))
  }, [])

  const filtered = resources.filter(r => {
    const matchSearch = (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
                        (r.category || '').toLowerCase().includes(search.toLowerCase())
    const matchType = selectedType === 'All' || r.type === selectedType
    const matchCategory = selectedCategory === 'All' || r.category === selectedCategory
    return matchSearch && matchType && matchCategory
  })

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    const bytes = file.size
    if (bytes < 1024) setFileSizeDisplay(`${bytes} B`)
    else if (bytes < 1024 * 1024) setFileSizeDisplay(`${(bytes / 1024).toFixed(1)} KB`)
    else setFileSizeDisplay(`${(bytes / (1024 * 1024)).toFixed(1)} MB`)
  }

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
      toast.error(t('resources.downloadFailed'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) { toast.error(t('resources.selectFile')); return }
    setSubmitting(true)
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('type', form.type)
    formData.append('category', form.category)
    if (form.language) formData.append('language', form.language)
    if (form.description) formData.append('description', form.description)
    formData.append('file', selectedFile)
    try {
      const res = await fetch(`${API_BASE}/api/resources/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) throw new Error('Failed to create resource')
      const newResource = await res.json()
      setResources(prev => [newResource, ...prev])
      toast.success(t('resources.addedSuccess'))
      setShowModal(false)
      setForm({ title: '', type: 'Policy Document', category: 'Strategy', language: '', description: '' })
      setSelectedFile(null)
      setFileSizeDisplay('')
    } catch {
      toast.error(t('resources.addFailed'))
    }
    setSubmitting(false)
  }

  const [deletingId, setDeletingId] = useState(null)
  const [editingResource, setEditingResource] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', type: '', category: '', language: '', description: '' })
  const [submittingEdit, setSubmittingEdit] = useState(false)

  const handleDeleteResource = async (id) => {
    if (!window.confirm(t('resources.confirmDelete'))) return
    setDeletingId(id)
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/resources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      setResources(prev => prev.filter(r => r.id !== id))
      toast.success(t('resources.deleted'))
    } catch {
      toast.error(t('resources.deleteFailed'))
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
      toast.success(t('resources.updated'))
      setEditingResource(null)
    } catch {
      toast.error(t('resources.updateFailed'))
    }
    setSubmittingEdit(false)
  }

  const clearFilters = () => { setSelectedType('All'); setSelectedCategory('All'); setSearch('') }

  return (
    <div className="modern-resources">
      <section className="resources-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content animate-up">
            <div className="hero-badge">
              <FaBook />
              <span>{t('resources.pageTitle')}</span>
            </div>
            <h1>{t('resources.heroTitle')} <span className="text-gradient">{t('resources.heroTitleGradient')}</span></h1>
            <p>{t('resources.pageDesc')}</p>
          </div>
        </div>
      </section>

      <section className="resources-body">
        <div className="container">
          <div className="resources-action-bar animate-up delay-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('resources.searchPlaceholderFull')}
            />
            <div className="action-buttons">
              <button className={`filter-btn ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}>
                <FaFilter /> {t('resources.filters')}
                {(selectedType !== 'All' || selectedCategory !== 'All') && <span className="badge-dot"></span>}
              </button>
              {user && (
                <button className="submit-btn" onClick={() => setShowModal(true)}>
                  <FaPlus /> {t('resources.addResource')}
                </button>
              )}
            </div>
          </div>

          {filtersOpen && (
            <div className="modern-filters-panel animate-up">
              <div className="filters-grid">
                <div className="filter-item">
                  <label>{t('resources.type')}</label>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                    {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <label>{t('resources.category')}</label>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <button className="clear-filters-link" onClick={clearFilters}>{t('resources.resetFilters')}</button>
            </div>
          )}

          <div className="results-header animate-up delay-1">
            <span className="results-count">{filtered.length} {t('resources.resourcesFound')}</span>
          </div>

          <div className="resources-list animate-up delay-2">
            {filtered.length > 0 ? (
              filtered.map((r, i) => (
                <div key={r.id} className="resource-card" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className={`resource-icon-box ${getTypeClass(r.type)}`}>
                    {getIcon(r.type)}
                  </div>
                  <div className="resource-info">
                    <div className="resource-top">
                      <h3>{r.title}</h3>
                      <div className="resource-badges">
                        <span className="type-badge">{getTypeLabel(r.type)}</span>
                        <span className="cat-badge">{getCategoryLabel(r.category)}</span>
                      </div>
                    </div>
                    <div className="resource-meta">
                      <span><strong>{t('resources.language')}:</strong> {r.language || '-'}</span>
                      <span><strong>{t('resources.size')}:</strong> {r.file_size || '-'}</span>
                      <span className="dl-count"><FaDownload /> {r.downloads || 0} {t('resources.downloads')}</span>
                    </div>
                    {r.description && <p className="resource-desc">{r.description}</p>}
                  </div>
                  <div className="resource-action">
                    {user && r.user_id === user.id && (
                      <>
                        <button className="edit-btn" onClick={() => handleEditResource(r)} title={t('resources.edit')}>
                          <FaEdit />
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteResource(r.id)} disabled={deletingId === r.id} title={t('resources.delete')}>
                          {deletingId === r.id ? <FaSpinner className="rl-spin" /> : <FaTrash />}
                        </button>
                      </>
                    )}
                    {r.file_url && (
                      <button className="download-btn" onClick={() => handleDownload(r)}>
                        <FaDownload /> {t('resources.download')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results-card">
                <div className="no-results-icon">📚</div>
                <h3>{t('resources.noResults')}</h3>
                <p>{t('resources.noResultsDesc')}</p>
                <button className="reset-btn" onClick={clearFilters}>{t('resources.resetFiltersBtn')}</button>
              </div>
            )}
          </div>

          {!user && (
            <div className="cta-card animate-up">
              <div className="cta-content">
                <h3>{t('resources.ctaTitle')}</h3>
                <p>{t('resources.ctaDescription')}</p>
              </div>
              <a href="/auth.html" className="cta-auth-btn">{t('resources.signInToSubmit')}</a>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('resources.addNewResource')}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid-mini">
                <div className="field">
                  <label>{t('resources.titleField')} *</label>
                  <input name="title" value={form.title} onChange={handleFormChange} required placeholder={t('resources.titlePlaceholder')} />
                </div>
                <div className="field">
                  <label>{t('resources.language')}</label>
                  <input name="language" value={form.language} onChange={handleFormChange} placeholder={t('resources.languagePlaceholder')} />
                </div>
                <div className="field">
                  <label>{t('resources.type')} *</label>
                  <select name="type" value={form.type} onChange={handleFormChange}>
                    {types.filter(t => t.value !== 'All').map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('resources.category')} *</label>
                  <select name="category" value={form.category} onChange={handleFormChange}>
                    {categories.filter(c => c.value !== 'All').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="field full">
                <label>{t('resources.fileField')} *</label>
                <div className="file-upload-wrapper">
                  <input type="file" id="resource-file" onChange={handleFileChange} className="file-input-hidden" required />
                  <label htmlFor="resource-file" className="file-upload-label">
                    <FaPlus className="upload-icon" />
                    <span>{selectedFile ? selectedFile.name : t('resources.clickToSelect')}</span>
                  </label>
                  {fileSizeDisplay && <span className="file-size-badge">{fileSizeDisplay}</span>}
                </div>
              </div>
              <div className="field full">
                <label>{t('resources.descriptionField')}</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows="3" placeholder={t('resources.descriptionPlaceholder')} />
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>{t('resources.cancel')}</button>
                <button type="submit" className="submit-action-btn" disabled={submitting}>
                  {submitting ? <>{t('resources.submitting')}</> : t('resources.addResource')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingResource && (
        <div className="modal-overlay" onClick={() => setEditingResource(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 520, padding: '32px', borderRadius: 16 }}>
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h3>{t('resources.editResource')}</h3>
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
                    <option value="Policy Document">{t('resources.typePolicyDocument')}</option>
                    <option value="White Paper">{t('resources.typeWhitePaper')}</option>
                    <option value="Dataset">{t('resources.typeDataset')}</option>
                    <option value="Report">{t('resources.typeReport')}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t('resources.category')} *</label>
                  <select name="category" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="Strategy">{t('resources.categoryStrategy')}</option>
                    <option value="Ethics">{t('resources.categoryEthics')}</option>
                    <option value="Governance">{t('resources.categoryGovernance')}</option>
                    <option value="Research">{t('resources.categoryResearch')}</option>
                    <option value="Data">{t('resources.categoryData')}</option>
                  </select>
                </div>
              </div>
              <div className="field full">
                <label>{t('resources.descriptionField')}</label>
                <textarea name="description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows="3" />
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setEditingResource(null)}>{t('resources.cancel')}</button>
                <button type="submit" className="submit-action-btn" disabled={submittingEdit}>
                  {submittingEdit ? <>{t('resources.saving')}</> : t('resources.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .modern-resources {
          --p-primary: #2563eb;
          --p-secondary: #0f172a;
          --p-text: #1e293b;
          --p-text-light: #64748b;
          font-family: 'Outfit', sans-serif;
          color: var(--p-text);
          background: #fff;
          min-height: 100vh;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        .resources-hero {
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

        .resources-hero h1 {
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

        .resources-hero p {
          font-size: 1.2rem;
          color: var(--p-text-light);
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .resources-body { padding-bottom: 100px; }

        .resources-action-bar {
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
          grid-template-columns: repeat(2, 1fr);
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

        .results-header { margin-bottom: 24px; }
        .results-count { font-size: 1rem; color: var(--p-text-light); font-weight: 500; }

        .resources-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .resource-card {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          padding: 24px;
          transition: 0.3s;
          animation: fadeUp 0.5s ease both;
        }
        .resource-card:hover { border-color: #e2e8f0; box-shadow: 0 8px 24px rgba(0,0,0,0.03); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .resource-icon-box {
          flex-shrink: 0;
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
        }
        .resource-icon-box.pd { background: #eff6ff; color: #3b82f6; }
        .resource-icon-box.wp { background: #f5f3ff; color: #8b5cf6; }
        .resource-icon-box.ds { background: #ecfdf5; color: #10b981; }
        .resource-icon-box.rp { background: #fff7ed; color: #f97316; }
        .resource-icon-box.default { background: #f8fafc; color: #475569; }

        .resource-info { flex: 1; min-width: 0; }

        .resource-top {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          margin-bottom: 8px;
        }
        .resource-top h3 {
          font-size: 1.1rem; font-weight: 800; margin: 0; line-height: 1.3; color: var(--p-secondary);
        }
        .resource-badges { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
        .type-badge, .cat-badge {
          padding: 4px 12px; border-radius: 100px; font-size: 0.7rem; font-weight: 700;
        }
        .type-badge { background: #eff6ff; color: var(--p-primary); }
        .cat-badge { background: #f1f5f9; color: var(--p-text-light); }

        .resource-meta {
          display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
          font-size: 0.85rem; color: var(--p-text-light); margin-bottom: 4px;
        }
        .resource-meta strong { color: var(--p-secondary); }
        .dl-count { display: flex; align-items: center; gap: 4px; }

        .resource-desc {
          font-size: 0.85rem; color: var(--p-text-light); line-height: 1.5;
          margin: 6px 0 0;
        }

        .resource-action { flex-shrink: 0; align-self: center; display: flex; align-items: center; gap: 6px; }

        .download-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #f8fafc;
          color: var(--p-primary);
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.3s;
          border: 1.5px solid #e2e8f0;
          font-family: inherit;
          white-space: nowrap;
        }
        .download-btn:hover {
          background: var(--p-primary);
          color: #fff;
          border-color: var(--p-primary);
          transform: translateY(-2px);
        }

        .rl-spin { animation: rl-spincw 0.6s linear infinite; }
        @keyframes rl-spincw { to { transform: rotate(360deg); } }

        .edit-btn, .delete-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          font-size: 0.85rem;
          transition: 0.2s;
          background: #fff;
        }
        .edit-btn { color: #2563eb; }
        .edit-btn:hover { background: #eff6ff; border-color: #2563eb; }
        .delete-btn { color: #dc2626; }
        .delete-btn:hover { background: #fef2f2; border-color: #dc2626; }
        .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .no-results-card {
          text-align: center; background: #fff; padding: 60px;
          border-radius: 32px; border: 1px solid #f1f5f9;
        }
        .no-results-icon { font-size: 3rem; margin-bottom: 16px; }
        .reset-btn { margin-top: 24px; background: var(--p-primary); color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }

        .cta-card {
          margin-top: 48px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 24px;
          padding: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
        }
        .cta-content h3 { font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 8px; }
        .cta-content p { color: rgba(255,255,255,0.7); font-size: 1rem; max-width: 500px; }
        .cta-auth-btn {
          background: #fff; color: var(--p-secondary); padding: 14px 28px;
          border-radius: 14px; font-weight: 700; text-decoration: none;
          transition: 0.3s; white-space: nowrap;
        }
        .cta-auth-btn:hover { background: #f1f5f9; transform: translateY(-2px); }

        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 20px;
        }
        .modal-content {
          background: #fff; width: 100%; max-width: 600px;
          border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden; animation: fadeUp 0.3s ease;
        }
        .modal-header {
          padding: 24px; display: flex; justify-content: space-between;
          align-items: center; border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0; }
        .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--p-text-light); padding: 4px; }
        .modal-form { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .form-grid-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field.full { grid-column: span 2; }
        .field label { font-weight: 700; font-size: 0.85rem; color: var(--p-secondary); }
        .field input, .field select, .field textarea {
          padding: 12px 16px; border-radius: 12px; border: 2px solid #f1f5f9; background: #f8fafc;
          font-family: inherit; font-size: 0.95rem; outline: none; transition: 0.2s;
        }
        .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--p-primary); background: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05); }

        .file-upload-wrapper {
          background: #f8fafc; border: 2px dashed #e2e8f0;
          border-radius: 14px; padding: 20px; text-align: center;
          transition: 0.3s; display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .file-upload-wrapper:hover { border-color: var(--p-primary); background: #eff6ff; }
        .file-input-hidden { display: none; }
        .file-upload-label {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          cursor: pointer; color: var(--p-text-light); font-weight: 600;
        }
        .upload-icon { font-size: 1.5rem; color: var(--p-primary); }
        .file-size-badge {
          padding: 4px 12px; background: #e2e8f0; border-radius: 8px;
          font-size: 0.8rem; font-weight: 700; color: var(--p-secondary);
        }

        .modal-footer {
          display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px;
        }
        .cancel-btn {
          background: #f8fafc; border: none; padding: 12px 24px;
          border-radius: 12px; font-weight: 700; cursor: pointer; color: var(--p-text-light); font-family: inherit;
        }
        .submit-action-btn {
          background: var(--p-primary); color: #fff; border: none;
          padding: 12px 24px; border-radius: 12px; font-weight: 700;
          cursor: pointer; transition: 0.3s; font-family: inherit;
        }
        .submit-action-btn:hover { background: #1d4ed8; }
        .submit-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 1024px) {
          .resources-action-bar { flex-direction: column; padding: 16px; }
          .filters-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .resource-card { flex-direction: column; align-items: stretch; }
          .resource-action { align-self: stretch; }
          .resource-action .download-btn { width: 100%; justify-content: center; }
          .resource-top { flex-direction: column; }
          .cta-card { flex-direction: column; text-align: center; padding: 32px 24px; }
          .form-grid-mini { grid-template-columns: 1fr; }
          .field.full { grid-column: span 1; }
        }
      `}</style>
    </div>
  )
}

export default ResourceLibrary
