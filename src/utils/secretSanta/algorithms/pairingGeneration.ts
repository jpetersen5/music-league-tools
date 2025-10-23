import type { Participant, Pairing } from '@/types'
import { shuffleArray } from '../helpers/shuffle'
import { isDefined } from '@/types/utilities'

/**
 * Create pairings from grouped participants
 * Connects chains within each group to form cycles
 *
 * @param groups - Array of participant groups
 * @param allChains - All original chains (for finding which chains are in each group)
 * @returns Array of pairings
 */
export const createPairingsFromGroups = (
  groups: Participant[][],
  allChains: Participant[][]
): Pairing[] => {
  const pairings: Pairing[] = []

  for (const group of groups) {
    // Find which chains are in this group
    const groupChains = allChains.filter(chain => chain.every(p => group.includes(p)))

    // Add forced edges within chains
    groupChains.forEach(chain => {
      for (let i = 0; i < chain.length - 1; i++) {
        const from = chain[i]
        const to = chain[i + 1]
        if (isDefined(from) && isDefined(to)) {
          pairings.push({ from, to })
        }
      }
    })

    // Connect chain tails to next chain heads to complete the cycle
    // Shuffle the order of chain connections to randomize
    const shuffledGroupChains = shuffleArray(groupChains)
    for (let i = 0; i < shuffledGroupChains.length; i++) {
      const currentChain = shuffledGroupChains[i]
      const nextChain = shuffledGroupChains[(i + 1) % shuffledGroupChains.length]

      if (isDefined(currentChain) && isDefined(nextChain)) {
        const from = currentChain[currentChain.length - 1]
        const to = nextChain[0]

        if (isDefined(from) && isDefined(to)) {
          pairings.push({ from, to })
        }
      }
    }
  }

  return pairings
}
