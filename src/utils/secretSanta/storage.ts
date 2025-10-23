import type { SavedConfiguration, GenerationSettings } from '@/types'
import { isCycleOperator } from '@/types'

const STORAGE_KEY = 'secret-santa-configurations' as const
const MAX_CONFIGURATIONS = 50 as const

interface StorageError extends Error {
  isQuotaExceeded?: boolean
  isAccessDenied?: boolean
}

/**
 * Check if localStorage is available and accessible
 */
const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Create a more informative error from storage exceptions
 */
const createStorageError = (error: unknown, operation: string): StorageError => {
  const storageError = new Error(`Failed to ${operation} configuration`) as StorageError

  if (error instanceof Error) {
    // Check for quota exceeded errors
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      storageError.isQuotaExceeded = true
      storageError.message = 'Storage quota exceeded. Please delete old configurations.'
    }
    // Check for access denied errors
    else if (error.name === 'SecurityError' || error.message.includes('access')) {
      storageError.isAccessDenied = true
      storageError.message = 'Storage access denied. Please check browser settings.'
    } else {
      storageError.message = `Failed to ${operation}: ${error.message}`
    }
  }

  return storageError
}

/**
 * Validate that a constraint object has the correct structure
 */
const isValidConstraint = (obj: unknown): obj is { from: string; to: string } => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'from' in obj &&
    'to' in obj &&
    typeof obj.from === 'string' &&
    typeof obj.to === 'string'
  )
}

/**
 * Validate that generation settings have the correct structure
 */
const isValidGenerationSettings = (obj: unknown): obj is GenerationSettings => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const settings = obj as Record<string, unknown>

  // Check required field
  if (typeof settings.useHamiltonianCycle !== 'boolean') {
    return false
  }

  // Validate optional cycle constraint fields if present
  if (settings.enableNCycleConstraint !== undefined) {
    if (typeof settings.enableNCycleConstraint !== 'boolean') {
      return false
    }

    if (settings.enableNCycleConstraint) {
      if (
        typeof settings.cycleSize !== 'number' ||
        !Number.isInteger(settings.cycleSize) ||
        settings.cycleSize < 2
      ) {
        return false
      }

      if (typeof settings.cycleOperator !== 'string' || !isCycleOperator(settings.cycleOperator)) {
        return false
      }
    }
  }

  return true
}

/**
 * Validate that a saved configuration has the correct structure
 */
const isValidSavedConfiguration = (obj: unknown): obj is SavedConfiguration => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const config = obj as Record<string, unknown>

  // Validate required fields
  if (typeof config.name !== 'string' || config.name.trim() === '') {
    return false
  }

  if (!Array.isArray(config.participants)) {
    return false
  }

  if (!config.participants.every((p): p is string => typeof p === 'string')) {
    return false
  }

  if (!Array.isArray(config.bannedPairings)) {
    return false
  }

  if (!config.bannedPairings.every(isValidConstraint)) {
    return false
  }

  if (!Array.isArray(config.forcedPairings)) {
    return false
  }

  if (!config.forcedPairings.every(isValidConstraint)) {
    return false
  }

  if (!isValidGenerationSettings(config.settings)) {
    return false
  }

  if (typeof config.lastModified !== 'number' || !Number.isFinite(config.lastModified)) {
    return false
  }

  return true
}

export const getSavedConfigurations = (): SavedConfiguration[] => {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available')
    return []
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      console.error('Stored configurations is not an array, resetting storage')
      localStorage.removeItem(STORAGE_KEY)
      return []
    }

    // Security: Validate each configuration's structure
    const validConfigs: SavedConfiguration[] = []
    let hasInvalidConfig = false

    for (const config of parsed) {
      if (isValidSavedConfiguration(config)) {
        validConfigs.push(config)
      } else {
        hasInvalidConfig = true
        console.warn('Invalid configuration detected and skipped:', config)
      }
    }

    // If any invalid configs were found, save only the valid ones back
    if (hasInvalidConfig && validConfigs.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validConfigs))
      } catch {
        // Ignore errors when cleaning up invalid data
      }
    } else if (hasInvalidConfig && validConfigs.length === 0) {
      // All configs were invalid, clear storage
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore cleanup errors
      }
    }

    return validConfigs
  } catch (error) {
    console.error('Error loading configurations:', error)

    // If JSON is corrupted, try to recover by clearing storage
    if (error instanceof SyntaxError) {
      console.warn('Corrupted storage data detected, clearing storage')
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore cleanup errors
      }
    }

    return []
  }
}

export const saveConfiguration = (config: SavedConfiguration): void => {
  if (!isStorageAvailable()) {
    throw createStorageError(new Error('localStorage not available'), 'save')
  }

  try {
    const configs = getSavedConfigurations()
    const existingIndex = configs.findIndex(c => c.name === config.name)

    if (existingIndex >= 0) {
      // Update existing configuration
      configs[existingIndex] = {
        ...config,
        lastModified: Date.now(),
      }
    } else {
      // Security: Enforce maximum configuration limit
      if (configs.length >= MAX_CONFIGURATIONS) {
        const error = new Error(
          `Maximum number of configurations (${MAX_CONFIGURATIONS}) reached. Please delete old configurations before saving new ones.`
        )
        throw createStorageError(error, 'save')
      }

      // Add new configuration
      configs.push({
        ...config,
        lastModified: Date.now(),
      })
    }

    const serialized = JSON.stringify(configs)
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.error('Error saving configuration:', error)
    throw createStorageError(error, 'save')
  }
}

export const deleteConfiguration = (name: string): void => {
  if (!isStorageAvailable()) {
    throw createStorageError(new Error('localStorage not available'), 'delete')
  }

  try {
    const configs = getSavedConfigurations()
    const filtered = configs.filter(c => c.name !== name)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting configuration:', error)
    throw createStorageError(error, 'delete')
  }
}
