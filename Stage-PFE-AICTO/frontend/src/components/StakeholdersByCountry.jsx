import { useState, useEffect } from 'react'
import { FaExternalLinkAlt, FaChevronDown } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { API_BASE } from '../config'

const TYPE_ICONS = {
  'University': '🏛',
  'Government': '🏛',
  'NGO': '🤝',
  'Industry': '🏭',
  'Research Lab': '🔬',
  'Business': '🚀',
  'Research': '🔬'
}

const TYPE_COLORS = {
  'University': { bg: '#eff6ff', text: '#2563eb' },
  'Government': { bg: '#f0fdf4', text: '#059669' },
  'NGO': { bg: '#fff7ed', text: '#ea580c' },
  'Industry': { bg: '#f5f3ff', text: '#7c3aed' },
  'Research Lab': { bg: '#f0fdfa', text: '#0d9488' },
  'Business': { bg: '#fef2f2', text: '#dc2626' },
  'Research': { bg: '#f0fdfa', text: '#0d9488' }
}

function StakeholdersByCountry({ searchQuery = '', typeFilter = 'All' }) {
  const { t } = useTranslation()
  const [countries, setCountries] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [openCountries, setOpenCountries] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/countries/`).then(r => r.json()),
      fetch(`${API_BASE}/api/stakeholders/`).then(r => r.json())
    ])
      .then(([c, s]) => {
        setCountries(c)
        setStakeholders(s)
        setOpenCountries(new Set(c.map(x => x.country).filter(Boolean)))
      })
      .catch(err => console.error('Error fetching data:', err))
      .finally(() => setLoading(false))
  }, [])

  const countryMap = {}
  countries.forEach(c => { countryMap[c.country] = c.icon_url })

  const grouped = {}
  stakeholders.forEach(s => {
    const key = s.country || 'Unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  const sortedCountries = countries
    .map(c => c.country)
    .filter(name => name)
    .sort()

  const toggleCountry = (name) => {
    setOpenCountries(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const isSearching = searchQuery.trim().length > 0
  const hasTypeFilter = typeFilter !== 'All'
  const q = searchQuery.toLowerCase().trim()

  const matchesSearch = (s) =>
    s.name.toLowerCase().includes(q) ||
    (s.type && s.type.toLowerCase().includes(q)) ||
    (s.description && s.description.toLowerCase().includes(q)) ||
    (s.category && s.category.toLowerCase().includes(q))

  const matchesType = (s) => !hasTypeFilter || s.type === typeFilter

  const filteredCountries = sortedCountries.filter(name => {
    const list = grouped[name] || []
    const typeList = list.filter(matchesType)
    const searchList = typeList.filter(matchesSearch)
    if (!isSearching && !hasTypeFilter) return true
    if (name.toLowerCase().includes(q)) return true
    return searchList.length > 0
  })

  const getFilteredList = (countryName) => {
    const list = grouped[countryName] || []
    let filtered = list
    if (hasTypeFilter) filtered = filtered.filter(matchesType)
    if (isSearching) filtered = filtered.filter(matchesSearch)
    return filtered
  }

  const getTypeStyle = (type) => {
    const colors = TYPE_COLORS[type] || { bg: '#f3f4f6', text: '#374151' }
    return colors
  }

  const getIcon = (type) => TYPE_ICONS[type] || '🏢'

  return (
    <div className="sbc-wrapper">
      <div className="sbc-container">
        {loading ? (
          <div className="sbc-loading">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="sbc-skeleton-country">
                <div className="sbc-skeleton-header">
                  <div className="sbc-skeleton-flag" />
                  <div className="sbc-skeleton-info">
                    <div className="sbc-skeleton-line w-40" />
                    <div className="sbc-skeleton-line w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCountries.length === 0 ? (
          <div className="sbc-no-results">{t('stakeholders.noResults')}</div>
        ) : (
          filteredCountries.map(countryName => {
            const list = getFilteredList(countryName)
            const isOpen = openCountries.has(countryName)
            const totalAll = (grouped[countryName] || []).length
            const totalAfterType = hasTypeFilter ? (grouped[countryName] || []).filter(matchesType).length : totalAll
            const flagUrl = countryMap[countryName]

            return (
              <div key={countryName} className={`sbc-country ${isOpen ? 'sbc-country--open' : ''}`}>
                <div className="sbc-country-header" onClick={() => toggleCountry(countryName)}>
                  <div className="sbc-country-left">
                    {flagUrl ? (
                      <img src={flagUrl} alt={countryName} className="sbc-flag" />
                    ) : (
                      <div className="sbc-flag sbc-flag-placeholder">{countryName[0]}</div>
                    )}
                    <div className="sbc-country-info">
                      <span className="sbc-country-name">{countryName}</span>
                      <span className="sbc-country-count">{isSearching || hasTypeFilter ? t('stakeholders.totalCountFiltered', { count: list.length, total: totalAfterType }) : t('stakeholders.totalCount', { count: totalAll })}</span>
                    </div>
                  </div>
                  <FaChevronDown className={`sbc-chevron ${isOpen ? 'sbc-chevron--open' : ''}`} size={16} />
                </div>

                <div className={`sbc-collapse ${isOpen ? 'sbc-collapse--open' : ''}`}>
                  <div className="sbc-collapse-inner">
                    {list.length === 0 ? (
                      <div className="sbc-empty-msg">{t('stakeholders.noneRegistered')}</div>
                    ) : (
                    <div className="sbc-stakeholder-grid">
                      {list.map(s => {
                        const style = getTypeStyle(s.type)
                        return (
                          <div key={s.id} className="sbc-card">
                            <div className="sbc-card-top">
                              <span className="sbc-type-badge" style={{ background: style.bg, color: style.text }}>
                                {getIcon(s.type)} {s.type}
                              </span>
                              {s.website && (
                                <a href={s.website} target="_blank" rel="noopener noreferrer" className="sbc-card-link" title={t('stakeholders.visitWebsite')}>
                                  <FaExternalLinkAlt size={12} />
                                </a>
                              )}
                            </div>
                            <h3 className="sbc-card-title">{s.name}</h3>
                            {s.description && <p className="sbc-card-desc">{s.description}</p>}
                            <div className="sbc-card-divider" />
                            <div className="sbc-card-footer">
                              <span className="sbc-card-country">
                                🌐 {s.country || t('stakeholders.unknown')}
                              </span>
                              {s.category && (
                                <span className="sbc-card-category">{s.category}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        .sbc-wrapper {
          width: 100%;
          background: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .sbc-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sbc-loading {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px 0;
        }
        .sbc-skeleton-country {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .sbc-skeleton-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
        }
        .sbc-skeleton-flag {
          width: 60px;
          height: 40px;
          border-radius: 8px;
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          flex-shrink: 0;
        }
        .sbc-skeleton-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .sbc-skeleton-line {
          height: 14px;
          border-radius: 8px;
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .sbc-skeleton-line.w-40 { width: 40%; }
        .sbc-skeleton-line.w-24 { width: 24%; }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sbc-empty-msg {
          text-align: center;
          padding: 32px 20px;
          color: #9ca3af;
          font-size: 0.9rem;
          font-style: italic;
        }
        .sbc-no-results {
          text-align: center;
          padding: 80px 20px;
          color: #9ca3af;
          font-size: 1.1rem;
        }

        .sbc-country {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .sbc-country:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .sbc-country-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
        }
        .sbc-country-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sbc-flag {
          width: 60px;
          height: 40px;
          border-radius: 8px;
          object-fit: contain;
          background: #f1f5f9;
          flex-shrink: 0;
        }
        .sbc-flag-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
          font-weight: 700;
          font-size: 1.2rem;
        }
        .sbc-country-info {
          display: flex;
          flex-direction: column;
        }
        .sbc-country-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
        }
        .sbc-country-count {
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 500;
          margin-top: 2px;
        }
        .sbc-chevron {
          color: #9ca3af;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }
        .sbc-chevron--open {
          transform: rotate(180deg);
        }

        .sbc-collapse {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.3s ease;
        }
        .sbc-collapse--open {
          max-height: 2000px;
          opacity: 1;
        }
        .sbc-collapse-inner {
          padding: 20px;
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
        }

        .sbc-stakeholder-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .sbc-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 16px;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s;
        }
        .sbc-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .sbc-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .sbc-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .sbc-card-link {
          color: #d1d5db;
          transition: color 0.2s;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .sbc-card-link:hover {
          color: #6b7280;
        }
        .sbc-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
          margin: 10px 0 0;
          line-height: 1.3;
        }
        .sbc-card-desc {
          font-size: 0.85rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 6px 0 0;
          flex: 1;
        }
        .sbc-card-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 12px 0;
        }
        .sbc-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .sbc-card-country {
          font-size: 0.8rem;
          color: #9ca3af;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sbc-card-category {
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          background: #f3f4f6;
          padding: 3px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        @media (max-width: 1024px) {
          .sbc-stakeholder-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .sbc-country-header {
            padding: 12px 16px;
          }
          .sbc-collapse-inner {
            padding: 16px;
          }
          .sbc-stakeholder-grid {
            grid-template-columns: 1fr;
          }
          .sbc-flag {
            width: 48px;
            height: 32px;
          }
          .sbc-country-name {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  )
}

export default StakeholdersByCountry
