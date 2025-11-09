/**
 * Profile Context
 *
 * React context for managing active Music League profile state
 *
 * @module contexts/ProfileContext
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Profile, ProfileId } from '@/types/musicLeague'
import { createProfileId } from '@/types/musicLeague'
import { getAllProfiles, getProfile, profileExists } from '@/services/database/profiles'
import { initDatabase } from '@/services/database/db'

// ============================================================================
// Constants
// ============================================================================

/**
 * Special ProfileId constant for "All Profiles" virtual profile
 * When active, data queries should aggregate across all profiles
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ALL_PROFILES_ID = createProfileId('__ALL_PROFILES__')

// ============================================================================
// Context Types
// ============================================================================

export interface ProfileContextValue {
  /** Currently active profile (null if none selected, "virtual" for All Profiles) */
  activeProfile: Profile | null

  /** ID of active profile (null if none selected, ALL_PROFILES_ID for All Profiles) */
  activeProfileId: ProfileId | null

  /** All available profiles */
  profiles: Profile[]

  /** Loading state for profile data */
  isLoading: boolean

  /** Error message if profile operations fail */
  error: string | null

  /** True if "All Profiles" virtual profile is active */
  isAllProfilesActive: boolean

  /** Switch to a different profile (can be ALL_PROFILES_ID) */
  setActiveProfile: (profileId: ProfileId | null) => Promise<void>

  /** Reload profiles from database */
  refreshProfiles: () => Promise<void>

  /** Check if a profile is currently active */
  isProfileActive: (profileId: ProfileId) => boolean
}

// ============================================================================
// Context Creation
// ============================================================================

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

// ============================================================================
// Local Storage Keys
// ============================================================================

const ACTIVE_PROFILE_KEY = 'music-league-active-profile'

// ============================================================================
// Provider Component
// ============================================================================

export interface ProfileProviderProps {
  children: ReactNode
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [activeProfileId, setActiveProfileId] = useState<ProfileId | null>(null)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load saved active profile from localStorage
   */
  const loadSavedActiveProfile = useCallback((): ProfileId | null => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROFILE_KEY)
      return saved ? (saved as ProfileId) : null
    } catch (err) {
      console.error('Failed to load saved active profile:', err)
      return null
    }
  }, [])

  /**
   * Save active profile to localStorage
   */
  const saveActiveProfile = useCallback((profileId: ProfileId | null) => {
    try {
      if (profileId) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, profileId)
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY)
      }
    } catch (err) {
      console.error('Failed to save active profile:', err)
    }
  }, [])

  /**
   * Load all profiles from database
   */
  const loadProfiles = useCallback(async () => {
    try {
      const allProfiles = await getAllProfiles(true)
      setProfiles(allProfiles)
      return allProfiles
    } catch (err) {
      console.error('Failed to load profiles:', err)
      setError('Failed to load profiles')
      return []
    }
  }, [])

  /**
   * Load active profile data
   */
  const loadActiveProfile = useCallback(
    async (profileId: ProfileId): Promise<Profile | null> => {
      try {
        const profile = await getProfile(profileId)
        if (profile) {
          setActiveProfile(profile)
          setActiveProfileId(profileId)
          saveActiveProfile(profileId)
          return profile
        } else {
          // Profile doesn't exist, clear selection
          setActiveProfile(null)
          setActiveProfileId(null)
          saveActiveProfile(null)
          return null
        }
      } catch (err) {
        console.error('Failed to load active profile:', err)
        setError('Failed to load active profile')
        return null
      }
    },
    [saveActiveProfile]
  )

  /**
   * Initialize: load database, profiles, and restore active profile
   */
  useEffect(() => {
    let mounted = true

    async function initialize() {
      setIsLoading(true)
      setError(null)

      try {
        // Initialize database
        await initDatabase()

        // Load all profiles
        const allProfiles = await loadProfiles()

        if (!mounted) return

        // Restore active profile from localStorage
        const savedProfileId = loadSavedActiveProfile()

        if (savedProfileId === ALL_PROFILES_ID) {
          // Restore "All Profiles" virtual profile
          setActiveProfileId(ALL_PROFILES_ID)
          setActiveProfile(null)
        } else if (savedProfileId && (await profileExists(savedProfileId))) {
          await loadActiveProfile(savedProfileId)
        } else if (allProfiles.length > 0) {
          // Auto-select first profile if none saved
          await loadActiveProfile(allProfiles[0]!.id as ProfileId)
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to initialize profile context:', err)
          setError('Failed to initialize profiles')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [loadProfiles, loadSavedActiveProfile, loadActiveProfile])

  /**
   * Switch active profile
   */
  const setActiveProfileHandler = useCallback(
    async (profileId: ProfileId | null) => {
      if (profileId === activeProfileId) {
        return // Already active
      }

      setError(null)

      if (profileId === null) {
        setActiveProfile(null)
        setActiveProfileId(null)
        saveActiveProfile(null)
        return
      }

      // Handle "All Profiles" virtual profile
      if (profileId === ALL_PROFILES_ID) {
        setActiveProfile(null) // Virtual profile has no Profile object
        setActiveProfileId(ALL_PROFILES_ID)
        saveActiveProfile(ALL_PROFILES_ID)
        return
      }

      try {
        const profile = await getProfile(profileId)
        if (profile) {
          setActiveProfile(profile)
          setActiveProfileId(profileId)
          saveActiveProfile(profileId)
        } else {
          setError('Profile not found')
        }
      } catch (err) {
        console.error('Failed to switch profile:', err)
        setError('Failed to switch profile')
      }
    },
    [activeProfileId, saveActiveProfile]
  )

  /**
   * Refresh profiles from database
   */
  const refreshProfiles = useCallback(async () => {
    setError(null)
    try {
      await loadProfiles()

      // Verify active profile still exists (skip for "All Profiles" virtual profile)
      if (activeProfileId && activeProfileId !== ALL_PROFILES_ID) {
        const exists = await profileExists(activeProfileId)
        if (!exists) {
          setActiveProfile(null)
          setActiveProfileId(null)
          saveActiveProfile(null)
        }
      }
    } catch (err) {
      console.error('Failed to refresh profiles:', err)
      setError('Failed to refresh profiles')
    }
  }, [activeProfileId, loadProfiles, saveActiveProfile])

  /**
   * Check if a profile is currently active
   */
  const isProfileActive = useCallback(
    (profileId: ProfileId): boolean => {
      return activeProfileId === profileId
    },
    [activeProfileId]
  )

  // Compute if "All Profiles" virtual profile is active
  const isAllProfilesActive = activeProfileId === ALL_PROFILES_ID

  const value: ProfileContextValue = {
    activeProfile,
    activeProfileId,
    profiles,
    isLoading,
    error,
    isAllProfilesActive,
    setActiveProfile: setActiveProfileHandler,
    refreshProfiles,
    isProfileActive,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// ============================================================================
// Hook for consuming context
// ============================================================================

/**
 * Hook to access profile context
 *
 * @returns Profile context value
 * @throws Error if used outside ProfileProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useProfileContext(): ProfileContextValue {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider')
  }
  return context
}
