import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  FaBrain, FaBuilding, FaProjectDiagram, FaGlobeAmericas, FaBook, 
  FaChartLine, FaArrowRight, FaCheckCircle, FaNetworkWired, FaLeaf, 
  FaSearch, FaRocket, FaTimes, FaSpinner, FaArrowLeft, FaEnvelope, 
  FaUser, FaCommentAlt
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { API_BASE } from '../config'

function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [user, setUser] = useState(null)
  const [countries, setCountries] = useState([])
  const [sdgs, setSdgs] = useState([])
  const [stakeholderCount, setStakeholderCount] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  const [resourceCount, setResourceCount] = useState(0)
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { setUser(null) }
    }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/countries/`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error('Error fetching countries:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/sdgs/`)
      .then(res => res.json())
      .then(data => setSdgs(data))
      .catch(err => console.error('Error fetching SDGs:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/stakeholders/stats/count`)
      .then(res => res.json())
      .then(data => setStakeholderCount(data.count))
      .catch(err => console.error('Error fetching stakeholder count:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/projects/stats/count`)
      .then(res => res.json())
      .then(data => setProjectCount(data.count))
      .catch(err => console.error('Error fetching project count:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/resources/stats/count`)
      .then(res => res.json())
      .then(data => setResourceCount(data.count))
      .catch(err => console.error('Error fetching resource count:', err))
  }, [])

  const handleVideoCanPlay = () => {
    setIsVideoLoading(false)
  }

  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/search/suggest?q=${encodeURIComponent(q.trim())}&limit=4`
      )
      const data = await res.json()
      setSuggestions(data.results || [])
      setShowDropdown(data.results?.length > 0 || q.trim().length > 0)
    } catch {
      setSuggestions([])
    }
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    if (query.trim()) {
      setSelectedIndex(-1)
      setShowDropdown(true)
      const timer = setTimeout(() => fetchSuggestions(query), 250)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
      setShowDropdown(false)
    }
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navigateTo = useCallback((item) => {
    setShowDropdown(false)
    if (item.entity_type === 'project') navigate(`/projects/${item.id}`)
    else if (item.entity_type === 'stakeholder') navigate(`/stakeholders?highlight=${item.id}`)
    else if (item.entity_type === 'resource') navigate(`/resources?highlight=${item.id}`)
  }, [navigate])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      navigateTo(suggestions[selectedIndex])
      return
    }
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
    setShowDropdown(false)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown || !suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const entityIcons = {
    project: <FaProjectDiagram />,
    stakeholder: <FaBuilding />,
    resource: <FaBook />,
  }
  const entityColors = {
    project: '#059669',
    stakeholder: '#2563eb',
    resource: '#f59e0b',
  }

  const stats = [
    { icon: <FaBuilding />, number: stakeholderCount > 0 ? stakeholderCount + '+' : '0', label: t('home.statsStakeholders'), color: '#2563eb' },
    { icon: <FaProjectDiagram />, number: projectCount > 0 ? projectCount + '+' : '0', label: t('home.statsProjects'), color: '#059669' },
    { icon: <FaGlobeAmericas />, number: countries.length.toString(), label: t('home.statsCountries'), color: '#7c3aed' },
    { icon: <FaBook />, number: resourceCount > 0 ? resourceCount + '+' : '0', label: t('home.statsResources'), color: '#f59e0b' }
  ]

  const features = [
    {
      icon: <FaBuilding />,
      title: t('home.featureStakeholderTitle'),
      desc: t('home.featureStakeholderDesc'),
      link: '/stakeholders',
      color: '#2563eb'
    },
    {
      icon: <FaProjectDiagram />,
      title: t('home.featureProjectTitle'),
      desc: t('home.featureProjectDesc'),
      link: '/projects',
      color: '#059669'
    },
    {
      icon: <FaGlobeAmericas />,
      title: t('home.featureMapTitle'),
      desc: t('home.featureMapDesc'),
      link: '/map',
      color: '#7c3aed'
    },
    {
      icon: <FaBook />,
      title: t('home.featureResourceTitle'),
      desc: t('home.featureResourceDesc'),
      link: '/resources',
      color: '#f59e0b'
    },
    {
      icon: <FaChartLine />,
      title: t('home.featureAnalyticsTitle'),
      desc: t('home.featureAnalyticsDesc'),
      link: '/analytics',
      color: '#ec4899'
    },
    {
      icon: <FaLeaf />,
      title: t('home.featureSdgTitle'),
      desc: t('home.featureSdgDesc'),
      link: '/sdgs',
      color: '#22c55e'
    }
  ]

  const benefits = [
    { icon: <FaNetworkWired />, title: t('home.networking'), desc: t('home.networkingDesc') },
    { icon: <FaCheckCircle />, title: t('home.standards'), desc: t('home.standardsDesc') },
    { icon: <FaBrain />, title: t('home.innovation'), desc: t('home.innovationDesc') }
  ]

  const handleContactChange = (e) => setContactForm({ ...contactForm, [e.target.name]: e.target.value })

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      if (!res.ok) throw new Error('Failed to send message')
      toast.success(t('contact.successMessage'))
      setContactForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      toast.error(t('contact.errorMessage'))
    }
  }

  return (
    <div className="home">
      {/* Hero Section avec une seule vidéo */}
      <section className="hero hero-with-video">
        <div className="hero-video-container">
          <video
            ref={videoRef}
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={handleVideoCanPlay}
            onError={() => {
              console.error('Video failed to load')
              setIsVideoLoading(false)
            }}
          >
            <source src="/videos/VideoProject.mp4" type="video/mp4" />
          </video>
          {isVideoLoading && <div className="hero-video-placeholder"></div>}
          <div className="hero-video-overlay"></div>
        </div>
        
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        
        <div className="container hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            {t('home.heroBadge')}
          </div>
          <h1 className="hero-title">
            {t('home.heroTitle')}
            <span className="hero-title-gradient">{t('home.heroTitleGradient')}</span>
          </h1>
          <p className="hero-desc">
            {t('home.heroDesc')}
          </p>
          <div className="search-wrapper" ref={dropdownRef}>
            <form className="search-bar" onSubmit={handleSearchSubmit}>
              <FaSearch className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => query.trim() && setShowDropdown(true)}
                autoComplete="off"
              />
              {query && (
                <button type="button" className="search-clear" onClick={() => { setQuery(''); setShowDropdown(false); inputRef.current?.focus() }}>
                  <FaTimes />
                </button>
              )}
              <button type="submit" className="search-btn">
                {searchLoading ? <FaSpinner className="spin" /> : 'Explore'}
              </button>
            </form>
            {showDropdown && (
              <div className="search-dropdown">
                {searchLoading ? (
                  <div className="search-dropdown-loading"><FaSpinner className="spin" /> {t('search.searching')}</div>
                ) : suggestions.length === 0 ? (
                  <div className="search-dropdown-empty">
                    <FaSearch /> {t('search.noResultsFor')} "<strong>{query}</strong>"
                  </div>
                ) : (
                  <>
                    <div className="search-dropdown-results">
                      {suggestions.map((item, i) => (
                        <div
                          key={`${item.entity_type}-${item.id}`}
                          className={`search-dropdown-item ${i === selectedIndex ? 'selected' : ''}`}
                          onClick={() => { navigateTo(item) }}
                          onMouseEnter={() => setSelectedIndex(i)}
                        >
                          <div className="sdi-icon" style={{ color: entityColors[item.entity_type] }}>
                            {entityIcons[item.entity_type]}
                          </div>
                          <div className="sdi-content">
                            <div className="sdi-title">{item.title}</div>
                            <div className="sdi-meta">
                              {item.subtitle && <span>{item.subtitle}</span>}
                              {item.tag && <span className="sdi-tag">{item.tag}</span>}
                            </div>
                            {item.description && <div className="sdi-desc">{item.description}</div>}
                          </div>
                          <div className="sdi-type" style={{ color: entityColors[item.entity_type] }}>
                            {item.entity_type}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      to={`/search?q=${encodeURIComponent(query.trim())}`}
                      className="search-dropdown-footer"
                      onClick={() => setShowDropdown(false)}
                    >
                      <FaArrowLeft /> {t('search.viewAllResults')} "<strong>{query}</strong>"
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {user && (
            <div className="hero-actions">
              <Link to="/projects" className="btn btn-primary btn-lg">
                <FaRocket /> {t('home.submitProject')}
              </Link>
              <Link to="/map" className="btn btn-secondary btn-lg">
                <FaGlobeAmericas /> {t('home.exploreMap')}
              </Link>
            </div>
          )}
          <div className="hero-stats">
            {stats.map((stat, index) => (
              <div key={index} className="hero-stat">
                <div className="hero-stat-icon" style={{ color: stat.color }}>
                  {stat.icon}
                </div>
                <div className="hero-stat-info">
                  <span className="hero-stat-number">{stat.number}</span>
                  <span className="hero-stat-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-scroll">
          <div className="scroll-indicator"></div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits section">
        <div className="container">
          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">{benefit.icon}</div>
                <div className="benefit-content">
                  <h3>{benefit.title}</h3>
                  <p>{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country Marquee Section */}
      <section className="country-marquee-section">
        <div className="country-marquee-header">
          <h2>{t('home.exploreCountryData')}</h2>
          <p>{t('home.exploreCountryDataDesc')}</p>
        </div>
        <div className="country-marquee-container">
          <div className="country-marquee-track">
            {[...countries, ...countries].map((country, index) => (
              <div key={index} className="country-marquee-item" title={country.country}>
                <div className="country-marquee-flag">
                  {country.icon_url ? (
                    <img src={country.icon_url} alt={`${country.country} flag`} />
                  ) : (
                    <div className="country-marquee-fallback">{country.country?.charAt(0) || '?'}</div>
                  )}
                </div>
                <span className="country-marquee-name">{country.country}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Platform Modules */}
      <section className="features section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">{t('home.platformModules')}</span>
            <h2 className="section-title">{t('home.featuresTitle')}</h2>
            <p className="section-desc">
              {t('home.featuresDesc')}
            </p>
          </div>
          <div className="grid grid-3">
            {features.map((feature, index) => (
              <Link to={feature.link} key={index} className="feature-card">
                <div className="feature-icon-wrapper" style={{ background: `${feature.color}15`, color: feature.color }}>
                  <div className="feature-icon">{feature.icon}</div>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <div className="feature-link">
                  {t('home.learnMore')} <FaArrowRight />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Join the Arab AI Community */}
      <section className="cta section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-bg"></div>
            <div className="cta-content">
              <h2>{t('home.ctaTitle')}</h2>
              <p>{t('home.ctaDesc')}</p>
              <div className="cta-actions">
                <Link to="/stakeholders" className="btn btn-primary btn-lg">
                  {t('home.getStarted')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - Get in Touch */}
      <section className="contact section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">{t('contact.getInTouch')}</span>
            <h2 className="section-title">{t('contact.title')}</h2>
            <p className="section-desc">{t('contact.desc')}</p>
          </div>
          <div className="contact-wrapper">
            <div className="contact-form-card">
              <form onSubmit={handleContactSubmit} className="contact-form">
                <div className="contact-form-row">
                  <div className="contact-field">
                    <label><FaUser /> {t('contact.yourName')}</label>
                    <input type="text" name="name" value={contactForm.name} onChange={handleContactChange} required placeholder={t('contact.namePlaceholder')} />
                  </div>
                  <div className="contact-field">
                    <label><FaEnvelope /> {t('contact.yourEmail')}</label>
                    <input type="email" name="email" value={contactForm.email} onChange={handleContactChange} required placeholder={t('contact.emailPlaceholder')} />
                  </div>
                </div>
                <div className="contact-field">
                  <label><FaCommentAlt /> {t('contact.subject')}</label>
                  <input type="text" name="subject" value={contactForm.subject} onChange={handleContactChange} required placeholder={t('contact.subjectPlaceholder')} />
                </div>
                <div className="contact-field">
                  <label><FaCommentAlt /> {t('contact.yourMessage')}</label>
                  <textarea name="message" value={contactForm.message} onChange={handleContactChange} required rows="5" placeholder={t('contact.messagePlaceholder')}></textarea>
                </div>
                <button type="submit" className="contact-submit-btn">{t('contact.sendMessage')} <FaArrowRight /></button>
              </form>
            </div>
            <div className="contact-info">
              <div className="contact-info-item">
                <div className="contact-info-icon"><FaEnvelope /></div>
                <div>
                  <h4>{t('contact.email')}</h4>
                  <p>contact@arabi-stocktaking.ai</p>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon"><FaGlobeAmericas /></div>
                <div>
                  <h4>{t('contact.location')}</h4>
                  <p>{t('contact.arabRegion')}</p>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon"><FaProjectDiagram /></div>
                <div>
                  <h4>{t('contact.partnerships')}</h4>
                  <p>partners@arabi-stocktaking.ai</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Hero avec vidéo */
        .hero-with-video {
          position: relative;
          overflow: hidden;
        }
        
        .hero-video-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        
        .hero-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .hero-video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 100%);
          z-index: 1;
        }
        
        .hero-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(10, 10, 42, 0.6) 0%, rgba(26, 26, 74, 0.7) 100%);
          z-index: 2;
        }
        
        .hero-with-video .hero-content {
          position: relative;
          z-index: 10;
        }
        
        .hero-with-video .hero-badge,
        .hero-with-video .hero-title,
        .hero-with-video .hero-desc {
          color: #ffffff;
        }
        
        .hero-with-video .hero-title-gradient {
          background: linear-gradient(135deg, #60a5fa, #c084fc, #f472b6);
          -webkit-background-clip: text;
          background-clip: text;
        }
        
        .hero-with-video .hero-desc {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .hero-with-video .hero-stat {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .hero-with-video .hero-stat-number {
          color: #ffffff;
        }
        
        .hero-with-video .hero-stat-label {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .hero-with-video .hero-stat-icon {
          color: rgba(255, 255, 255, 0.9) !important;
        }
        
        .hero-with-video .search-bar {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
        }
        
        .hero-with-video .hero-scroll .scroll-indicator {
          border-color: rgba(255, 255, 255, 0.4);
        }
        
        .hero-with-video .hero-scroll .scroll-indicator::before {
          background: rgba(255, 255, 255, 0.8);
        }
        
        .hero-with-video .blob {
          z-index: 5;
          opacity: 0.2;
        }

        /* Blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          pointer-events: none;
          z-index: 0;
        }
        .blob-1 {
          width: 600px;
          height: 600px;
          background: #2563eb;
          top: -200px;
          right: -150px;
          animation: float 8s ease-in-out infinite;
        }
        .blob-2 {
          width: 400px;
          height: 400px;
          background: #7c3aed;
          bottom: -100px;
          left: -100px;
          animation: float 10s ease-in-out infinite reverse;
        }
        .blob-3 {
          width: 300px;
          height: 300px;
          background: #059669;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: float 12s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        
        /* Search Wrapper & Dropdown */
        .search-wrapper {
          position: relative;
          max-width: 640px;
          margin: 0 auto 36px;
        }
        .search-bar {
          display: flex;
          align-items: center;
          background: #ffffff;
          padding: 8px;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          gap: 8px;
          position: relative;
        }
        .search-icon {
          color: #9ca3af;
          font-size: 1.1rem;
          margin-left: 16px;
          flex-shrink: 0;
        }
        .search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 14px 12px;
          font-size: 1rem;
          color: #111827;
          background: transparent;
          min-width: 0;
        }
        .search-input::placeholder {
          color: #9ca3af;
        }
        .search-clear {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .search-clear:hover {
          color: #6b7280;
        }
        .search-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 14px 32px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .search-btn:hover {
          background: #1d4ed8;
        }
        .search-btn .spin {
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .search-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.15);
          overflow: hidden;
          z-index: 1000;
          animation: fadeDown 0.2s ease;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .search-dropdown-loading,
        .search-dropdown-empty {
          padding: 32px 24px;
          text-align: center;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 0.95rem;
        }
        .search-dropdown-loading .spin {
          animation: spin 0.6s linear infinite;
        }
        .search-dropdown-results {
          max-height: 420px;
          overflow-y: auto;
        }
        .search-dropdown-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #f3f4f6;
        }
        .search-dropdown-item:last-child {
          border-bottom: none;
        }
        .search-dropdown-item:hover,
        .search-dropdown-item.selected {
          background: #f0f4ff;
        }
        .sdi-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 2px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border-radius: 10px;
        }
        .sdi-content {
          flex: 1;
          min-width: 0;
        }
        .sdi-title {
          font-weight: 600;
          color: #111827;
          font-size: 0.95rem;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sdi-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .sdi-tag {
          background: #f3f4f6;
          padding: 1px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #4b5563;
        }
        .sdi-desc {
          font-size: 0.8rem;
          color: #9ca3af;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: normal;
        }
        .sdi-type {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          background: #f9fafb;
          padding: 3px 10px;
          border-radius: 8px;
          margin-top: 2px;
        }
        .search-dropdown-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: #f9fafb;
          color: #2563eb;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          border-top: 1px solid #f3f4f6;
          transition: background 0.15s;
        }
        .search-dropdown-footer:hover {
          background: #eff6ff;
        }
        
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding: 120px 0 80px;
        }
        
        .hero-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          padding: 10px 24px;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #2563eb;
          margin-bottom: 32px;
        }
        
        .badge-dot {
          width: 8px;
          height: 8px;
          background: #2563eb;
          border-radius: 50%;
          animation: pulse-glow 2s infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        .hero-title {
          font-size: 3.75rem;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 24px;
          letter-spacing: -1px;
        }
        
        .hero-title-gradient {
          display: block;
          background: linear-gradient(135deg, #2563eb, #7c3aed, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-desc {
          font-size: 1.25rem;
          line-height: 1.8;
          margin-bottom: 40px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .hero-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-bottom: 40px;
        }
        
        .btn-lg {
          padding: 18px 36px;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        
        .btn-primary {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
        }
        
        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
        }
        
        .hero-stat {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #ffffff;
          padding: 20px 28px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .hero-stat:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        
        .hero-stat-icon {
          font-size: 2rem;
        }
        
        .hero-stat-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .hero-stat-number {
          font-size: 1.75rem;
          font-weight: 800;
          color: #111827;
        }
        
        .hero-stat-label {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
        }
        
        .hero-scroll {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        }
        
        .scroll-indicator {
          width: 28px;
          height: 48px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 20px;
          position: relative;
        }
        
        .scroll-indicator::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 8px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 2px;
          animation: scrollBounce 2s infinite;
        }
        
        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
          50% { transform: translateX(-50%) translateY(12px); opacity: 0.3; }
        }

        /* Benefits Section */
        .benefits {
          padding: 60px 0;
          margin-top: -40px;
          position: relative;
          z-index: 2;
        }
        
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .benefit-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #ffffff;
          padding: 28px;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #f1f5f9;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .benefit-card:hover {
          transform: translateX(8px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }
        
        .benefit-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.4rem;
          flex-shrink: 0;
        }
        
        .benefit-content h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        
        .benefit-content p {
          font-size: 0.9rem;
          color: #64748b;
        }

        /* Country Marquee Section */
        .country-marquee-section {
          background-color: #f4f2f7;
          padding: 5rem 2rem;
          width: 100%;
          overflow: hidden;
        }
        
        .country-marquee-header {
          text-align: center;
          margin-bottom: 3.5rem;
        }
        
        .country-marquee-header h2 {
          font-size: 2rem;
          font-weight: 800;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 0.75rem;
        }
        
        .country-marquee-header p {
          color: #4d4949;
          font-size: 1rem;
          margin: 0;
        }
        
        .country-marquee-container {
          width: 100%;
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        
        .country-marquee-track {
          display: flex;
          gap: 2rem;
          width: max-content;
          animation: marqueeScroll 40s linear infinite;
        }
        
        .country-marquee-track:hover {
          animation-play-state: paused;
        }
        
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .country-marquee-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        
        .country-marquee-flag {
          width: 88px;
          height: 88px;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0,0,0,0.35);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          flex-shrink: 0;
        }
        
        .country-marquee-item:hover .country-marquee-flag {
          transform: translateY(-5px) scale(1.07);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        
        .country-marquee-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff;
          font-size: 2rem;
          font-weight: 800;
        }
        
        .country-marquee-flag img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #f4f2f7;
          display: block;
        }
        
        .country-marquee-name {
          font-size: 11px;
          font-weight: 700;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          text-align: center;
          max-width: 88px;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Features Section */
        .features {
          padding: 80px 0;
          background: #f8fafc;
        }
        
        .section-header {
          text-align: center;
          margin-bottom: 48px;
        }
        
        .section-subtitle {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #2563eb;
          margin-bottom: 16px;
        }
        
        .section-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
        }
        
        .section-desc {
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .grid {
          display: grid;
          gap: 30px;
        }
        
        .grid-3 {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        .feature-card {
          background: #ffffff;
          padding: 36px;
          border-radius: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #f1f5f9;
          transition: transform 0.3s, box-shadow 0.3s;
          text-align: center;
          color: inherit;
          text-decoration: none;
        }
        
        .feature-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-color: transparent;
        }
        
        .feature-icon-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 2rem;
          transition: transform 0.3s;
        }
        
        .feature-card:hover .feature-icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }
        
        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }
        
        .feature-card p {
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        
        .feature-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #2563eb;
          font-weight: 600;
          font-size: 0.95rem;
          transition: gap 0.3s;
        }
        
        .feature-link svg {
          transition: transform 0.3s;
        }
        
        .feature-card:hover .feature-link svg {
          transform: translateX(6px);
        }

        /* CTA Section */
        .cta {
          padding: 80px 0;
        }
        
        .cta-card {
          position: relative;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border-radius: 32px;
          padding: 60px;
          overflow: hidden;
        }
        
        .cta-bg {
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='white' stroke-opacity='0.1' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='30' fill='none' stroke='white' stroke-opacity='0.1' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='20' fill='none' stroke='white' stroke-opacity='0.1' stroke-width='0.5'/%3E%3C/svg%3E") center/200px repeat;
          opacity: 0.5;
        }
        
        .cta-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .cta-content h2 {
          font-size: 2.25rem;
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
        }
        
        .cta-content p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          margin-bottom: 32px;
        }
        
        .cta .btn-primary {
          background: white;
          color: #2563eb;
        }
        
        .cta .btn-primary:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
        }

        /* Contact Section */
        .contact {
          padding: 80px 0;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
        }
        
        .contact-wrapper {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
          align-items: start;
          margin-top: 48px;
        }
        
        .contact-form-card {
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          border: 1px solid #f1f5f9;
        }
        
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .contact-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        .contact-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .contact-field label {
          font-weight: 700;
          font-size: 0.85rem;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .contact-field label svg {
          color: #2563eb;
          font-size: 0.9rem;
        }
        
        .contact-field input,
        .contact-field textarea {
          padding: 14px 18px;
          border-radius: 14px;
          border: 2px solid #f1f5f9;
          background: #f8fafc;
          font-family: inherit;
          font-size: 1rem;
          outline: none;
          transition: 0.2s;
        }
        
        .contact-field input:focus,
        .contact-field textarea:focus {
          border-color: #2563eb;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05);
        }
        
        .contact-field textarea {
          resize: vertical;
          min-height: 120px;
        }
        
        .contact-submit-btn {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: #0f172a;
          color: #fff;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: 0.3s;
          font-family: inherit;
        }
        
        .contact-submit-btn:hover {
          background: #1e293b;
          transform: translateY(-2px);
        }
        
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .contact-info-item {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #fff;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          transition: 0.3s;
        }
        
        .contact-info-item:hover {
          transform: translateX(6px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }
        
        .contact-info-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .contact-info-item h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
        }
        
        .contact-info-item p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-title { font-size: 2.75rem; }
          .hero-stats { gap: 24px; }
        }
        
        @media (max-width: 768px) {
          .hero { padding: 100px 0 60px; }
          .hero-title { font-size: 2.25rem; }
          .hero-desc { font-size: 1.1rem; }
          .hero-actions { flex-direction: column; align-items: center; }
          .hero-stats { flex-direction: column; align-items: center; }
          .hero-stat { width: 100%; max-width: 280px; }
          .cta-card { padding: 40px 24px; }
          .search-bar { flex-direction: row; flex-wrap: wrap; }
          .search-bar .search-input { padding: 14px 12px; flex: 1; min-width: 120px; }
          .contact-wrapper { grid-template-columns: 1fr; }
          .contact-form-row { grid-template-columns: 1fr; }
          .contact-form-card { padding: 24px; }
          .search-btn { width: auto; }
        }
      `}</style>
    </div>
  )
}

export default Home