import type { Participant, Constraint } from '@/types'
import { safeMapGet } from '@/types/utilities'

/**
 * Build forced chains from forced pairings
 * Chains represent sequences of participants that must follow each other
 *
 * @param participants - List of all participants
 * @param forcedNext - Map of forced next participant for each giver
 * @param forcedPrev - Map of forced previous participant for each receiver
 * @returns Array of participant chains
 */
export const buildForcedChains = (
  participants: Participant[],
  forcedNext: Map<Participant, Participant>,
  forcedPrev: Map<Participant, Participant>
): Participant[][] => {
  const chains: Participant[][] = []
  const visited = new Set<Participant>()

  participants.forEach(start => {
    if (visited.has(start)) return

    const prevParticipant = safeMapGet(forcedPrev, start)
    if (prevParticipant !== undefined && !visited.has(prevParticipant)) return

    const chain: Participant[] = []
    let current: Participant | undefined = start

    while (current && !visited.has(current)) {
      chain.push(current)
      visited.add(current)
      current = safeMapGet(forcedNext, current)
    }

    if (chain.length > 0) {
      chains.push(chain)
    }
  })

  return chains
}

/**
 * Create force pairing maps from constraint list
 *
 * @param forcedPairings - List of forced pairing constraints
 * @returns Tuple of [forcedNext map, forcedPrev map]
 */
export const createForcedMaps = (
  forcedPairings: Constraint[]
): [Map<Participant, Participant>, Map<Participant, Participant>] => {
  const forcedNext = new Map<Participant, Participant>()
  const forcedPrev = new Map<Participant, Participant>()

  forcedPairings.forEach(fp => {
    forcedNext.set(fp.from, fp.to)
    forcedPrev.set(fp.to, fp.from)
  })

  return [forcedNext, forcedPrev]
}
