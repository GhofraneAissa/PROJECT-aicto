import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FaTimes, FaChevronRight, FaChevronLeft } from 'react-icons/fa'

const TOUR_STORAGE_KEY = 'sarai-tour-completed'
const TOUR_EVENT_NAME = 'sarai:start-tour'

export function startTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT_NAME))
}



function UserGuideTour() {
  const { t } = useTranslation()
  const steps = [
    {
      target: '.tour-target--logo',
      title: t('tour.welcomeTitle'),
      content: t('tour.welcomeContent'),
      position: 'bottom'
    },
    {
      target: '.tour-target--nav',
      title: t('tour.navTitle'),
      content: t('tour.navContent'),
      position: 'bottom'
    },
    {
      target: '.tour-target--guide-btn',
      title: t('tour.helpTitle'),
      content: t('tour.helpContent'),
      position: 'bottom'
    },
    {
      target: '.tour-target--signin',
      title: t('tour.signInTitle'),
      content: t('tour.signInContent'),
      position: 'bottom'
    }
  ]

  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const [highlightStyle, setHighlightStyle] = useState({})
  const tooltipRef = useRef(null)
  const highlightRef = useRef(null)

  const startTourInternal = useCallback(() => {
    setIsActive(true)
    setCurrentStep(0)
    localStorage.setItem(TOUR_STORAGE_KEY, 'false')
    document.querySelectorAll('.tour-target--highlight').forEach(el => {
      el.classList.remove('tour-target--highlight')
    })
  }, [])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    document.querySelectorAll('.tour-target--highlight').forEach(el => {
      el.classList.remove('tour-target--highlight')
    })
  }, [])

  useEffect(() => {
    const handleTourTrigger = () => {
      startTourInternal()
    }
    window.addEventListener(TOUR_EVENT_NAME, handleTourTrigger)
    return () => window.removeEventListener(TOUR_EVENT_NAME, handleTourTrigger)
  }, [startTourInternal])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }, [currentStep, endTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  useEffect(() => {
    if (!isActive) return

    const step = steps[currentStep]
    const target = document.querySelector(step.target)

    if (target) {
      target.classList.add('tour-target--highlight')

      const timer = setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

        const timer2 = setTimeout(() => {
          const rect = target.getBoundingClientRect()
          const tooltipRect = tooltipRef.current?.getBoundingClientRect()
          const tooltipWidth = tooltipRect?.width || 320
          const tooltipHeight = tooltipRect?.height || 150

          let top = 0
          let left = 0

          if (step.position === 'bottom') {
            top = rect.bottom + 16 + window.scrollY
            left = rect.left + rect.width / 2 - tooltipWidth / 2
          } else {
            top = rect.top - tooltipHeight - 16 + window.scrollY
            left = rect.left + rect.width / 2 - tooltipWidth / 2
          }

          left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
          top = Math.max(16, top)

          setTooltipStyle({
            top: `${top}px`,
            left: `${left}px`,
            position: 'absolute',
            zIndex: 10002
          })

          setHighlightStyle({
            top: `${rect.top + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            position: 'absolute',
            zIndex: 10000,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(26, 60, 110, 0.5)',
            transition: 'all 0.3s ease'
          })
        }, 100)

        return () => clearTimeout(timer2)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isActive, currentStep])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return
      if (e.key === 'Escape') endTour()
      if (e.key === 'ArrowRight') nextStep()
      if (e.key === 'ArrowLeft') prevStep()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, nextStep, prevStep, endTour])

  if (!isActive) return null

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  return (
    <>
      <div ref={highlightRef} style={highlightStyle} className="tour-highlight" onClick={nextStep} />
      <div className="tour-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />

      <div ref={tooltipRef} style={tooltipStyle} className="tour-tooltip">
        <div className="tour-tooltip__header">
          <span className="tour-tooltip__step">{t('tour.step')} {currentStep + 1} {t('tour.of')} {steps.length}</span>
          <button className="tour-tooltip__close" onClick={endTour} aria-label={t('tour.closeGuide')}>
            <FaTimes size={14} />
          </button>
        </div>
        <h4 className="tour-tooltip__title">{step.title}</h4>
        <p className="tour-tooltip__content">{step.content}</p>
        <div className="tour-tooltip__footer">
          <div className="tour-tooltip__dots">
            {steps.map((_, i) => (
              <span key={i} className={`tour-tooltip__dot ${i === currentStep ? 'tour-tooltip__dot--active' : ''}`} onClick={() => setCurrentStep(i)} />
            ))}
          </div>
          <div className="tour-tooltip__buttons">
            {currentStep > 0 && (
              <button className="tour-tooltip__btn tour-tooltip__btn--prev" onClick={prevStep}>
                <FaChevronLeft size={12} /> {t('tour.previous')}
              </button>
            )}
            <button className="tour-tooltip__btn tour-tooltip__btn--next" onClick={nextStep}>
              {isLast ? t('tour.finish') : t('tour.next')} <FaChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tour-highlight { pointer-events: auto; cursor: pointer; }
        .tour-target--highlight { position: relative; z-index: 10001; pointer-events: none; }

        .tour-tooltip {
          background: white;
          border-radius: 16px;
          padding: 0;
          width: 340px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          animation: tourFadeIn 0.3s ease;
          overflow: hidden;
          z-index: 10002;
        }

        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .tour-tooltip__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #1A3C6E;
          color: white;
        }
        .tour-tooltip__step { font-size: 12px; font-weight: 600; opacity: 0.85; }
        .tour-tooltip__close {
          background: none; border: none; color: white; cursor: pointer;
          padding: 4px; border-radius: 6px; opacity: 0.7; transition: opacity 0.2s;
        }
        .tour-tooltip__close:hover { opacity: 1; }
        .tour-tooltip__title {
          font-size: 16px; font-weight: 700; color: #111827;
          padding: 16px 16px 8px; margin: 0;
        }
        .tour-tooltip__content {
          font-size: 14px; color: #4B5563; line-height: 1.6;
          padding: 0 16px 12px; margin: 0;
        }
        .tour-tooltip__footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-top: 1px solid #E5E7EB; gap: 12px;
        }
        .tour-tooltip__dots { display: flex; gap: 6px; }
        .tour-tooltip__dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #D1D5DB; cursor: pointer; transition: all 0.2s;
        }
        .tour-tooltip__dot--active { background: #1A3C6E; width: 24px; border-radius: 4px; }
        .tour-tooltip__buttons { display: flex; gap: 8px; }
        .tour-tooltip__btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          border: none; font-family: inherit;
        }
        .tour-tooltip__btn--prev { background: #F3F4F6; color: #374151; }
        .tour-tooltip__btn--prev:hover { background: #E5E7EB; }
        .tour-tooltip__btn--next { background: #1A3C6E; color: white; }
        .tour-tooltip__btn--next:hover { background: #2A5298; }

        .tour-trigger-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 10px; border: 1.5px solid #E5E7EB;
          background: white; color: #4B5563; font-size: 0.85rem;
          font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .tour-trigger-btn:hover {
          border-color: #1A3C6E; color: #1A3C6E; background: rgba(26, 60, 110, 0.04);
        }
      `}</style>
    </>
  )
}

export { TOUR_STORAGE_KEY }
export default UserGuideTour
