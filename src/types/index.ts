/**
 * Core type definitions for Music League Tools
 */

// Theme types
export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const isTheme = (value: string): value is Theme => {
  return THEMES.includes(value as Theme)
}

// Tool types
export interface Tool {
  id: string
  title: string
  description: string
  path: string
}

// Secret Santa types
export type Participant = string

export interface Pairing {
  from: Participant
  to: Participant
}

export interface Constraint {
  from: Participant
  to: Participant
}

// Cycle constraint types
export const CYCLE_OPERATORS = ['greater', 'less', 'equal'] as const
export type CycleOperator = (typeof CYCLE_OPERATORS)[number]

export const isCycleOperator = (value: string): value is CycleOperator => {
  return CYCLE_OPERATORS.includes(value as CycleOperator)
}

// Generation settings with optional cycle constraints
export interface GenerationSettings {
  useHamiltonianCycle: boolean
  enableNCycleConstraint?: boolean
  cycleSize?: number
  cycleOperator?: CycleOperator
}

// Type guard for checking if cycle constraints are enabled
export const hasCycleConstraint = (
  settings: GenerationSettings
): settings is GenerationSettings & {
  enableNCycleConstraint: true
  cycleSize: number
  cycleOperator: CycleOperator
} => {
  return (
    settings.enableNCycleConstraint === true &&
    typeof settings.cycleSize === 'number' &&
    settings.cycleOperator !== undefined
  )
}

export interface SavedConfiguration {
  name: string
  participants: Participant[]
  bannedPairings: Constraint[]
  forcedPairings: Constraint[]
  settings: GenerationSettings
  lastModified: number
}

export interface GenerationResult {
  pairings: Pairing[]
  success: boolean
  warning?: string
  attempts?: number
  cycles?: number[][]
}

// Separator types
export const SEPARATOR_TYPES = ['newline', 'comma', 'custom'] as const
export type SeparatorType = (typeof SEPARATOR_TYPES)[number]

export const isSeparatorType = (value: string): value is SeparatorType => {
  return SEPARATOR_TYPES.includes(value as SeparatorType)
}
