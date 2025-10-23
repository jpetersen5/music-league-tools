import type { Participant, SeparatorType } from '@/types'

/**
 * Parse participant names from input string based on separator type
 *
 * @param input - Raw input string containing participant names
 * @param separatorType - Type of separator to use for parsing
 * @param customSeparator - Custom separator string (used when separatorType is 'custom')
 * @returns Array of participant names (trimmed and filtered)
 */
export const parseParticipants = (
  input: string,
  separatorType: SeparatorType,
  customSeparator?: string
): Participant[] => {
  if (!input.trim()) return []

  let separator: RegExp | string

  switch (separatorType) {
    case 'newline':
      separator = /\r?\n/
      break
    case 'comma':
      separator = ','
      break
    case 'custom':
      separator = customSeparator || ','
      break
  }

  return input
    .split(separator)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}
