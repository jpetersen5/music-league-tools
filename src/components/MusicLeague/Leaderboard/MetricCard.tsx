import { Tooltip } from '@/components/common/Tooltip'
import './MetricCard.scss'

export interface MetricCardProps {
  label: string
  value: string | number
  tooltip?: string
}

export function MetricCard({ label, value, tooltip }: MetricCardProps) {
  const labelElement = <div className="metric-card__label">{label}</div>

  return (
    <div className="metric-card">
      {tooltip ? <Tooltip content={tooltip}>{labelElement}</Tooltip> : labelElement}
      <div className="metric-card__value">{value}</div>
    </div>
  )
}
