// Confirmation messages
export const CONFIRM_BAN_ALL =
  'Ban all generated pairings? This will add all current pairings to your banned list.'
export const CONFIRM_DELETE_CONFIG = (name: string) => `Delete "${name}"?`
export const CONFIRM_CLEAR_BANNED = 'Clear all banned pairings?'
export const CONFIRM_CLEAR_FORCED = 'Clear all forced pairings?'
export const CONFIRM_LOAD_UNSAVED =
  'You have unsaved changes. Loading a different configuration will discard these changes. Continue?'

// Error messages
export const ERROR_BOTH_FIELDS_REQUIRED = 'Both fields are required'
export const ERROR_NOT_IN_LIST = (name: string) => `"${name}" is not in the participant list`
export const ERROR_PAIRING_EXISTS = 'This pairing already exists'
export const ERROR_FILE_READ_FAILED = 'Failed to read file'
export const ERROR_ONLY_TXT_FILES = 'Only .txt files are supported'
export const ERROR_CONFIG_NAME_REQUIRED = 'Please enter a name'
export const ERROR_CONFIG_NAME_EXISTS = 'A configuration with this name already exists'

// Info messages
export const INFO_NAMES_NOT_FOUND = (names: string[]) =>
  `Names not found in participant list: ${names.join(', ')}`
export const INFO_INVALID_CONSTRAINTS = (count: number) =>
  `${count} pairing${count !== 1 ? 's' : ''} reference${count === 1 ? 's' : ''} participants not in the list`

// Placeholder text
export const PLACEHOLDER_PARTICIPANT_NEWLINE = 'Enter participant names (one per line)...'
export const PLACEHOLDER_PARTICIPANT_COMMA = 'Enter participant names (comma separated)...'
export const PLACEHOLDER_PARTICIPANT_CUSTOM = (sep: string) =>
  `Enter participant names (${sep} separated)...`
export const PLACEHOLDER_CONFIG_NAME = 'Enter configuration name'
export const PLACEHOLDER_CUSTOM_SEPARATOR = 'Enter separator (e.g. |, -, .)'
