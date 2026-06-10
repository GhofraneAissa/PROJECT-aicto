import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FaBrain, FaBars, FaTimes, FaUser, FaSignOutAlt, FaUserCircle, FaQuestionCircle, FaGlobe, FaClipboardList, FaBook } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { startTour } from './UserGuideTour'

function Navbar() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef(null)
  const langDropdownRef = useRef(null)
  const navigate = useNavigate()
  const isHome = pathname === '/'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    setLangOpen(false)
  }

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' }
  ]

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_type')
    localStorage.removeItem('user')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('token_type')
    sessionStorage.removeItem('user')
    setUser(null)
    setProfileOpen(false)
    navigate('/')
  }

  const isLoggedIn = !!user
  const displayName = user?.organization_name || user?.email || 'User'
  const displayEmail = user?.email || ''
  const initials = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/stakeholders', label: t('nav.stakeholders') },
    { path: '/projects', label: t('nav.projects') },
    { path: '/map', label: t('nav.map') },
    { path: '/resources', label: t('nav.resources') },
    { path: '/analytics', label: t('nav.analytics') },
    { path: '/sdgs', label: t('nav.sdgs') }
  ]

  return (
    <nav className={`navbar ${isHome ? (scrolled ? 'navbar-scrolled' : 'navbar-home') : ''}`}>
      <div className="container navbar-content">
        <Link to="/" className="logo tour-target--logo">
          <div className="logo-icon">
            <FaBrain />
          </div>
          <div className="logo-text">
            <span className="logo-main">SARAI</span>
            <span className="logo-sub">{t('nav.logoSubtitle')}</span>
          </div>
        </Link>

        <div className="nav-center tour-target--nav">
          <ul className="nav-links">
            {navLinks.map(link => (
              <li key={link.path}>
                <Link to={link.path} className="nav-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-actions">
          {!isLoggedIn && (
            <button className="tour-trigger-btn tour-target--guide-btn" onClick={startTour} title={t('nav.takeTour')}>
              <FaQuestionCircle /> {t('nav.guide')}
            </button>
          )}
          {isLoggedIn ? (
            <div className="profile-dropdown" ref={dropdownRef}>
              <button
                className="avatar-btn"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label={t('nav.myProfile')}
              >
                {user?.logo ? (
                  <img src={user.logo} alt={displayName} className="avatar-img" />
                ) : (
                  <span className="avatar-placeholder">{initials}</span>
                )}
              </button>

              {profileOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {user?.logo ? (
                        <img src={user.logo} alt={displayName} />
                      ) : (
                        <FaUserCircle size={40} />
                      )}
                    </div>
                    <div className="dropdown-user-info">
                      <span className="dropdown-user-name">{displayName}</span>
                      <span className="dropdown-user-email">{displayEmail}</span>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <Link to="/profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                    <FaUser size={16} />
                    <span>{t('nav.myProfile')}</span>
                  </Link>

                  <Link to="/my-projects" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                    <FaBook size={16} />
                    <span>{t('nav.myPublications')}</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <>
                      <Link to="/admin" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                        <FaClipboardList size={16} />
                        <span>{t('nav.moderation')}</span>
                      </Link>
                      <div className="dropdown-divider"></div>
                    </>
                  )}

                  <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                    <FaSignOutAlt size={16} />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/auth.html" className="nav-cta btn btn-primary tour-target--signin">
              {t('nav.signIn')}
            </a>
          )}

          <div className="lang-switcher" ref={langDropdownRef}>
            <button className="lang-btn" onClick={() => setLangOpen(!langOpen)} aria-label={t('nav.language')}>
              <FaGlobe size={14} /> {i18n.language.toUpperCase()}
            </button>
            {langOpen && (
              <div className="lang-dropdown">
                {languages.map(lng => (
                  <button
                    key={lng.code}
                    className={`lang-option ${i18n.language === lng.code ? 'active' : ''}`}
                    onClick={() => changeLanguage(lng.code)}
                  >
                    {lng.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mobile-menu">
          <ul className="mobile-nav-links">
            {navLinks.map(link => (
              <li key={link.path}>
                <Link to={link.path} className="mobile-nav-link" onClick={() => setIsOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {!isLoggedIn && (
            <a href="/auth.html" className="mobile-cta btn btn-primary">
              {t('nav.signIn')}
            </a>
          )}
        </div>
      )}

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          min-height: 72px;
          display: flex;
          align-items: center;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .navbar-home {
          background: transparent;
          border-bottom: 1px solid transparent;
        }
        .navbar-home .logo-main { color: #ffffff; }
        .navbar-home .logo-sub { color: rgba(255, 255, 255, 0.7); }
        .navbar-home .nav-link { color: rgba(255, 255, 255, 0.85); }
        .navbar-home .nav-link:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
        .navbar-home .mobile-toggle { color: rgba(255, 255, 255, 0.85); }
        .navbar-home .tour-trigger-btn { border-color: rgba(255, 255, 255, 0.3); background: transparent; color: rgba(255, 255, 255, 0.85); }
        .navbar-home .tour-trigger-btn:hover { border-color: #ffffff; color: #ffffff; background: rgba(255, 255, 255, 0.1); }
        .navbar-home .lang-btn { border-color: rgba(255, 255, 255, 0.3); background: transparent; color: rgba(255, 255, 255, 0.85); }
        .navbar-home .lang-btn:hover { border-color: #ffffff; color: #ffffff; }
        .navbar-home .avatar-placeholder { border-color: rgba(255, 255, 255, 0.3); }
        .navbar-scrolled {
          background: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }
        .navbar-scrolled .logo-main { color: var(--gray-900); }
        .navbar-scrolled .logo-sub { color: var(--gray-500); }
        .navbar-scrolled .nav-link { color: var(--gray-600); }
        .navbar-scrolled .nav-link:hover { background: var(--gray-100); color: var(--primary-color); }
        .navbar-scrolled .mobile-toggle { color: var(--gray-700); }
        .navbar-scrolled .tour-trigger-btn { border-color: var(--gray-200); background: var(--white); color: var(--gray-600); }
        .navbar-scrolled .tour-trigger-btn:hover { border-color: var(--primary-color); color: var(--primary-color); background: rgba(37, 99, 235, 0.04); }
        .navbar-scrolled .lang-btn { border-color: var(--gray-200); background: var(--white); color: var(--gray-600); }
        .navbar-scrolled .lang-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }

        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          max-width: 1280px;
          margin: 0 auto;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--gradient-primary);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .logo-text {
          display: flex;
          flex-direction: column;
        }
        .logo-main {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.5px;
        }
        .logo-sub {
          font-size: 0.7rem;
          color: var(--gray-500);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .nav-center {
          display: flex;
          align-items: center;
        }
        .nav-links {
          display: flex;
          list-style: none;
          gap: 8px;
        }
        .nav-link {
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 500;
          color: var(--gray-600);
          transition: var(--transition);
          font-size: 0.95rem;
        }
        .nav-link:hover {
          background: var(--gray-100);
          color: var(--primary-color);
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .tour-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          border: 1.5px solid var(--gray-200);
          background: var(--white);
          color: var(--gray-600);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          font-family: inherit;
        }
        .tour-trigger-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
          background: rgba(37, 99, 235, 0.04);
        }
        .nav-cta {
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
        }
        .profile-dropdown {
          position: relative;
        }
        .avatar-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          border-radius: 50%;
          transition: var(--transition);
        }
        .avatar-btn:hover {
          transform: scale(1.05);
        }
        .avatar-btn:active {
          transform: scale(0.95);
        }
        .avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--gray-200);
        }
        .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          border: 2px solid transparent;
          transition: var(--transition);
        }
        .avatar-btn:hover .avatar-placeholder {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 260px;
          background: var(--white);
          border-radius: 16px;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--gray-100);
          animation: dropdownFade 0.2s ease;
          z-index: 1001;
          overflow: hidden;
        }
        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dropdown-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
        }
        .dropdown-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--gray-100);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-500);
          overflow: hidden;
          flex-shrink: 0;
        }
        .dropdown-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .dropdown-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .dropdown-user-name {
          font-weight: 600;
          color: var(--gray-900);
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-user-email {
          font-size: 0.8rem;
          color: var(--gray-500);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-divider {
          height: 1px;
          background: var(--gray-100);
          margin: 0 8px;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: var(--gray-700);
          font-size: 0.9rem;
          font-weight: 500;
          transition: var(--transition);
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          text-decoration: none;
        }
        .dropdown-item:hover {
          background: var(--gray-50);
          color: var(--primary-color);
        }
        .dropdown-item svg {
          flex-shrink: 0;
        }
        .dropdown-logout {
          color: var(--red-500);
        }
        .dropdown-logout:hover {
          background: rgba(239, 68, 68, 0.05);
          color: var(--red-500);
        }
        .mobile-menu {
          display: none;
          padding: 16px 24px;
          background: var(--white);
          border-top: 1px solid var(--gray-100);
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mobile-nav-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 16px;
        }
        .mobile-nav-link {
          display: block;
          padding: 12px 16px;
          border-radius: 10px;
          font-weight: 500;
          color: var(--gray-600);
          transition: var(--transition);
        }
        .mobile-nav-link:hover {
          background: var(--gray-100);
          color: var(--primary-color);
        }
        .mobile-cta {
          display: block;
          text-align: center;
          width: 100%;
        }
        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          font-size: 1.4rem;
          cursor: pointer;
          color: var(--gray-700);
          padding: 8px;
        }
        .lang-switcher { position: relative; }
        .lang-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 12px; border-radius: 8px;
          border: 1.5px solid var(--gray-200);
          background: var(--white); color: var(--gray-600);
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          transition: var(--transition); font-family: inherit;
        }
        .lang-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
        .lang-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: var(--white); border-radius: 10px;
          box-shadow: var(--shadow-lg); border: 1px solid var(--gray-100);
          overflow: hidden; z-index: 1001; min-width: 120px;
          animation: dropdownFade 0.2s ease;
        }
        .lang-option {
          display: block; width: 100%; padding: 10px 14px;
          border: none; background: none; cursor: pointer;
          font-size: 0.85rem; color: var(--gray-700);
          text-align: left; transition: var(--transition);
          font-family: inherit; white-space: nowrap;
        }
        .lang-option:hover { background: var(--gray-50); color: var(--primary-color); }
        .lang-option.active { color: var(--primary-color); font-weight: 600; }

        @media (max-width: 1024px) {
          .nav-center { display: none; }
          .nav-cta { display: none; }
          .tour-trigger-btn { display: none; }
          .lang-switcher { display: none; }
          .mobile-toggle { display: flex; }
          .mobile-menu { display: block; }
        }
        @media (max-width: 768px) {
          .navbar-content { padding: 12px 16px; }
          .logo-sub { display: none; }
          .dropdown-menu { right: -8px; width: 240px; }
        }
      `}</style>
    </nav>
  )
}

export default Navbar
