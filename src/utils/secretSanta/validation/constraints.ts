import type { Constraint, Participant, Pairing } from '@/types'

/**
 * Filter constraints to only include those with valid participants
 * Removes constraints referencing participants not in the list
 *
 * @param constraints - Constraints to validate
 * @param participants - List of valid participant names
 * @returns Filtered array of valid constraints
 */
export const validateConstraints = (
  constraints: Constraint[],
  participants: Participant[]
): Constraint[] => {
  return constraints.filter(c => participants.includes(c.from) && participants.includes(c.to))
}

/**
 * Find constraints that reference invalid participants
 * Returns constraints where from/to don't exist in participant list
 *
 * @param constraints - Constraints to check
 * @param participants - List of valid participant names
 * @returns Array of invalid constraints
 */
export const findInvalidConstraints = (
  constraints: Constraint[],
  participants: Participant[]
): Constraint[] => {
  return constraints.filter(c => !participants.includes(c.from) || !participants.includes(c.to))
}

/**
 * Check if a pairing exists in a list of constraints
 *
 * @param pairing - Pairing to check
 * @param constraints - List of constraints to search
 * @returns True if pairing exists in constraints
 */
export const isPairingInList = (pairing: Pairing, constraints: Constraint[]): boolean => {
  return constraints.some(c => c.from === pairing.from && c.to === pairing.to)
}
