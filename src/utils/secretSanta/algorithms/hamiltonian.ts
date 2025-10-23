import type { Participant, Pairing, Constraint, GenerationResult } from '@/types'
import { shuffleArray } from '../helpers/shuffle'
import { MAX_GENERATION_ATTEMPTS } from '../constants'
import { isDefined, safeMapGet } from '@/types/utilities'

/**
 * Generate a Hamiltonian cycle (visits each participant exactly once)
 * Respects forced pairings and attempts to avoid banned pairings
 *
 * Algorithm (chain-based construction instead of backtracking):
 * 1. Build forced chains from forced pairings
 * 2. Shuffle chain order for randomization
 * 3. Connect chain tails to next chain heads to complete cycle
 * 4. Count banned pairing violations
 * 5. Return perfect solution or best attempt after max attempts
 *
 * Why this approach: Forced pairings create rigid constraints that would make
 * backtracking prohibitively slow. Chain shuffling provides O(n·attempts) time
 * while respecting all forced edges, vs O(n!) for naive Hamiltonian path search.
 *
 * @param participants - List of all participants
 * @param bannedPairings - Pairings to avoid if possible
 * @param forcedPairings - Pairings that must be included
 * @param maxAttempts - Maximum generation attempts (default from constants)
 * @returns Generation result with pairings and success status
 */
export const generateHamiltonianCycle = (
  participants: Participant[],
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  maxAttempts = MAX_GENERATION_ATTEMPTS
): GenerationResult => {
  const banned = new Set(bannedPairings.map(p => `${p.from}->${p.to}`))
  const forcedNext = new Map<Participant, Participant>()
  const forcedPrev = new Map<Participant, Participant>()

  forcedPairings.forEach(fp => {
    forcedNext.set(fp.from, fp.to)
    forcedPrev.set(fp.to, fp.from)
  })

  // Build forced chains (these stay constant across attempts)
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

  let bestPairings: Pairing[] = []
  let bestBannedCount = Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffle chains to try different orderings
    const shuffledChains = shuffleArray([...chains])

    const pairings: Pairing[] = []

    // Add forced edges within chains
    shuffledChains.forEach(chain => {
      for (let i = 0; i < chain.length - 1; i++) {
        const from = chain[i]
        const to = chain[i + 1]
        if (isDefined(from) && isDefined(to)) {
          pairings.push({ from, to })
        }
      }
    })

    // Connect chain tails to next chain heads to complete the cycle
    for (let i = 0; i < shuffledChains.length; i++) {
      const currentChain = shuffledChains[i]
      const nextChain = shuffledChains[(i + 1) % shuffledChains.length]

      if (isDefined(currentChain) && isDefined(nextChain)) {
        const from = currentChain[currentChain.length - 1]
        const to = nextChain[0]

        if (isDefined(from) && isDefined(to)) {
          pairings.push({ from, to })
        }
      }
    }

    // Count banned pairings
    const bannedCount = pairings.filter(p => banned.has(`${p.from}->${p.to}`)).length

    // Check for perfect solution
    if (bannedCount === 0) {
      return {
        pairings,
        success: true,
        attempts: attempt + 1,
      }
    }

    // Track best attempt
    if (bannedCount < bestBannedCount) {
      bestBannedCount = bannedCount
      bestPairings = pairings
    }
  }

  let warning = `Could not avoid all banned pairings after ${maxAttempts} attempts. Showing best attempt.`
  if (bestBannedCount > 0) {
    warning += ` ${bestBannedCount} banned pairing(s) included.`
  }

  // Return best attempt (may include some banned pairings)
  return {
    pairings: bestPairings,
    success: false,
    attempts: maxAttempts,
    warning: warning,
  }
}
