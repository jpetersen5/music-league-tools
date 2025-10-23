import { memo } from 'react'
import type { Pairing } from '@/types'
import banIcon from '/ban.svg'
import forceIcon from '/force.svg'
import trashRedIcon from '/trash-red.svg'
import trashGreenIcon from '/trash-green.svg'

interface PairingBrickProps {
  pairing: Pairing
  isBanned: boolean
  isForced: boolean
  onBan: () => void
  onForce: () => void
  onRemoveBanned: () => void
  onRemoveForced: () => void
}

export const PairingBrick = memo(
  ({
    pairing,
    isBanned,
    isForced,
    onBan,
    onForce,
    onRemoveBanned,
    onRemoveForced,
  }: PairingBrickProps) => {
    return (
      <div className="output-display__brick">
        <span className="output-display__brick-text">
          {pairing.from} → {pairing.to}
        </span>
        <div className="output-display__brick-actions">
          {isBanned ? (
            <button
              className="output-display__action-btn output-display__action-btn--remove-ban"
              onClick={onRemoveBanned}
              type="button"
              title="Remove from banned"
              aria-label="Remove from banned"
            >
              <img src={trashRedIcon} alt="Remove" />
            </button>
          ) : isForced ? (
            <button
              className="output-display__action-btn output-display__action-btn--remove-force"
              onClick={onRemoveForced}
              type="button"
              title="Remove from forced"
              aria-label="Remove from forced"
            >
              <img src={trashGreenIcon} alt="Remove" />
            </button>
          ) : (
            <>
              <button
                className="output-display__action-btn"
                onClick={onBan}
                type="button"
                title="Ban this pairing"
              >
                <img src={banIcon} alt="Ban" />
              </button>
              <button
                className="output-display__action-btn"
                onClick={onForce}
                type="button"
                title="Force this pairing"
              >
                <img src={forceIcon} alt="Force" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }
)
