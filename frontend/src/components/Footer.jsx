import { useState, useEffect } from 'react'
import { FaBrain, FaEnvelope, FaMapMarkerAlt, FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'

function Footer() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)) } catch { setUser(null) }
    }
  }, [])

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand tour-target--footer-brand">
            <div className="footer-logo">
              <div className="logo-icon">
                <FaBrain />
              </div>
              <div className="logo-text">
                <span className="logo-main">SARAI</span>
                <span className="logo-sub">{t('footer.logoSubtitle')}</span>
              </div>
            </div>
            <p className="footer-desc">
              {t('footer.brandDesc')}
            </p>
            <div className="footer-social">
              <a href="#" className="social-link"><FaTwitter /></a>
              <a href="#" className="social-link"><FaLinkedin /></a>
              <a href="#" className="social-link"><FaGithub /></a>
            </div>
          </div>

          <div className="footer-links tour-target--footer-links">
            <div className="footer-column tour-target--footer-contact">
              <h4>{t('footer.platform')}</h4>
              <ul>
                <li><a href="/stakeholders">{t('footer.stakeholderDir')}</a></li>
                <li><a href="/projects">{t('footer.projectStocktaking')}</a></li>
                {user?.role === 'admin' && <li><a href="/map">{t('footer.knowledgeMap')}</a></li>}
                <li><a href="/resources">{t('footer.resourceLibrary')}</a></li>
                <li><a href="/analytics">{t('footer.analyticsDashboard')}</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>{t('footer.resources')}</h4>
              <ul>
                <li><a href="#">{t('footer.documentation')}</a></li>
                <li><a href="#">{t('footer.apiReference')}</a></li>
                <li><a href="#">{t('footer.bestPractices')}</a></li>
                <li><a href="#">{t('footer.caseStudies')}</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>{t('footer.contact')}</h4>
              <ul className="contact-list">
                <li><FaEnvelope /> info@sarai.ai</li>
                <li><FaMapMarkerAlt /> Arab League, Cairo, Egypt</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom tour-target--footer-bottom">
          <p>{t('footer.copyright')}</p>
          <div className="footer-legal">
            <a href="#">{t('footer.privacyPolicy')}</a>
            <a href="#">{t('footer.termsOfService')}</a>
          </div>
        </div>
      </div>

      <style>{`
        .footer {
          background: var(--gray-900);
          color: var(--gray-300);
          padding: 80px 0 30px;
          margin-top: 80px;
        }
        .footer-main {
          display: grid;
          grid-template-columns: 1.5fr 2fr;
          gap: 60px;
          margin-bottom: 60px;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .footer-logo .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--gradient-primary);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
        }
        .footer-logo .logo-text {
          display: flex;
          flex-direction: column;
        }
        .footer-logo .logo-main {
          font-size: 1.4rem;
          font-weight: 800;
          color: white;
        }
        .footer-logo .logo-sub {
          font-size: 0.7rem;
          color: var(--gray-500);
          font-weight: 500;
        }
        .footer-desc {
          color: var(--gray-400);
          line-height: 1.8;
          margin-bottom: 24px;
          max-width: 320px;
        }
        .footer-social {
          display: flex;
          gap: 12px;
        }
        .social-link {
          width: 40px;
          height: 40px;
          background: var(--gray-800);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-400);
          transition: var(--transition);
        }
        .social-link:hover {
          background: var(--primary-color);
          color: white;
        }
        .footer-links {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        .footer-column h4 {
          color: white;
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .footer-column ul {
          list-style: none;
        }
        .footer-column li {
          margin-bottom: 12px;
        }
        .footer-column a {
          color: var(--gray-400);
          transition: var(--transition);
          font-size: 0.95rem;
        }
        .footer-column a:hover {
          color: white;
        }
        .contact-list li {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .footer-bottom {
          border-top: 1px solid var(--gray-800);
          padding-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          color: var(--gray-500);
        }
        .footer-legal {
          display: flex;
          gap: 24px;
        }
        .footer-legal a {
          color: var(--gray-500);
        }
        .footer-legal a:hover {
          color: white;
        }
        @media (max-width: 1024px) {
          .footer-main { grid-template-columns: 1fr; }
          .footer-links { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .footer { padding: 60px 0 24px; }
          .footer-links { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>
    </footer>
  )
}

export default Footer
