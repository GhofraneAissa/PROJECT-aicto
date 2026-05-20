import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FaSearch, FaProjectDiagram, FaBuilding, FaBook,
  FaGlobeAmericas, FaCalendarAlt, FaFilter, FaTimes,
  FaArrowRight, FaLightbulb, FaMicrochip, FaLayerGroup
} from 'react-icons/fa'

const API_BASE = 'http://localhost:8000'

function highlightText(text, query) {
  if (!text || !query) return text || ''
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  )
}

function SkeletonCard() {
  return (
    <div className="search-skeleton">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-subtitle" />
      <div className="skeleton-line skeleton-text" />
      <div className="skeleton-line skeleton-text short" />
      <div className="skeleton-tags">
        <div className="skeleton-tag" />
        <div className="skeleton-tag" />
      </div>
      <style>{`
        .search-skeleton {
          background: var(--white);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--gray-100);
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line {
          height: 14px;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .skeleton-title { width: 60%; height: 20px; }
        .skeleton-subtitle { width: 35%; height: 16px; }
        .skeleton-text { width: 90%; }
        .skeleton-text.short { width: 50%; }
        .skeleton-tags { display: flex; gap: 8px; margin-top: 12px; }
        .skeleton-tag { width: 70px; height: 24px; border-radius: 12px; background: var(--gray-100); }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

function SearchResults() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''

  const [query, setQuery] = useState(queryParam)
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [parsedQuery, setParsedQuery] = useState(null)
  const [filters, setFilters] = useState({
    country: '', sector: '', ai_technology: '', stakeholder_type: '', resource_type: ''
  })
  const [filterOptions, setFilterOptions] = useState({
    countries: [], sectors: [], technologies: [],
    stakeholder_types: [], resource_types: []
  })
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('relevance')
  const [page, setPage] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetch(`${API_BASE}/api/search/filters`)
      .then(r => r.json())
      .then(data => setFilterOptions(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setQuery(queryParam)
    setPage(1)
  }, [queryParam])

  const doSearch = useCallback(async (q, f, tab, pg, sort) => {
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('q', q)
      if (tab !== 'all') params.set('entity', tab === 'projects' ? 'project' : tab === 'stakeholders' ? 'stakeholder' : 'resource')
      if (f.country) params.set('country', f.country)
      if (f.sector) params.set('sector', f.sector)
      if (f.ai_technology) params.set('technology', f.ai_technology)
      params.set('limit', String(pageSize))

      const res = await fetch(`${API_BASE}/api/search/ai-search?${params}`)
      const data = await res.json()
      const all = [
        ...(data.projects || []).map(p => ({ ...p, entity_type: 'project' })),
        ...(data.stakeholders || []).map(s => ({ ...s, entity_type: 'stakeholder' })),
        ...(data.resources || []).map(r => ({ ...r, entity_type: 'resource' }))
      ]
      setResults(all)
      setTotal(data.total || all.length)
      setParsedQuery(data.parsed || null)
      setElapsed(data.time_ms || 0)
    } catch {
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doSearch(query, filters, activeTab, page, sortBy)
  }, [query, filters, activeTab, page, sortBy, doSearch])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchParams({ q: query.trim() })
      setPage(1)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ country: '', sector: '', ai_technology: '', stakeholder_type: '', resource_type: '' })
    setActiveTab('all')
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(v => v) || activeTab !== 'all'

  const getEntityIcon = (type) => {
    switch (type) {
      case 'project': return <FaProjectDiagram />
      case 'stakeholder': return <FaBuilding />
      case 'resource': return <FaBook />
      default: return <FaSearch />
    }
  }

  const getTypeBadge = (item) => {
    const type = item.entity_type
    return (
      <span className={`result-type-badge type-${type}`}>
        {type === 'project' ? t('search.project') : type === 'stakeholder' ? t('search.stakeholder') : t('search.resource')}
      </span>
    )
  }

  const filteredResults = results.filter(item => {
    const type = item.entity_type
    if (activeTab === 'all') return true
    if (activeTab === 'projects') return type === 'project'
    if (activeTab === 'stakeholders') return type === 'stakeholder'
    if (activeTab === 'resources') return type === 'resource'
    return true
  })

  const resultCounts = {
    all: total,
    projects: results.filter(r => r.entity_type === 'project').length,
    stakeholders: results.filter(r => r.entity_type === 'stakeholder').length,
    resources: results.filter(r => r.entity_type === 'resource').length
  }

  return (
    <div className="search-page">
      <div className="search-hero">
        <div className="container">
          <h1 className="search-hero-title">{t('search.title')}</h1>
          <form onSubmit={handleSearch} className="search-hero-form">
            <FaSearch className="search-hero-icon" />
            <input
              type="text"
              className="search-hero-input"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="search-hero-btn">{t('search.search')}</button>
          </form>
          {parsedQuery && (parsedQuery.country || parsedQuery.sector || parsedQuery.technology) && (
            <div className="search-detected">
              <FaLightbulb size={14} />
              <span>{t('search.detected')}:</span>
              {parsedQuery.country && <span className="detected-tag"><FaGlobeAmericas /> {parsedQuery.country}</span>}
              {parsedQuery.sector && <span className="detected-tag"><FaLayerGroup /> {parsedQuery.sector}</span>}
              {parsedQuery.technology && <span className="detected-tag"><FaMicrochip /> {parsedQuery.technology}</span>}
              {parsedQuery.entity && <span className="detected-tag"><FaFilter /> {parsedQuery.entity}</span>}
              {parsedQuery.date_from && <span className="detected-tag"><FaCalendarAlt /> After {parsedQuery.date_from}</span>}
              {parsedQuery.date_to && <span className="detected-tag"><FaCalendarAlt /> Before {parsedQuery.date_to}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="container search-main">
        <div className="search-layout">
          <aside className={`search-filters-sidebar ${showFilters ? 'open' : ''}`}>
            <div className="filters-header">
              <h3><FaFilter /> {t('search.filters')}</h3>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  <FaTimes /> {t('search.clear')}
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>{t('search.country')}</label>
              <select value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)}>
                <option value="">{t('search.all')}</option>
                {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('search.sector')}</label>
              <select value={filters.sector} onChange={(e) => handleFilterChange('sector', e.target.value)}>
                <option value="">{t('search.all')}</option>
                {filterOptions.sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('search.technology')}</label>
              <select value={filters.ai_technology} onChange={(e) => handleFilterChange('ai_technology', e.target.value)}>
                <option value="">{t('search.all')}</option>
                {filterOptions.technologies.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('search.stakeholderType')}</label>
              <select value={filters.stakeholder_type} onChange={(e) => handleFilterChange('stakeholder_type', e.target.value)}>
                <option value="">{t('search.all')}</option>
                {filterOptions.stakeholder_types.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('search.resourceType')}</label>
              <select value={filters.resource_type} onChange={(e) => handleFilterChange('resource_type', e.target.value)}>
                <option value="">{t('search.all')}</option>
                {filterOptions.resource_types.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </aside>

          {showFilters && <div className="filters-overlay" onClick={() => setShowFilters(false)} />}

          <div className="search-content">
            <div className="search-toolbar">
              <div className="search-tabs">
                {['all', 'projects', 'stakeholders', 'resources'].map(tab => (
                  <button
                    key={tab}
                    className={`search-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => handleTabChange(tab)}
                  >
                    {tab === 'all' ? t('search.all') : tab === 'projects' ? t('search.projects') : tab === 'stakeholders' ? t('search.stakeholders') : t('search.resources')}
                    {resultCounts[tab] > 0 && <span className="tab-count">{resultCounts[tab]}</span>}
                  </button>
                ))}
              </div>
              <div className="search-actions">
                <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
                  <FaFilter /> {t('search.filters')}
                </button>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="relevance">{t('search.relevance')}</option>
                  <option value="date">{t('search.date')}</option>
                </select>
              </div>
            </div>

            {!query.trim() && (
              <div className="search-empty">
                <FaSearch size={48} />
                <h3>{t('search.startSearch')}</h3>
                <p>{t('search.startSearchDesc')}</p>
              </div>
            )}

            {query.trim() && !loading && filteredResults.length === 0 && (
              <div className="search-empty">
                <FaSearch size={48} />
                <h3>{t('search.noResults')}</h3>
                <p>{t('search.noResultsDesc')}</p>
              </div>
            )}

            {loading && (
              <div className="search-skeleton-list">
                {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
              </div>
            )}

            {!loading && filteredResults.length > 0 && (
              <>
                <div className="search-stats">
                  <span className="ai-badge">AI</span>
                  {t('search.found')} <strong>{total}</strong> {t('search.resultsFor')} "<strong>{query}</strong>" 
                  <span className="search-elapsed">({elapsed}ms)</span>
                  {parsedQuery?.keywords && parsedQuery.keywords !== query.toLowerCase() && (
                    <span className="search-clean-query"> · {t('search.searchedFor')} "{parsedQuery.keywords}"</span>
                  )}
                </div>
                <div className="search-results-list">
                  {filteredResults.map((item, idx) => {
                    const type = item.entity_type
                    const title = item.title || item.name
                    const desc = item.description || ''
                    const country = item.country || ''
                    const sector = item.sector || ''
                    const tech = item.ai_technology || ''
                    const highlight = item._highlight || {}

                    return (
                      <Link
                        key={`${type}-${item.id}-${idx}`}
                        to={type === 'project' ? `/projects/${item.id}` : type === 'stakeholder' ? `/stakeholders?highlight=${item.id}` : `/resources?highlight=${item.id}`}
                        className="search-result-card"
                      >
                        <div className="result-icon">
                          {getEntityIcon(type)}
                        </div>
                        <div className="result-content">
                          <div className="result-header">
                            <h3 className="result-title">
                              {highlight?.title
                                ? highlight.title.map((h, i) => <span key={i} dangerouslySetInnerHTML={{ __html: h }} />)
                                : highlightText(title, query)
                              }
                            </h3>
                            {getTypeBadge(item)}
                          </div>
                          <div className="result-meta">
                            {country && <span className="result-meta-item"><FaGlobeAmericas /> {highlightText(country, query)}</span>}
                            {sector && <span className="result-meta-item"><FaLayerGroup /> {highlightText(sector, query)}</span>}
                            {tech && <span className="result-meta-item"><FaMicrochip /> {highlightText(tech, query)}</span>}
                            {item.start_date && <span className="result-meta-item"><FaCalendarAlt /> {new Date(item.start_date).getFullYear()}</span>}
                          </div>
                          <p className="result-desc">
                            {highlight?.description
                              ? highlight.description.map((h, i) => <span key={i} dangerouslySetInnerHTML={{ __html: h }} />)
                              : highlightText(desc?.substring(0, 200), query)
                            }
                          </p>
                          <div className="result-footer">
                            {item.stakeholders && <span className="result-stakeholders"><FaBuilding /> {item.stakeholders}</span>}
                            {item.type && <span className="result-stakeholders"><FaBook /> {item.type}</span>}
                            {item.sdg_alignment && <span className="result-sdg">{item.sdg_alignment}</span>}
                          </div>
                        </div>
                        <div className="result-arrow">
                          <FaArrowRight />
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {total > pageSize && (
                  <div className="search-pagination">
                    {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(total / pageSize) || Math.abs(p - page) <= 2)
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
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .search-page {
          min-height: 100vh;
          background: var(--gray-50);
        }
        .search-hero {
          background: linear-gradient(135deg, var(--gray-900) 0%, #1e3a5f 100%);
          padding: 48px 0;
          color: var(--white);
        }
        .search-hero-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 24px;
          text-align: center;
        }
        .search-hero-form {
          position: relative;
          max-width: 640px;
          margin: 0 auto;
          display: flex;
        }
        .search-hero-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          font-size: 1rem;
          pointer-events: none;
        }
        .search-hero-input {
          flex: 1;
          padding: 16px 16px 16px 48px;
          border: none;
          border-radius: 14px 0 0 14px;
          font-size: 1.1rem;
          background: var(--white);
          color: var(--gray-800);
          font-family: inherit;
          outline: none;
        }
        .search-hero-btn {
          padding: 16px 32px;
          border: none;
          border-radius: 0 14px 14px 0;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: var(--white);
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: var(--transition);
          font-family: inherit;
        }
        .search-hero-btn:hover {
          opacity: 0.9;
        }
        .search-detected {
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 640px;
          margin: 16px auto 0;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.8);
          flex-wrap: wrap;
        }
        .detected-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: rgba(255,255,255,0.12);
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .search-main {
          padding: 24px 0;
        }
        .search-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }
        .search-filters-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--white);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid var(--gray-100);
          position: sticky;
          top: 88px;
        }
        .filters-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .filters-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--gray-800);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .clear-filters-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: inherit;
        }
        .filter-group {
          margin-bottom: 16px;
        }
        .filter-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--gray-600);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .filter-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          font-size: 0.85rem;
          font-family: inherit;
          color: var(--gray-700);
          background: var(--white);
          cursor: pointer;
          outline: none;
          transition: var(--transition);
        }
        .filter-group select:focus {
          border-color: var(--primary-color);
        }
        .filters-overlay {
          display: none;
        }
        .search-content {
          flex: 1;
          min-width: 0;
        }
        .search-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .search-tabs {
          display: flex;
          gap: 4px;
          background: var(--white);
          border-radius: 12px;
          padding: 4px;
          border: 1px solid var(--gray-100);
        }
        .search-tab {
          padding: 8px 18px;
          border: none;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          background: transparent;
          color: var(--gray-500);
          transition: var(--transition);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .search-tab:hover {
          color: var(--gray-700);
          background: var(--gray-50);
        }
        .search-tab.active {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: var(--white);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }
        .tab-count {
          background: rgba(255,255,255,0.2);
          padding: 1px 8px;
          border-radius: 10px;
          font-size: 0.75rem;
        }
        .search-tab:not(.active) .tab-count {
          background: var(--gray-100);
          color: var(--gray-500);
        }
        .search-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .filter-toggle-btn {
          display: none;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          background: var(--white);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gray-600);
          cursor: pointer;
          font-family: inherit;
          transition: var(--transition);
        }
        .filter-toggle-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .sort-select {
          padding: 8px 14px;
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          font-family: inherit;
          color: var(--gray-600);
          background: var(--white);
          cursor: pointer;
          outline: none;
        }
        .sort-select:focus {
          border-color: var(--primary-color);
        }
        .search-stats {
          font-size: 0.9rem;
          color: var(--gray-500);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ai-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }
        .search-elapsed {
          color: var(--gray-400);
          font-size: 0.8rem;
        }
        .search-clean-query {
          color: var(--gray-400);
          font-style: italic;
        }
        .search-results-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .search-skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .search-result-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: var(--white);
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid var(--gray-100);
          transition: var(--transition);
          text-decoration: none;
          color: inherit;
        }
        .search-result-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: var(--gray-200);
        }
        .result-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
          background: var(--gray-100);
          color: var(--primary-color);
        }
        .result-content {
          flex: 1;
          min-width: 0;
        }
        .result-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .result-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--gray-900);
          line-height: 1.3;
        }
        .result-title mark, .result-desc mark {
          background: #fef3c7;
          color: #92400e;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .result-type-badge {
          font-size: 0.7rem;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .type-project { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
        .type-stakeholder { background: rgba(124, 58, 237, 0.1); color: #7c3aed; }
        .type-resource { background: rgba(5, 150, 105, 0.1); color: #059669; }
        .result-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .result-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--gray-500);
        }
        .result-desc {
          font-size: 0.88rem;
          color: var(--gray-600);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .result-footer {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .result-stakeholders {
          font-size: 0.78rem;
          color: var(--gray-400);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .result-sdg {
          font-size: 0.75rem;
          color: var(--secondary-color);
        }
        .result-arrow {
          color: var(--gray-300);
          font-size: 0.9rem;
          margin-top: 10px;
          transition: var(--transition);
          flex-shrink: 0;
        }
        .search-result-card:hover .result-arrow {
          color: var(--primary-color);
          transform: translateX(4px);
        }
        .search-pagination {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-top: 32px;
          padding: 16px 0;
        }
        .pag-btn {
          width: 36px;
          height: 36px;
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          background: var(--white);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gray-600);
          cursor: pointer;
          font-family: inherit;
          transition: var(--transition);
        }
        .pag-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .pag-btn.active {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: var(--white);
          border-color: transparent;
        }
        .pag-ellipsis {
          padding: 0 4px;
          color: var(--gray-400);
          display: inline-flex;
          align-items: center;
        }
        .search-empty {
          text-align: center;
          padding: 80px 20px;
          color: var(--gray-400);
        }
        .search-empty h3 {
          margin-top: 16px;
          font-size: 1.4rem;
          color: var(--gray-600);
        }
        .search-empty p {
          margin-top: 8px;
          color: var(--gray-400);
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 1024px) {
          .search-filters-sidebar {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 300px;
            height: 100vh;
            z-index: 1100;
            border-radius: 0;
            overflow-y: auto;
            padding: 24px;
          }
          .search-filters-sidebar.open {
            display: block;
          }
          .filters-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.4);
            z-index: 1099;
          }
          .search-filters-sidebar.open + .filters-overlay {
            display: block;
          }
          .filter-toggle-btn {
            display: flex;
          }
        }
        @media (max-width: 768px) {
          .search-hero { padding: 32px 0; }
          .search-hero-title { font-size: 1.4rem; }
          .search-hero-form { flex-direction: column; }
          .search-hero-input { border-radius: 12px; padding: 14px 14px 14px 42px; }
          .search-hero-btn { border-radius: 12px; margin-top: 8px; padding: 12px; }
          .search-result-card { padding: 16px; }
          .result-header { flex-direction: column; align-items: flex-start; }
          .search-toolbar { flex-direction: column; align-items: stretch; }
          .search-tabs { overflow-x: auto; }
        }
      `}</style>
    </div>
  )
}

export default SearchResults