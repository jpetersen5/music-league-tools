import type { Participant, Pairing, Constraint, GenerationResult } from '@/types'
import { shuffleArray } from '../helpers/shuffle'
import { detectCycles } from '../cycles/detection'
import { MAX_GENERATION_ATTEMPTS } from '../constants'
import { buildForcedChains, createForcedMaps } from './helpers'
import { groupChainsIntoCycles } from './grouping'
import { createPairingsFromGroups } from './pairingGeneration'

/**
 * Generate pairings with all cycles equal to N (with overflow if M % N != 0)
 * Creates multiple cycles of the same size, with one overflow cycle if needed
 *
 * Algorithm (greedy bin packing):
 * 1. Build forced chains from forced pairings
 * 2. Group chains into cycles of target size
 * 3. Handle overflow when participant count not divisible by cycle size
 * 4. Connect chain tails to heads within each group
 * 5. Validate cycle sizes and banned pairings
 * 6. Return perfect solution or best attempt
 *
 * Special cases:
 * - N=1: Creates self-pairings (A→A)
 * - M % N != 0: Creates overflow cycle of size N + (M % N)
 *
 * Time complexity: O(n·attempts) where n is participant count
 *
 * @param participants - List of all participants
 * @param bannedPairings - Pairings to avoid if possible
 * @param forcedPairings - Pairings that must be included
 * @param cycleSize - Target size for all cycles
 * @param maxAttempts - Maximum generation attempts (default from constants)
 * @returns Generation result with pairings, cycles, and success status
 */
export const generateEqualCycles = (
  participants: Participant[],
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  cycleSize: number,
  maxAttempts = MAX_GENERATION_ATTEMPTS
): GenerationResult => {
  const n = participants.length

  if (cycleSize <= 0) {
    return {
      pairings: [],
      success: false,
      warning: 'Cycle size must be positive.',
    }
  }

  if (cycleSize === 1) {
    // Allow self-pairings (A->A)
    return {
      pairings: participants.map(p => ({ from: p, to: p })),
      success: true,
      warning: 'N=1 creates self-pairings (A→A).',
    }
  }

  const banned = new Set(bannedPairings.map(p => `${p.from}->${p.to}`))
  const [forcedNext, forcedPrev] = createForcedMaps(forcedPairings)

  const hasOverflow = n % cycleSize !== 0
  const overflowSize = hasOverflow ? cycleSize + (n % cycleSize) : 0

  let bestPairings: Pairing[] = []
  let bestBannedCount = Infinity
  let bestCycleSizeDeviation = Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Build forced chains
    const chains = buildForcedChains(participants, forcedNext, forcedPrev)

    // Shuffle chains to randomize grouping
    const shuffledChains = shuffleArray(chains)

    // Build groups of cycleSize (forced chains must stay together in same cycle)
    const groups = groupChainsIntoCycles(shuffledChains, cycleSize)

    // Create cycle pairings for each group
    const pairings = createPairingsFromGroups(groups, chains)

    // Score this attempt
    const bannedCount = pairings.filter(p => banned.has(`${p.from}->${p.to}`)).length

    // Calculate average deviation from target cycle size
    const cycles = detectCycles(pairings, participants)
    const totalDeviation = cycles.reduce((sum, cycle) => {
      // Overflow cycle is expected, don't penalize it
      if (hasOverflow && cycle.length === overflowSize) return sum
      return sum + Math.abs(cycle.length - cycleSize)
    }, 0)
    const avgDeviation = cycles.length > 0 ? totalDeviation / cycles.length : 0

    // Check for perfect solution
    if (bannedCount === 0 && avgDeviation === 0) {
      const warning = hasOverflow
        ? `M=${n} is not divisible by N=${cycleSize}. Created overflow cycle of size ${overflowSize}.`
        : undefined
      return {
        pairings,
        success: true,
        warning,
        attempts: attempt + 1,
        cycles,
      }
    }

    // Track best attempt (prioritize fewer banned violations, then better cycle sizes)
    if (
      bannedCount < bestBannedCount ||
      (bannedCount === bestBannedCount && avgDeviation < bestCycleSizeDeviation)
    ) {
      bestBannedCount = bannedCount
      bestCycleSizeDeviation = avgDeviation
      bestPairings = pairings
    }
  }

  // Could not find perfect solution after all attempts
  let warning = ''
  if (hasOverflow) {
    warning = `M=${n} is not divisible by N=${cycleSize}. Created overflow cycle of size ${overflowSize}.`
  }
  if (bestBannedCount > 0) {
    warning +=
      (warning ? ' ' : '') +
      `Could not avoid all banned pairings after ${maxAttempts} attempts. ${bestBannedCount} banned pairing(s) included.`
  }
  if (bestCycleSizeDeviation > 0 && !hasOverflow) {
    warning +=
      (warning ? ' ' : '') + 'Could not achieve perfectly equal cycles. Showing best attempt.'
  }

  return {
    pairings: bestPairings,
    success: false,
    warning: warning || 'Could not find perfect solution. Showing best attempt.',
    attempts: maxAttempts,
    cycles: detectCycles(bestPairings, participants),
  }
}
