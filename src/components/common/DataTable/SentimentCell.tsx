import { useMemo } from 'react'

export interface SentimentCellProps {
  value: number | null | undefined
}

export function SentimentCell({ value }: SentimentCellProps) {
  const style = useMemo(() => {
    if (value === null || value === undefined) return {}

    const clamped = Math.max(-1, Math.min(1, value))
    const percentage = Math.max(-100, Math.min(100, Math.abs(clamped) * 200))
    const colorVar = clamped > 0 ? 'var(--color-success)' : 'var(--color-error)'

    return {
      color: `color-mix(in srgb, ${colorVar} ${percentage}%, var(--color-text))`,
    }
  }, [value])

  if (value === null || value === undefined) {
    return <span>-</span>
  }

  return (
    <span style={style} className="font-medium">
      {value.toFixed(2)}
    </span>
  )
}
