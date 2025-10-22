import { useCallback } from 'react'
import type { Pairing, Constraint } from '@/types'

export const usePairingConstraints = (
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  onBannedChange: (constraints: Constraint[]) => void,
  onForcedChange: (constraints: Constraint[]) => void
) => {
  const handleBanPairing = useCallback(
    (pairing: Pairing) => {
      if (!bannedPairings.some(bp => bp.from === pairing.from && bp.to === pairing.to)) {
        onBannedChange([...bannedPairings, pairing])
      }
    },
    [bannedPairings, onBannedChange]
  )

  const handleForcePairing = useCallback(
    (pairing: Pairing) => {
      if (!forcedPairings.some(fp => fp.from === pairing.from && fp.to === pairing.to)) {
        onForcedChange([...forcedPairings, pairing])
      }
    },
    [forcedPairings, onForcedChange]
  )

  const handleRemoveBanned = useCallback(
    (pairing: Pairing) => {
      onBannedChange(
        bannedPairings.filter(bp => !(bp.from === pairing.from && bp.to === pairing.to))
      )
    },
    [bannedPairings, onBannedChange]
  )

  const handleRemoveForced = useCallback(
    (pairing: Pairing) => {
      onForcedChange(
        forcedPairings.filter(fp => !(fp.from === pairing.from && fp.to === pairing.to))
      )
    },
    [forcedPairings, onForcedChange]
  )

  return {
    handleBanPairing,
    handleForcePairing,
    handleRemoveBanned,
    handleRemoveForced,
  }
}
