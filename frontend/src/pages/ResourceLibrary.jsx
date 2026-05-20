import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaFileAlt, FaBook, FaDatabase, FaDownload, FaEye, FaSearch, FaFileContract, FaFileCode, FaChartLine } from 'react-icons/fa'
import SearchBar from '../components/SearchBar'

const resources = [
  { id: 1, title: 'Arab Common AI Strategy 2023', type: 'Policy Document', category: 'Strategy', language: 'Arabic/English', size: '2.4 MB', downloads: 1250 },
  { id: 2, title: 'AI Ethics Guidelines Framework', type: 'White Paper', category: 'Ethics', language: 'English', size: '1.8 MB', downloads: 890 },
  { id: 3, title: 'Arabic NLP Dataset v2.0', type: 'Dataset', category: 'Data', language: 'Arabic', size: '450 MB', downloads: 2340 },
  { id: 4, title: 'Regional AI Maturity Assessment Report', type: 'Report', category: 'Research', language: 'English', size: '5.2 MB', downloads: 567 },
  { id: 5, title: 'Startup Ecosystem Mapping Study', type: 'Report', category: 'Research', language: 'English', size: '3.1 MB', downloads: 423 },
  { id: 6, title: 'AI Governance Best Practices', type: 'White Paper', category: 'Governance', language: 'English', size: '1.2 MB', downloads: 678 },
  { id: 7, title: 'Computer Vision Annotated Dataset', type: 'Dataset', category: 'Data', language: 'Mixed', size: '890 MB', downloads: 1567 },
  { id: 8, title: 'National AI Strategies Compilation', type: 'Policy Document', category: 'Strategy', language: 'Arabic', size: '8.5 MB', downloads: 912 }
]

const types = ['All', 'Policy Document', 'White Paper', 'Report', 'Dataset']
const categories = ['All', 'Strategy', 'Ethics', 'Governance', 'Research', 'Data']

function ResourceLibrary() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const getIcon = (type) => {
    switch (type) {
      case 'Policy Document': return <FaFileContract />
      case 'White Paper': return <FaFileCode />
      case 'Dataset': return <FaDatabase />
      case 'Report': return <FaChartLine />
      default: return <FaFileAlt />
    }
  }

  const getTypeColor = (type) => {
    const colors = {
      'Policy Document': '#2563eb',
      'White Paper': '#7c3aed',
      'Dataset': '#059669',
      'Report': '#f59e0b'
    }
    return colors[type] || '#6b7280'
  }

  const filtered = resources.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                        r.category.toLowerCase().includes(search.toLowerCase())
    const matchType = selectedType === 'All' || r.type === selectedType
    const matchCategory = selectedCategory === 'All' || r.category === selectedCategory
    return matchSearch && matchType && matchCategory
  })

  return (
    <div className="resource-library">
      <section className="page-hero">
        <div className="page-hero-bg"></div>
        <div className="container">
          <div className="page-hero-content">
            <h1>{t('resources.pageTitle')}</h1>
            <p>{t('resources.pageDesc')}</p>
          </div>
        </div>
      </section>

      <section className="resources-content section">
        <div className="container">
          <div className="filters-card">
            <div className="filters-header">
              <FaSearch className="search-icon" />
              <h3>{t('resources.searchFilter')}</h3>
            </div>
            <div className="filters-body">
              <div className="filter-group main-search">
                <SearchBar value={search} onChange={setSearch} placeholder={t('resources.searchPlaceholder')} />
              </div>
              <div className="filter-row">
                <div className="filter-group">
                  <label>{t('resources.type')}</label>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>{t('resources.category')}</label>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="results-header">
            <span className="results-count">{filtered.length} {t('resources.resourcesFound')}</span>
          </div>

          <div className="resources-list">
            {filtered.map(r => (
              <div key={r.id} className="resource-card">
                <div className="resource-icon" style={{ background: `${getTypeColor(r.type)}15`, color: getTypeColor(r.type) }}>
                  {getIcon(r.type)}
                </div>
                <div className="resource-content">
                  <div className="resource-header">
                    <h3>{r.title}</h3>
                    <div className="resource-badges">
                      <span className="resource-type" style={{ background: `${getTypeColor(r.type)}15`, color: getTypeColor(r.type) }}>
                        {r.type}
                      </span>
                      <span className="resource-category">{r.category}</span>
                    </div>
                  </div>
                  <div className="resource-meta">
                    <span><strong>{t('resources.language')}:</strong> {r.language}</span>
                    <span><strong>{t('resources.size')}:</strong> {r.size}</span>
                    <span><FaDownload /> {r.downloads.toLocaleString()} {t('resources.downloads')}</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="action-btn view-btn" title={t('resources.preview')}>
                    <FaEye />
                  </button>
                  <button className="btn btn-primary">
                    <FaDownload /> {t('resources.download')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">📚</div>
              <h3>{t('resources.noResults')}</h3>
              <p>{t('resources.noResultsHint')}</p>
            </div>
          )}

          <div className="cta-section">
            <div className="cta-card">
              <div className="cta-content">
                <h3>{t('resources.ctaTitle')}</h3>
                <p>{t('resources.ctaDesc')}</p>
              </div>
              <button className="btn btn-secondary btn-lg">
                {t('resources.submitResource')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .page-hero {
          position: relative;
          padding: 80px 0;
          background: var(--gray-900);
          overflow: hidden;
        }
        .page-hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(245, 158, 11, 0.2), transparent);
        }
        .page-hero-content {
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .page-hero h1 {
          font-size: 3rem;
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
        }
        .page-hero p {
          font-size: 1.2rem;
          color: var(--gray-400);
          max-width: 600px;
          margin: 0 auto;
        }

        .resources-content {
          margin-top: -40px;
        }
        .filters-card {
          background: var(--white);
          border-radius: 24px;
          box-shadow: var(--shadow-lg);
          padding: 32px;
          margin-bottom: 40px;
        }
        .filters-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--gray-100);
        }
        .filters-header .search-icon {
          color: var(--primary-color);
          font-size: 1.2rem;
        }
        .filters-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--gray-800);
        }
        .filter-group {
          margin-bottom: 20px;
        }
        .filter-group.main-search {
          margin-bottom: 24px;
        }
        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .filter-group label {
          display: block;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .filter-group select {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid var(--gray-200);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--white);
          cursor: pointer;
          transition: var(--transition);
        }
        .filter-group select:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .results-header {
          margin-bottom: 24px;
        }
        .results-count {
          font-size: 1rem;
          color: var(--gray-600);
          font-weight: 500;
        }
        .resources-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 48px;
        }
        .resource-card {
          background: var(--white);
          border-radius: 20px;
          padding: 28px;
          box-shadow: var(--shadow);
          border: 1px solid var(--gray-100);
          display: flex;
          align-items: center;
          gap: 24px;
          transition: var(--transition);
        }
        .resource-card:hover {
          transform: translateX(8px);
          box-shadow: var(--shadow-md);
          border-color: transparent;
        }
        .resource-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          flex-shrink: 0;
        }
        .resource-content {
          flex: 1;
          min-width: 0;
        }
        .resource-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .resource-header h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0;
        }
        .resource-badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .resource-type {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .resource-category {
          padding: 6px 14px;
          background: var(--gray-100);
          color: var(--gray-600);
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .resource-meta {
          display: flex;
          gap: 24px;
          font-size: 0.9rem;
          color: var(--gray-500);
        }
        .resource-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .resource-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-shrink: 0;
        }
        .action-btn {
          width: 48px;
          height: 48px;
          border: 2px solid var(--gray-200);
          background: var(--white);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          color: var(--gray-500);
          transition: var(--transition);
        }
        .action-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .no-results {
          text-align: center;
          padding: 80px 20px;
          color: var(--gray-500);
        }
        .no-results-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        .no-results h3 {
          font-size: 1.5rem;
          color: var(--gray-700);
          margin-bottom: 8px;
        }
        .cta-section {
          margin-top: 20px;
        }
        .cta-card {
          background: var(--gradient-primary);
          border-radius: 24px;
          padding: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
        }
        .cta-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }
        .cta-content p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          max-width: 500px;
        }
        .cta-card .btn-secondary {
          background: white;
          color: var(--primary-color);
        }
        .cta-card .btn-secondary:hover {
          background: var(--gray-100);
        }

        @media (max-width: 1024px) {
          .resource-card {
            flex-wrap: wrap;
          }
          .resource-actions {
            width: 100%;
            justify-content: flex-end;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--gray-100);
          }
        }
        @media (max-width: 768px) {
          .page-hero h1 {
            font-size: 2.25rem;
          }
          .filters-card {
            padding: 24px;
          }
          .resource-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .cta-card {
            flex-direction: column;
            text-align: center;
            padding: 32px 24px;
          }
          .cta-content p {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default ResourceLibrary