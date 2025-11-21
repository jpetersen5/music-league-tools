import { useState, useEffect, useId, ReactNode } from 'react'
import chevronIcon from '/chevron-down.svg'
import './CollapsibleMetrics.scss'

export interface CollapsibleMetricsProps {
  primaryMetrics: ReactNode
  secondaryMetrics?: ReactNode
  storageKey?: string
  defaultCollapsed?: boolean
}

export function CollapsibleMetrics({
  primaryMetrics,
  secondaryMetrics,
  storageKey = 'leaderboard-metrics-collapsed',
  defaultCollapsed = false,
}: CollapsibleMetricsProps) {
  const contentId = useId()

  // Component-level collapse (hides entire component)
  const [isComponentCollapsed, setIsComponentCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem(`${storageKey}-component`)
      return stored !== null ? stored === 'true' : false
    } catch {
      return false
    }
  })

  // Secondary metrics collapse (within visible component)
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(() => {
    if (typeof window === 'undefined') return defaultCollapsed
    try {
      const stored = localStorage.getItem(`${storageKey}-secondary`)
      return stored !== null ? stored === 'true' : defaultCollapsed
    } catch {
      return defaultCollapsed
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`${storageKey}-component`, String(isComponentCollapsed))
      localStorage.setItem(`${storageKey}-secondary`, String(isSecondaryCollapsed))
    } catch {
      // Storage unavailable
    }
  }, [isComponentCollapsed, isSecondaryCollapsed, storageKey])

  return (
    <div className="collapsible-metrics">
      {/* Top-left component collapse button */}
      <button
        className="collapsible-metrics__component-toggle"
        onClick={() => setIsComponentCollapsed(prev => !prev)}
        aria-expanded={!isComponentCollapsed}
        aria-controls="metrics-content-wrapper"
        aria-label={isComponentCollapsed ? 'Show metrics' : 'Hide metrics'}
        type="button"
      >
        <img
          src={chevronIcon}
          alt=""
          className={`collapsible-metrics__component-toggle-icon ${isComponentCollapsed ? 'collapsible-metrics__component-toggle-icon--collapsed' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Secondary metrics toggle button */}
      {!isComponentCollapsed && secondaryMetrics && (
        <button
          className="collapsible-metrics__secondary-toggle"
          onClick={() => setIsSecondaryCollapsed(prev => !prev)}
          aria-expanded={!isSecondaryCollapsed}
          aria-controls={contentId}
          aria-label={isSecondaryCollapsed ? 'Show more stats' : 'Hide additional stats'}
          type="button"
        >
          <img
            src={chevronIcon}
            alt=""
            className={`collapsible-metrics__secondary-toggle-icon ${isSecondaryCollapsed ? '' : 'collapsible-metrics__secondary-toggle-icon--expanded'}`}
            aria-hidden="true"
          />
          <span className="collapsible-metrics__secondary-toggle-text">
            {isSecondaryCollapsed ? 'More' : 'Less'}
          </span>
        </button>
      )}

      {/* Component content */}
      {!isComponentCollapsed && (
        <div id="metrics-content-wrapper" className="collapsible-metrics__wrapper">
          {/* Primary metrics */}
          <div className="collapsible-metrics__primary">{primaryMetrics}</div>

          {/* Secondary metrics */}
          {secondaryMetrics && !isSecondaryCollapsed && (
            <div id={contentId} className="collapsible-metrics__secondary">
              <div className="collapsible-metrics__secondary-inner">{secondaryMetrics}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
