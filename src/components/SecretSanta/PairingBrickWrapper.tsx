import { memo, useCallback } from 'react'
import type { Pairing } from '@/types'
import { PairingBrick } from './PairingBrick'

interface PairingBrickWrapperProps {
  pairing: Pairing
  isBanned: boolean
  isForced: boolean
  onBanPairing: (pairing: Pairing) => void
  onForcePairing: (pairing: Pairing) => void
  onRemoveBanned: (pairing: Pairing) => void
  onRemoveForced: (pairing: Pairing) => void
}

export const PairingBrickWrapper = memo(
  ({
    pairing,
    isBanned,
    isForced,
    onBanPairing,
    onForcePairing,
    onRemoveBanned,
    onRemoveForced,
  }: PairingBrickWrapperProps) => {
    const handleBan = useCallback(() => onBanPairing(pairing), [onBanPairing, pairing])
    const handleForce = useCallback(() => onForcePairing(pairing), [onForcePairing, pairing])
    const handleRemoveBanned = useCallback(() => onRemoveBanned(pairing), [onRemoveBanned, pairing])
    const handleRemoveForced = useCallback(() => onRemoveForced(pairing), [onRemoveForced, pairing])

    return (
      <PairingBrick
        pairing={pairing}
        isBanned={isBanned}
        isForced={isForced}
        onBan={handleBan}
        onForce={handleForce}
        onRemoveBanned={handleRemoveBanned}
        onRemoveForced={handleRemoveForced}
      />
    )
  }
)
