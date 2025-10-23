import type { Participant, Pairing, Constraint, GenerationResult, CycleOperator } from '@/types'
import { shuffleArray } from '../helpers/shuffle'
import { detectCycles } from '../cycles/detection'
import { violatesCycleConstraint } from '../validation/cycles'
import { MAX_GENERATION_ATTEMPTS } from '../constants'
import { isDefined } from '@/types/utilities'

/**
 * Generate pairings with cycle size constraint based on operator
 * Supports greater than, less than comparisons for cycle sizes
 *
 * Algorithm:
 * 1. Add forced pairings first
 * 2. Randomly assign remaining participants
 * 3. Check if cycle size constraint is satisfied
 * 4. Track best attempt by average violating cycle size
 * 5. Return perfect solution or best attempt
 *
 * @param participants - List of all participants
 * @param bannedPairings - Pairings to avoid if possible
 * @param forcedPairings - Pairings that must be included
 * @param cycleSize - Target cycle size for constraint
 * @param cycleOperator - Comparison operator ('greater' or 'less')
 * @param maxAttempts - Maximum generation attempts (default from constants)
 * @returns Generation result with pairings and success status
 */
export const generateWithCycleConstraint = (
  participants: Participant[],
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  cycleSize: number,
  cycleOperator: CycleOperator,
  maxAttempts = MAX_GENERATION_ATTEMPTS
): GenerationResult => {
  const n = participants.length

  const banned = new Set(bannedPairings.map(p => `${p.from}->${p.to}`))
  const forcedMap = new Map(forcedPairings.map(p => [p.from, p.to]))

  let bestPairings: Pairing[] = []
  let bestAvgViolatingSize = Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pairings: Pairing[] = []
    const assigned = new Set<Participant>()
    const givers = shuffleArray([...participants])

    forcedPairings.forEach(fp => {
      pairings.push(fp)
      assigned.add(fp.to)
    })

    for (const from of givers) {
      if (forcedMap.has(from)) continue

      const available = participants.filter(p => p !== from && !assigned.has(p))
      const shuffledAvailable = shuffleArray(available)

      let assigned_to = false
      for (const to of shuffledAvailable) {
        const key = `${from}->${to}`
        if (!banned.has(key)) {
          pairings.push({ from, to })
          assigned.add(to)
          assigned_to = true
          break
        }
      }

      if (!assigned_to && available.length > 0) {
        // Force assignment even if banned
        const firstAvailable = available[0]
        if (isDefined(firstAvailable)) {
          pairings.push({ from, to: firstAvailable })
          assigned.add(firstAvailable)
        }
      }
    }

    // Check for complete assignment
    if (pairings.length !== n) continue

    // Check cycle constraint
    if (!violatesCycleConstraint(pairings, participants, cycleSize, cycleOperator)) {
      return { pairings, success: true, attempts: attempt + 1 }
    }

    // Score imperfect solutions: prefer fewer/smaller violating cycles
    const cycles = detectCycles(pairings, participants)
    const violatingCycles = cycles.filter(c => {
      if (cycleOperator === 'greater') return c.length <= cycleSize
      if (cycleOperator === 'less') return c.length >= cycleSize
      return false
    })

    if (violatingCycles.length > 0) {
      const avgSize = violatingCycles.reduce((sum, c) => sum + c.length, 0) / violatingCycles.length
      if (avgSize < bestAvgViolatingSize) {
        bestAvgViolatingSize = avgSize
        bestPairings = pairings
      }
    } else if (bestPairings.length === 0) {
      bestPairings = pairings
    }
  }

  // Could not find perfect solution
  const operatorText = cycleOperator === 'greater' ? '>' : cycleOperator === 'less' ? '<' : '='
  return {
    pairings: bestPairings,
    success: false,
    attempts: maxAttempts,
    warning: `Could not satisfy cycle constraint ${operatorText} ${cycleSize} after ${maxAttempts} attempts. Showing best attempt.`,
  }
}
