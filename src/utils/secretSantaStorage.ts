import type { SavedConfiguration } from '@/types'

const STORAGE_KEY = 'secret-santa-configurations'

export const getSavedConfigurations = (): SavedConfiguration[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading configurations:', error)
    return []
  }
}

export const saveConfiguration = (config: SavedConfiguration): void => {
  try {
    const configs = getSavedConfigurations()
    const existingIndex = configs.findIndex(c => c.name === config.name)

    if (existingIndex >= 0) {
      configs[existingIndex] = {
        ...config,
        lastModified: Date.now(),
      }
    } else {
      configs.push({
        ...config,
        lastModified: Date.now(),
      })
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  } catch (error) {
    console.error('Error saving configuration:', error)
    throw new Error('Failed to save configuration')
  }
}

export const deleteConfiguration = (name: string): void => {
  try {
    const configs = getSavedConfigurations()
    const filtered = configs.filter(c => c.name !== name)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting configuration:', error)
    throw new Error('Failed to delete configuration')
  }
}

export const getConfiguration = (name: string): SavedConfiguration | undefined => {
  const configs = getSavedConfigurations()
  return configs.find(c => c.name === name)
}

export const configurationExists = (name: string): boolean => {
  const configs = getSavedConfigurations()
  return configs.some(c => c.name === name)
}
