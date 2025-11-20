import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ValidationError, ValidationSeverity } from '@/types/musicLeague'
import { Alert } from './Alert'
import iconError from '/icon-error.svg'
import iconWarning from '/icon-warning.svg'
import iconInfo from '/icon-info.svg'
import chevronDown from '/chevron-down.svg'
import chevronRight from '/chevron-right.svg'
import './ValidationMessage.scss'

export interface ValidationMessageProps {
  /** Array of validation errors to display */
  errors: ValidationError[]
  /** Maximum number of errors to display per severity (default: 10) */
  maxDisplay?: number
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean
  /** Whether sections are collapsible (default: true) */
  collapsible?: boolean
  /** Callback when user clicks retry button */
  onRetry?: () => void
}

interface GroupedErrors {
  error: ValidationError[]
  warning: ValidationError[]
  info: ValidationError[]
}

function groupBySeverity(errors: ValidationError[]): GroupedErrors {
  return errors.reduce(
    (groups, error) => {
      const severity = error.severity.toLowerCase() as Lowercase<ValidationSeverity>
      groups[severity].push(error)
      return groups
    },
    { error: [], warning: [], info: [] } as GroupedErrors
  )
}

export function ValidationMessage({
  errors,
  maxDisplay = 10,
  showLineNumbers = true,
  collapsible = true,
  onRetry,
}: ValidationMessageProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['error']) // Errors expanded by default
  )

  if (errors.length === 0) {
    return null
  }

  const grouped = groupBySeverity(errors)
  const hasErrors = grouped.error.length > 0

  const toggleSection = (section: string) => {
    if (!collapsible) return

    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const renderErrorList = (
    errorList: ValidationError[],
    severity: 'error' | 'warning' | 'info'
  ) => {
    const isExpanded = expandedSections.has(severity)
    const displayedErrors = errorList.slice(0, maxDisplay)
    const hasMore = errorList.length > maxDisplay

    if (errorList.length === 0) return null

    const severityLabels = {
      error: 'Errors',
      warning: 'Warnings',
      info: 'Information',
    }

    const severityIconSources: Record<string, string> = {
      error: iconError,
      warning: iconWarning,
      info: iconInfo,
    }

    const getSeverityIcon = (sev: string): ReactNode => (
      <img src={severityIconSources[sev]} alt="" aria-hidden="true" />
    )

    return (
      <div key={severity} className={`validation-section validation-section--${severity}`}>
        <button
          className="validation-section__header"
          onClick={() => toggleSection(severity)}
          disabled={!collapsible}
          type="button"
        >
          <span className="validation-section__icon">{getSeverityIcon(severity)}</span>
          <span className="validation-section__title">
            {severityLabels[severity]} ({errorList.length})
          </span>
          {collapsible && (
            <span className="validation-section__toggle">
              <img src={isExpanded ? chevronDown : chevronRight} alt="" aria-hidden="true" />
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="validation-section__content">
            <ul className="validation-list">
              {displayedErrors.map((error, index) => (
                <li key={index} className="validation-item">
                  {showLineNumbers &&
                    error.lineNumber !== undefined &&
                    error.lineNumber !== null && (
                      <span className="validation-item__line">Line {error.lineNumber}</span>
                    )}
                  {error.column && (
                    <span className="validation-item__column">Column "{error.column}"</span>
                  )}
                  <span className="validation-item__message">{error.message}</span>
                  {error.value !== undefined && error.value !== null && (
                    <code className="validation-item__value">Value: "{String(error.value)}"</code>
                  )}
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="validation-more">
                And {errorList.length - maxDisplay} more {severity}s...
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="validation-message">
      {hasErrors && (
        <Alert
          variant="error"
          title="Validation Failed"
          message={`Found ${grouped.error.length} error${grouped.error.length === 1 ? '' : 's'} that must be fixed before uploading.`}
        />
      )}

      <div className="validation-groups">
        {renderErrorList(grouped.error, 'error')}
        {renderErrorList(grouped.warning, 'warning')}
        {renderErrorList(grouped.info, 'info')}
      </div>

      {onRetry && (
        <div className="validation-actions">
          <button className="button button--primary" onClick={onRetry} type="button">
            Retry Upload
          </button>
        </div>
      )}
    </div>
  )
}
