import './RankCell.scss'

export interface RankCellProps {
  rank: number | null | undefined
}

export function RankCell({ rank }: RankCellProps) {
  if (!rank) {
    return <span className="rank-cell">-</span>
  }

  return <span className={`rank-cell rank-cell--${rank}`}>#{rank}</span>
}
