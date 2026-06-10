import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaUsers, FaSearch } from 'react-icons/fa'
import StakeholdersByCountry from '../components/StakeholdersByCountry'

const STAKEHOLDER_TYPES = [
  'All', 'Research Lab', 'University', 'Government', 'Business', 'NGO', 'Industry', 'Research'
]

function StakeholderDirectory() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  return (
    <div className="modern-directory">
      {/* Dynamic Hero - Design moderne */}
      <section className="directory-hero">
        <div className="animated-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        
        <div className="container hero-container">
          <div className="hero-content animate-up">
            <div className="hero-badge">
              <FaUsers />
              <span>{t('stakeholders.heroBadge', 'Regional Ecosystem')}</span>
            </div>
            <h1>{t('stakeholders.pageTitle')} <span className="text-gradient">{t('stakeholders.titleGradient', 'Directory')}</span></h1>
            <p>{t('stakeholders.pageDesc')}</p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="directory-body">
        <div className="container">
          {/* Search & Filter Card */}
          <div className="search-filter-card animate-up delay-1">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('stakeholders.searchPlaceholder', 'Search stakeholders...')}
                className="directory-search-input"
              />
            </div>
            <select
              className="type-filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              {STAKEHOLDER_TYPES.map(type => (
                <option key={type} value={type}>{t(`stakeholders.filter${type === 'All' ? 'All' : type.replace(/ /g, '')}`, type)}</option>
              ))}
            </select>
          </div>

          {/* Results Area */}
          <div className="results-area animate-up delay-2">
            <StakeholdersByCountry searchQuery={searchQuery} typeFilter={typeFilter} />
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .modern-directory {
          --d-primary: #2563eb;
          --d-secondary: #0f172a;
          --d-text: #1e293b;
          --d-text-light: #64728b;
          --d-glass: rgba(255, 255, 255, 0.8);
          
          font-family: 'Outfit', sans-serif;
          color: var(--d-text);
          background: #fff;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero Section - Design moderne */
        .directory-hero {
          position: relative;
          padding: 120px 0 80px;
          background: #fff;
          overflow: hidden;
          text-align: center;
        }

        .animated-blobs {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          filter: blur(70px);
          opacity: 0.3;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          background: var(--d-primary);
          animation: float 15s infinite alternate;
        }

        .blob-1 {
          width: 300px;
          height: 300px;
          top: -50px;
          right: 5%;
          background: #60a5fa;
        }

        .blob-2 {
          width: 250px;
          height: 250px;
          bottom: -50px;
          left: 5%;
          background: #93c5fd;
          animation-delay: -5s;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 20px) scale(1.1); }
        }

        .hero-container {
          position: relative;
          z-index: 2;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(37, 99, 235, 0.08);
          border-radius: 100px;
          color: var(--d-primary);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        .directory-hero h1 {
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

        .directory-hero p {
          font-size: 1.2rem;
          color: var(--d-text-light);
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Body Section */
        .directory-body {
          padding-bottom: 100px;
        }

        /* Search & Filter Card */
        .search-filter-card {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
          margin-bottom: 32px;
          margin-top: -20px;
          position: relative;
          z-index: 10;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--d-text-light);
          font-size: 0.85rem;
        }

        .directory-search-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          font-size: 0.9rem;
          font-family: 'Outfit', sans-serif;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .directory-search-input:focus {
          outline: none;
          border-color: var(--d-primary);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .type-filter-select {
          padding: 10px 14px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          font-size: 0.9rem;
          font-family: 'Outfit', sans-serif;
          background: #f8fafc;
          color: var(--d-text);
          cursor: pointer;
          transition: all 0.2s;
          min-width: 140px;
        }

        .type-filter-select:focus {
          outline: none;
          border-color: var(--d-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Results Area */
        .results-area {
          margin-top: 20px;
        }

        /* Animations */
        .animate-up {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.6s forwards;
        }

        .delay-1 {
          animation-delay: 0.1s;
        }

        .delay-2 {
          animation-delay: 0.2s;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .search-filter-card {
            flex-direction: column;
            padding: 12px;
          }
          
          .search-input-wrapper {
            width: 100%;
          }

          .type-filter-select {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .directory-hero {
            padding: 80px 0 60px;
          }
          
          .directory-hero h1 {
            font-size: 2rem;
          }
          
          .directory-hero p {
            font-size: 1rem;
          }
          
          .container {
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default StakeholderDirectory