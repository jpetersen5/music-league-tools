/**
 * Constants for Secret Santa feature
 * Using const assertions and factory functions for type safety
 */

// Confirmation messages - immutable strings
export const CONFIRM_BAN_ALL =
  'Ban all generated pairings? This will add all current pairings to your banned list.' as const
export const CONFIRM_CLEAR_BANNED = 'Clear all banned pairings?' as const
export const CONFIRM_CLEAR_FORCED = 'Clear all forced pairings?' as const
export const CONFIRM_LOAD_UNSAVED =
  'You have unsaved changes. Loading a different configuration will discard these changes. Continue?' as const

// Confirmation message factories
export const CONFIRM_DELETE_CONFIG = (name: string) => `Delete "${name}"?` as const

// Error messages - immutable strings
export const ERROR_BOTH_FIELDS_REQUIRED = 'Both fields are required' as const
export const ERROR_PAIRING_EXISTS = 'This pairing already exists' as const
export const ERROR_FILE_READ_FAILED = 'Failed to read file' as const
export const ERROR_ONLY_TXT_FILES = 'Only .txt files are supported' as const
export const ERROR_CONFIG_NAME_REQUIRED = 'Please enter a name' as const
export const ERROR_CONFIG_NAME_EXISTS = 'A configuration with this name already exists' as const

// Error message factories
export const ERROR_NOT_IN_LIST = (name: string) =>
  `"${name}" is not in the participant list` as const

// Info message factories
export const INFO_NAMES_NOT_FOUND = (names: string[]) =>
  `Names not found in participant list: ${names.join(', ')}` as const

export const INFO_INVALID_CONSTRAINTS = (count: number) =>
  `${count} pairing${count !== 1 ? 's' : ''} reference${count === 1 ? 's' : ''} participants not in the list` as const

// Placeholder text - immutable strings
export const PLACEHOLDER_PARTICIPANT_NEWLINE = 'Enter participant names (one per line)...' as const
export const PLACEHOLDER_PARTICIPANT_COMMA = 'Enter participant names (comma separated)...' as const
export const PLACEHOLDER_CONFIG_NAME = 'Enter configuration name' as const
export const PLACEHOLDER_CUSTOM_SEPARATOR = 'Enter separator (e.g. |, -, .)' as const

// Placeholder text factories
export const PLACEHOLDER_PARTICIPANT_CUSTOM = (sep: string) =>
  `Enter participant names (${sep} separated)...` as const
