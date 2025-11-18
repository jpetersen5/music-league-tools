import medalGold from '/medal-gold.svg'
import medalSilver from '/medal-silver.svg'
import medalBronze from '/medal-bronze.svg'
import './RankBadge.scss'

export interface RankBadgeProps {
  rank: number
}

const MEDAL_ICONS: Record<number, string> = {
  1: medalGold,
  2: medalSilver,
  3: medalBronze,
}

export function RankBadge({ rank }: RankBadgeProps) {
  const isPodium = rank <= 3
  const medalIcon = MEDAL_ICONS[rank]

  return (
    <div
      className={`rank-badge ${isPodium ? 'rank-badge--podium' : ''}`}
      aria-label={`Rank ${rank}`}
    >
      {medalIcon ? (
        <img src={medalIcon} alt="" className="rank-badge__medal" aria-hidden="true" />
      ) : (
        <span className="rank-badge__content">{rank}</span>
      )}
    </div>
  )
}
