import './LoadingSpinner.scss'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
  className?: string
}

export const LoadingSpinner = ({
  size = 'medium',
  message,
  className = '',
}: LoadingSpinnerProps) => {
  return (
    <div className={`loading-spinner loading-spinner--${size} ${className}`}>
      <div className="loading-spinner__spinner" role="status" aria-label="Loading">
        <div className="loading-spinner__circle" />
      </div>
      {message && <p className="loading-spinner__message">{message}</p>}
    </div>
  )
}
