import type { ReactNode } from 'react'
import iconError from '/icon-error.svg'
import iconWarning from '/icon-warning.svg'
import iconSuccess from '/icon-success.svg'
import iconInfo from '/icon-info.svg'
import closeIcon from '/close.svg'
import './Alert.scss'

export type AlertVariant = 'error' | 'warning' | 'success' | 'info'

export interface AlertProps {
  /** Visual variant of the alert */
  variant: AlertVariant
  /** Optional title for emphasis */
  title?: string
  /** Main message content */
  message: string
  /** Whether the alert can be dismissed */
  dismissible?: boolean
  /** Callback when alert is dismissed */
  onDismiss?: () => void
  /** Custom icon (uses default variant icon if not provided) */
  icon?: ReactNode
  /** Additional CSS classes */
  className?: string
}

const ICON_SOURCES: Record<AlertVariant, string> = {
  error: iconError,
  warning: iconWarning,
  success: iconSuccess,
  info: iconInfo,
}

function getDefaultIcon(variant: AlertVariant): ReactNode {
  return <img src={ICON_SOURCES[variant]} alt="" className="alert__icon-img" aria-hidden="true" />
}

export function Alert({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  icon,
  className = '',
}: AlertProps) {
  const displayIcon = icon ?? getDefaultIcon(variant)

  return (
    <div className={`alert alert--${variant} ${className}`} role="alert">
      <div className="alert__icon">{displayIcon}</div>

      <div className="alert__content">
        {title && <div className="alert__title">{title}</div>}
        <div className="alert__message">{message}</div>
      </div>

      {dismissible && onDismiss && (
        <button
          className="alert__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          type="button"
        >
          <img src={closeIcon} alt="" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
