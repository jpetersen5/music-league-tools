export type Theme = 'light' | 'dark'

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

export type CycleOperator = 'greater' | 'less' | 'equal'

export interface GenerationSettings {
  useHamiltonianCycle: boolean
  enableNCycleConstraint?: boolean // When true, apply N-cycle constraints
  cycleSize?: number // Only used when enableNCycleConstraint is true
  cycleOperator?: CycleOperator // Only used when enableNCycleConstraint is true
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
  cycles?: number[][] // Array of cycles (each cycle is array of participant indices)
}

export type SeparatorType = 'newline' | 'comma' | 'custom'
