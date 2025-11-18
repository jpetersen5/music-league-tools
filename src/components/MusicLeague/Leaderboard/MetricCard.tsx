import './MetricCard.scss'

export interface MetricCardProps {
  label: string
  value: string | number
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
    </div>
  )
}
