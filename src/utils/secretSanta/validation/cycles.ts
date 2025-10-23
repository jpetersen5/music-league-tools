import type { Pairing, Participant, CycleOperator } from '@/types'
import { detectCycles } from '../cycles/detection'

/**
 * Result of cycle settings validation
 */
export interface CycleValidationResult {
  text?: string
  type?: 'error' | 'warning'
}

/**
 * Check if pairings violate cycle size constraint based on operator
 *
 * @param pairings - Generated pairings to check
 * @param participants - List of all participants
 * @param cycleSize - Target cycle size constraint
 * @param operator - Comparison operator for cycle size
 * @returns True if constraint is violated
 */
export const violatesCycleConstraint = (
  pairings: Pairing[],
  participants: Participant[],
  cycleSize: number,
  operator: CycleOperator
): boolean => {
  const cycles = detectCycles(pairings, participants)

  switch (operator) {
    case 'greater':
      // Violates if any cycle is <= cycleSize
      return cycles.some(cycle => cycle.length > 1 && cycle.length <= cycleSize)
    case 'less':
      // Violates if any cycle is >= cycleSize
      return cycles.some(cycle => cycle.length >= cycleSize)
    case 'equal':
      // Violates if any cycle is not equal to cycleSize (except for overflow)
      // This is checked differently in generateEqualCycles
      return false
    default:
      return false
  }
}

/**
 * Validate cycle settings for errors and warnings
 * Checks for invalid inputs, impossible constraints, and overflow scenarios
 *
 * @param enableNCycle - Whether N-cycle constraint is enabled
 * @param useHamiltonian - Whether Hamiltonian cycle mode is active
 * @param cycleSizeInput - Raw cycle size input string
 * @param cycleOperator - Comparison operator for cycle constraint
 * @param participantCount - Total number of participants
 * @returns Validation result with error/warning message, or null if valid
 */
export const validateCycleSettings = (
  enableNCycle: boolean,
  useHamiltonian: boolean,
  cycleSizeInput: string,
  cycleOperator: CycleOperator,
  participantCount: number
): CycleValidationResult | null => {
  if (!enableNCycle || useHamiltonian) return null

  const cycleSize = parseInt(cycleSizeInput)

  if (cycleSizeInput === '' || isNaN(cycleSize)) {
    return { text: 'Cycle size must be a number', type: 'error' }
  }

  if (cycleSize <= 0) {
    return { text: 'N must be positive', type: 'error' }
  }

  // For >/< operators: N > M/2 is impossible (forces complementary cycle that violates constraint)
  const maxValidSize = Math.floor(participantCount / 2)
  if (cycleOperator !== 'equal' && cycleSize > maxValidSize && participantCount > 0) {
    const remainingSize = participantCount - cycleSize
    return {
      text: `${cycleSize}-cycle necessitates a (${participantCount}-${cycleSize})-cycle (${remainingSize}-cycle) which violates the rule`,
      type: 'error',
    }
  }

  if (cycleOperator === 'equal' && participantCount > 0 && participantCount % cycleSize !== 0) {
    const overflowSize = cycleSize + (participantCount % cycleSize)
    return {
      text: `M=${participantCount} is not divisible by N=${cycleSize}. Will create overflow cycle of size ${overflowSize}`,
      type: 'warning',
    }
  }

  return null
}
