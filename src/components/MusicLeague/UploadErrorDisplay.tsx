/**
 * Upload Error Display Component
 *
 * Displays validation errors and warnings from failed profile uploads.
 * Groups errors by file type and severity with collapsible sections.
 *
 * @module components/MusicLeague/UploadErrorDisplay
 */

import { useState, useMemo } from 'react'
import type { ValidationError } from '@/types/musicLeague'
import { CsvFileType } from '@/types/musicLeague'
import { ValidationMessage } from '@/components/common/ValidationMessage'
import { Alert } from '@/components/common/Alert'
import './UploadErrorDisplay.scss'

// ============================================================================
// Component Props
// ============================================================================

export interface UploadErrorDisplayProps {
  /** Array of validation errors */
  errors: readonly ValidationError[]
  /** Array of validation warnings */
  warnings: readonly ValidationError[]
  /** Callback when retry button is clicked */
  onRetry?: () => void
  /** Show detailed error breakdown */
  detailed?: boolean
}

interface ErrorStats {
  totalErrors: number
  totalWarnings: number
  errorsByFile: Map<CsvFileType, ValidationError[]>
  warningsByFile: Map<CsvFileType, ValidationError[]>
}

// ============================================================================
// Component
// ============================================================================

export function UploadErrorDisplay({
  errors,
  warnings,
  onRetry,
  detailed = true,
}: UploadErrorDisplayProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['errors']))

  // ============================================================================
  // Computed Values
  // ============================================================================

  const stats: ErrorStats = useMemo(() => {
    const errorsByFile = new Map<CsvFileType, ValidationError[]>()
    const warningsByFile = new Map<CsvFileType, ValidationError[]>()

    errors.forEach(error => {
      const existing = errorsByFile.get(error.fileType) || []
      errorsByFile.set(error.fileType, [...existing, error])
    })

    warnings.forEach(warning => {
      const existing = warningsByFile.get(warning.fileType) || []
      warningsByFile.set(warning.fileType, [...existing, warning])
    })

    return {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errorsByFile,
      warningsByFile,
    }
  }, [errors, warnings])

  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getFileTypeLabel = (fileType: CsvFileType): string => {
    const labels: Record<CsvFileType, string> = {
      [CsvFileType.Competitors]: 'Competitors',
      [CsvFileType.Rounds]: 'Rounds',
      [CsvFileType.Submissions]: 'Submissions',
      [CsvFileType.Votes]: 'Votes',
    }
    return labels[fileType] || 'Unknown'
  }

  const renderFileGroup = (
    fileType: CsvFileType,
    fileErrors: ValidationError[],
    severity: 'error' | 'warning'
  ) => {
    const sectionId = `${severity}-${fileType}`
    const isExpanded = expandedSections.has(sectionId)
    const fileLabel = getFileTypeLabel(fileType)

    return (
      <div key={sectionId} className="upload-error-display__file-group">
        <button
          className="upload-error-display__file-group__header"
          onClick={() => toggleSection(sectionId)}
          aria-expanded={isExpanded}
        >
          <div className="upload-error-display__file-group__header__title">
            <span>{isExpanded ? '▼' : '▶'}</span>
            <span>{fileLabel} CSV</span>
          </div>
          <div className="upload-error-display__file-group__header__count">
            <span
              className={`upload-error-display__file-group__header__badge upload-error-display__file-group__header__badge--${severity}`}
            >
              {fileErrors.length}
            </span>
          </div>
        </button>
        {isExpanded && (
          <div className="upload-error-display__file-group__content">
            <ValidationMessage
              errors={fileErrors}
              maxDisplay={10}
              showLineNumbers={true}
              collapsible={false}
            />
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (!hasErrors && !hasWarnings) {
    return null
  }

  return (
    <div className="upload-error-display">
      {/* Summary Alert */}
      {hasErrors && (
        <div className="upload-error-display__summary">
          <Alert
            variant="error"
            title="Upload Failed"
            message={`Found ${stats.totalErrors} error${stats.totalErrors !== 1 ? 's' : ''} in your CSV files. Please fix these errors and try again.`}
          />
        </div>
      )}

      {/* Error Details */}
      {detailed && hasErrors && (
        <div className="upload-error-display__section">
          <h3 className="upload-error-display__section-title">Errors by File</h3>
          {Array.from(stats.errorsByFile.entries()).map(([fileType, fileErrors]) =>
            renderFileGroup(fileType, fileErrors, 'error')
          )}
        </div>
      )}

      {/* Warnings (if any) */}
      {detailed && hasWarnings && (
        <div className="upload-error-display__section">
          <h3 className="upload-error-display__section-title">Warnings</h3>
          {Array.from(stats.warningsByFile.entries()).map(([fileType, fileWarnings]) =>
            renderFileGroup(fileType, fileWarnings, 'warning')
          )}
        </div>
      )}

      {/* Actions */}
      <div className="upload-error-display__actions">
        <div className="upload-error-display__actions__hint">
          💡 <strong>Tip:</strong> Export your Music League data again and ensure the CSV files are
          not modified before uploading.
        </div>
        {onRetry && (
          <div className="upload-error-display__actions__buttons">
            <button className="upload-error-display__actions__retry" onClick={onRetry}>
              Fix and Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
