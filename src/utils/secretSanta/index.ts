/**
 * Secret Santa Pairing Generation Module
 *
 * This module provides functions for generating Secret Santa gift exchange pairings
 * with various constraint options including banned/forced pairings and cycle constraints.
 *
 * Main exports:
 * - generatePairings: Primary API for generating pairings
 * - parseParticipants: Parse participant names from text input
 * - validateCycleSettings: Validate cycle constraint settings
 * - detectCycles: Detect cycles in generated pairings
 * - downloadTextFile: Download text content as file
 */

// Main generation function
export { generatePairings } from './generatePairings'

// Parsing
export { parseParticipants } from './parsing/participants'

// Validation
export { detectDuplicates } from './validation/duplicates'
export type { DuplicateInfo } from './validation/duplicates'
export {
  validateConstraints,
  findInvalidConstraints,
  isPairingInList,
} from './validation/constraints'
export { validateCycleSettings, violatesCycleConstraint } from './validation/cycles'
export type { CycleValidationResult } from './validation/cycles'

// Cycle detection
export { detectCycles } from './cycles/detection'

// Algorithm exports (for advanced usage)
export { generateHamiltonianCycle } from './algorithms/hamiltonian'
export { generateWithCycleConstraint } from './algorithms/cycleConstraints'
export { generateEqualCycles } from './algorithms/equalCycles'

// Export utilities
export { downloadTextFile } from './export/download'
export { createConfigSnapshot } from './export/snapshot'

// Constants
export { MAX_GENERATION_ATTEMPTS } from './constants'
