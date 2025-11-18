import { useState, useEffect, useId, ReactNode } from 'react'
import chevronIcon from '/chevron-down.svg'
import './CollapsibleMetrics.scss'

export interface CollapsibleMetricsProps {
  children: ReactNode
  storageKey?: string
  defaultCollapsed?: boolean
  description?: string
}

export function CollapsibleMetrics({
  children,
  storageKey = 'leaderboard-metrics-collapsed',
  defaultCollapsed = false,
  description,
}: CollapsibleMetricsProps) {
  const contentId = useId()

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? stored === 'true' : defaultCollapsed
    } catch {
      return defaultCollapsed
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(isCollapsed))
    } catch {
      // Storage unavailable (incognito mode, quota exceeded, etc.)
    }
  }, [isCollapsed, storageKey])

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev)
  }

  return (
    <div className={`collapsible-metrics ${isCollapsed ? 'collapsible-metrics--collapsed' : ''}`}>
      <button
        className="collapsible-metrics__toggle"
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
        aria-label={isCollapsed ? 'Show metrics' : 'Hide metrics'}
        type="button"
      >
        <img
          src={chevronIcon}
          alt=""
          className="collapsible-metrics__toggle-icon"
          aria-hidden="true"
        />
        <span className="collapsible-metrics__toggle-text">
          {isCollapsed ? 'Show Metrics' : 'Hide Metrics'}
        </span>
      </button>

      <div id={contentId} className="collapsible-metrics__content" aria-hidden={isCollapsed}>
        <div className="collapsible-metrics__inner">
          <div className="collapsible-metrics__grid">{children}</div>
          {description && <p className="collapsible-metrics__description">{description}</p>}
        </div>
      </div>
    </div>
  )
}
