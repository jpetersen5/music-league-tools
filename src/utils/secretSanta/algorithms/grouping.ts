import type { Participant } from '@/types'
import { isDefined } from '@/types/utilities'

/**
 * Group chains into cycles of target size
 * Handles overflow when total participants not divisible by cycle size
 *
 * @param chains - Array of participant chains to group
 * @param cycleSize - Target size for each group
 * @returns Array of grouped participants
 */
export const groupChainsIntoCycles = (
  chains: Participant[][],
  cycleSize: number
): Participant[][] => {
  const groups: Participant[][] = []
  const availableChains = [...chains]

  while (availableChains.length > 0) {
    const group: Participant[] = []
    const chainsInGroup: Participant[][] = []

    // Determine if this is last group (overflow) or regular sized group
    const remainingParticipants = availableChains.reduce((sum, chain) => sum + chain.length, 0)
    const targetSize =
      remainingParticipants >= cycleSize * 2 || remainingParticipants === cycleSize
        ? cycleSize
        : remainingParticipants // Last group (overflow)

    // Greedily pack chains into group (iterate backwards for array splicing efficiency)
    let currentSize = 0
    for (let i = availableChains.length - 1; i >= 0; i--) {
      const chain = availableChains[i]
      if (isDefined(chain) && currentSize + chain.length <= targetSize) {
        chainsInGroup.push(chain)
        currentSize += chain.length
        availableChains.splice(i, 1)
        if (currentSize === targetSize) break
      }
    }

    // If no chains fit, take the smallest remaining chain
    if (chainsInGroup.length === 0 && availableChains.length > 0) {
      const smallestChain = availableChains.reduce((smallest, chain) =>
        chain.length < smallest.length ? chain : smallest
      )
      chainsInGroup.push(smallestChain)
      availableChains.splice(availableChains.indexOf(smallestChain), 1)
    }

    // Add all participants from selected chains to group
    chainsInGroup.forEach(chain => group.push(...chain))

    if (group.length > 0) {
      groups.push(group)
    }
  }

  return groups
}
