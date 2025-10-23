import type { Participant, GenerationSettings, Constraint, GenerationResult } from '@/types'
import { validateConstraints } from './validation/constraints'
import { generateHamiltonianCycle } from './algorithms/hamiltonian'
import { generateWithCycleConstraint } from './algorithms/cycleConstraints'
import { generateEqualCycles } from './algorithms/equalCycles'
import { detectCycles } from './cycles/detection'

/**
 * Main entry point for generating Secret Santa pairings
 * Routes to appropriate algorithm based on settings
 *
 * @param participants - List of all participants
 * @param settings - Generation settings (Hamiltonian, N-cycle constraints, etc.)
 * @param bannedPairings - Pairings to avoid if possible
 * @param forcedPairings - Pairings that must be included
 * @returns Generation result with pairings, cycles, and success status
 */
export const generatePairings = (
  participants: Participant[],
  settings: GenerationSettings,
  bannedPairings: Constraint[] = [],
  forcedPairings: Constraint[] = []
): GenerationResult => {
  const validBanned = validateConstraints(bannedPairings, participants)
  const validForced = validateConstraints(forcedPairings, participants)

  const conflicts = validForced.filter(fp =>
    validBanned.some(bp => bp.from === fp.from && bp.to === fp.to)
  )
  if (conflicts.length > 0) {
    const conflict = conflicts[0]!
    return {
      pairings: [],
      success: false,
      warning: `Conflict: ${conflict.from} → ${conflict.to} is both forced and banned.`,
    }
  }

  if (settings.useHamiltonianCycle) {
    const result = generateHamiltonianCycle(participants, validBanned, validForced)

    return {
      ...result,
      cycles: detectCycles(result.pairings, participants),
    }
  } else if (settings.enableNCycleConstraint) {
    const cycleSize = settings.cycleSize ?? 3
    const cycleOperator = settings.cycleOperator ?? 'equal'

    if (cycleOperator === 'equal') {
      const result = generateEqualCycles(participants, validBanned, validForced, cycleSize)
      return {
        ...result,
        cycles: detectCycles(result.pairings, participants),
      }
    } else {
      const result = generateWithCycleConstraint(
        participants,
        validBanned,
        validForced,
        cycleSize,
        cycleOperator
      )
      return {
        ...result,
        cycles: detectCycles(result.pairings, participants),
      }
    }
  } else {
    // No cycle constraints - random assignment
    const result = generateWithCycleConstraint(
      participants,
      validBanned,
      validForced,
      participants.length, // Allow any cycle size
      'less' // No real constraint
    )
    return {
      ...result,
      cycles: detectCycles(result.pairings, participants),
    }
  }
}
