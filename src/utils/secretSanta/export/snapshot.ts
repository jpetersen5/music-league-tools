import type { Participant, GenerationSettings, Constraint } from '@/types'

/**
 * Create a JSON snapshot of the current configuration
 * Used for saving and loading configurations
 *
 * @param participants - List of participant names
 * @param settings - Generation settings
 * @param bannedPairings - Banned pairing constraints
 * @param forcedPairings - Forced pairing constraints
 * @returns JSON string representation of configuration
 */
export const createConfigSnapshot = (
  participants: Participant[],
  settings: GenerationSettings,
  bannedPairings: Constraint[],
  forcedPairings: Constraint[]
): string => {
  return JSON.stringify({
    participants,
    settings,
    bannedPairings,
    forcedPairings,
  })
}
