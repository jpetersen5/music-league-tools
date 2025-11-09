/**
 * useRounds Hook
 *
 * React hook for accessing Music League rounds with efficient ID-based caching.
 * Handles active profile from ProfileContext, including "All Profiles" mode.
 *
 * @module hooks/useMusicLeague/useRounds
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Round, RoundId, ProfileId, DateRange } from '@/types/musicLeague'
import { getRoundsByProfile } from '@/services/database/rounds'
import { getAllProfiles } from '@/services/database/profiles'
import { DatabaseError } from '@/services/database/db'
import { useProfileContext } from '@/contexts/ProfileContext'
import { ALL_PROFILES_ID } from './useCompetitors'

// ============================================================================
// Types
// ============================================================================

/**
 * Return value from useRounds hook
 */
export interface UseRoundsResult {
  /** Array of rounds (sorted by date oldest first by default) */
  rounds: Round[]

  /** True while loading data from IndexedDB */
  loading: boolean

  /** Error message if loading failed, null otherwise */
  error: string | null

  /** Date range spanning all rounds (earliest to latest), null if no rounds */
  dateRange: DateRange | null

  /** Function to manually refresh round data */
  refetch: () => Promise<void>

  /** True if currently in "All Profiles" mode */
  isAllProfiles: boolean

  /** Get a specific round by ID (uses cache) */
  getRound: (id: RoundId) => Round | undefined
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sort rounds by creation date
 */
function sortRoundsByDate(rounds: Round[], ascending = true): Round[] {
  return [...rounds].sort((a, b) => {
    const dateA = a.createdAt.getTime()
    const dateB = b.createdAt.getTime()
    return ascending ? dateA - dateB : dateB - dateA
  })
}

/**
 * Calculate date range from rounds
 */
function calculateDateRange(rounds: Round[]): DateRange | null {
  if (rounds.length === 0) {
    return null
  }

  // Sort by date to get earliest and latest
  const sorted = sortRoundsByDate(rounds, true)

  return {
    earliest: sorted[0]!.createdAt,
    latest: sorted[sorted.length - 1]!.createdAt,
  }
}

/**
 * Deduplicate rounds from multiple profiles by ID
 * When duplicates exist, prefer the one from the active profile
 */
function deduplicateRounds(rounds: Round[], preferredProfileId?: ProfileId): Round[] {
  const roundMap = new Map<RoundId, Round>()

  for (const round of rounds) {
    const existing = roundMap.get(round.id)

    if (!existing) {
      roundMap.set(round.id, round)
    } else if (preferredProfileId && round.profileId === preferredProfileId) {
      // Prefer round from active profile
      roundMap.set(round.id, round)
    }
  }

  return Array.from(roundMap.values())
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to access rounds for the active profile
 *
 * Features:
 * - ID-based caching with lazy loading
 * - Handles "All Profiles" mode by aggregating data
 * - Automatic sorting by date (oldest first by default)
 * - Calculates date range (earliest to latest)
 * - Proper error handling and loading states
 * - Memoized results for optimal performance
 *
 * @param sortByDate - If true, sort by creation date oldest first (default: true)
 * @returns Hook result with rounds array, date range, and utility functions
 *
 * @example
 * ```tsx
 * function RoundList() {
 *   const { rounds, loading, error, dateRange } = useRounds();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <div>
 *       {dateRange && (
 *         <p>
 *           Rounds from {dateRange.earliest.toLocaleDateString()}
 *           to {dateRange.latest.toLocaleDateString()}
 *         </p>
 *       )}
 *       {rounds.map(r => <RoundCard key={r.id} round={r} />)}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Get rounds without sorting
 * function UnsortedRounds() {
 *   const { rounds } = useRounds(false);
 *   return <RoundList rounds={rounds} />;
 * }
 * ```
 */
export function useRounds(sortByDate = true): UseRoundsResult {
  const { activeProfileId } = useProfileContext()

  // State: Store only round IDs for memory efficiency
  const [roundIds, setRoundIds] = useState<RoundId[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)

  // Cache: Persistent Map for full round objects
  const roundCache = useRef(new Map<RoundId, Round>())

  // Track if we're in "All Profiles" mode
  const isAllProfiles = activeProfileId === ALL_PROFILES_ID

  /**
   * Load round IDs from database
   */
  const loadRoundIds = useCallback(async () => {
    if (!activeProfileId) {
      setRoundIds([])
      setDateRange(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let allRounds: Round[] = []

      if (isAllProfiles) {
        // "All Profiles" mode: aggregate from all profiles
        const allProfilesList = await getAllProfiles(false)

        const roundArrays = await Promise.all(
          allProfilesList.map(profile => getRoundsByProfile(profile.id as ProfileId, false))
        )

        // Flatten and deduplicate
        const flatRounds = roundArrays.flat()
        allRounds = deduplicateRounds(flatRounds)
      } else {
        // Single profile mode
        allRounds = await getRoundsByProfile(activeProfileId, false)
      }

      // Sort if requested
      const processedRounds = sortByDate ? sortRoundsByDate(allRounds, true) : allRounds

      // Calculate date range
      const range = calculateDateRange(processedRounds)
      setDateRange(range)

      // Update cache with full objects
      for (const round of processedRounds) {
        roundCache.current.set(round.id, round)
      }

      // Store only IDs in state
      setRoundIds(processedRounds.map(r => r.id))
      setError(null)
    } catch (err: unknown) {
      console.error('Failed to load rounds:', err)

      const errorMessage =
        err instanceof DatabaseError
          ? `Database error: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Failed to load rounds. Please try again.'

      setError(errorMessage)
      setRoundIds([])
      setDateRange(null)
    } finally {
      setLoading(false)
    }
  }, [activeProfileId, sortByDate, isAllProfiles])

  /**
   * Load rounds when profile or sort option changes
   */
  useEffect(() => {
    let mounted = true

    loadRoundIds().then(() => {
      if (!mounted) {
        // Clear state if component unmounted during load
        setRoundIds([])
        setDateRange(null)
      }
    })

    return () => {
      mounted = false
    }
  }, [loadRoundIds])

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async () => {
    await loadRoundIds()
  }, [loadRoundIds])

  /**
   * Get round by ID from cache
   */
  const getRound = useCallback((id: RoundId): Round | undefined => {
    return roundCache.current.get(id)
  }, [])

  /**
   * Memoized array of full round objects
   */
  const rounds = useMemo(() => {
    return roundIds.map(id => roundCache.current.get(id)).filter((r): r is Round => r !== undefined)
  }, [roundIds])

  return {
    rounds,
    loading,
    error,
    dateRange,
    refetch,
    isAllProfiles,
    getRound,
  }
}
