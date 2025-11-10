/**
 * useCompetitors Hook
 *
 * React hook for accessing Music League competitors with efficient ID-based caching.
 * Handles active profile from ProfileContext, including "All Profiles" mode.
 *
 * @module hooks/useMusicLeague/useCompetitors
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Competitor, CompetitorId, ProfileId } from '@/types/musicLeague'
import { getCompetitorsByProfile } from '@/services/database/competitors'
import { getAllProfiles } from '@/services/database/profiles'
import { DatabaseError } from '@/services/database/db'
import { useProfileContext } from '@/contexts/ProfileContext'

// ============================================================================
// Constants
// ============================================================================

/**
 * Special profile ID representing aggregated data from all profiles
 */
export const ALL_PROFILES_ID = '__ALL_PROFILES__' as ProfileId

// ============================================================================
// Types
// ============================================================================

/**
 * Return value from useCompetitors hook
 */
export interface UseCompetitorsResult {
  /** Array of competitors (sorted: non-orphaned first, then orphaned, both alphabetically) */
  competitors: Competitor[]

  /** Error message if loading failed, null otherwise */
  error: string | null

  /** Function to manually refresh competitor data */
  refetch: () => Promise<void>

  /** True if currently in "All Profiles" mode */
  isAllProfiles: boolean

  /** Get a specific competitor by ID (uses cache) */
  getCompetitor: (id: CompetitorId) => Competitor | undefined
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sort competitors: non-orphaned first, then orphaned, both alphabetically by name
 */
function sortCompetitors(competitors: Competitor[]): Competitor[] {
  return [...competitors].sort((a, b) => {
    // Sort by orphaned status first (non-orphaned = false comes first)
    if (a.isOrphaned !== b.isOrphaned) {
      return a.isOrphaned ? 1 : -1
    }

    // Then sort alphabetically by name
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

/**
 * Deduplicate competitors from multiple profiles by ID
 * When duplicates exist, prefer the one from the active profile
 */
function deduplicateCompetitors(
  competitors: Competitor[],
  preferredProfileId?: ProfileId
): Competitor[] {
  const competitorMap = new Map<CompetitorId, Competitor>()

  // First pass: add all competitors
  for (const competitor of competitors) {
    const existing = competitorMap.get(competitor.id)

    if (!existing) {
      competitorMap.set(competitor.id, competitor)
    } else if (preferredProfileId && competitor.profileId === preferredProfileId) {
      // Prefer competitor from active profile
      competitorMap.set(competitor.id, competitor)
    }
  }

  return Array.from(competitorMap.values())
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to access competitors for the active profile
 *
 * Features:
 * - ID-based caching with lazy loading
 * - Handles "All Profiles" mode by aggregating data
 * - Automatic sorting (non-orphaned first, then alphabetically)
 * - Optional orphaned competitor filtering
 * - Proper error handling and loading states
 * - Memoized results for optimal performance
 *
 * @param includeOrphaned - If false, exclude orphaned competitors (default: true)
 * @returns Hook result with competitors array and utility functions
 *
 * @example
 * ```tsx
 * function CompetitorList() {
 *   const { competitors, loading, error, refetch } = useCompetitors();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <div>
 *       {competitors.map(c => <div key={c.id}>{c.name}</div>)}
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Exclude orphaned competitors
 * function ActiveCompetitors() {
 *   const { competitors } = useCompetitors(false);
 *   return <CompetitorList competitors={competitors} />;
 * }
 * ```
 */
export function useCompetitors(includeOrphaned = true): UseCompetitorsResult {
  const { activeProfileId } = useProfileContext()

  // State: Store only competitor IDs for memory efficiency
  const [competitorIds, setCompetitorIds] = useState<CompetitorId[]>([])
  const [error, setError] = useState<string | null>(null)

  // Cache: Persistent Map for full competitor objects
  const competitorCache = useRef(new Map<CompetitorId, Competitor>())

  // Track if we're in "All Profiles" mode
  const isAllProfiles = activeProfileId === ALL_PROFILES_ID

  /**
   * Load competitor IDs from database
   */
  const loadCompetitorIds = useCallback(async () => {
    if (!activeProfileId) {
      setCompetitorIds([])
      return
    }

    setError(null)

    try {
      let allCompetitors: Competitor[] = []

      if (isAllProfiles) {
        // "All Profiles" mode: aggregate from all profiles
        const allProfilesList = await getAllProfiles(false)

        const competitorArrays = await Promise.all(
          allProfilesList.map(profile =>
            getCompetitorsByProfile(profile.id as ProfileId, includeOrphaned)
          )
        )

        // Flatten and deduplicate
        const flatCompetitors = competitorArrays.flat()
        allCompetitors = deduplicateCompetitors(flatCompetitors)
      } else {
        // Single profile mode
        allCompetitors = await getCompetitorsByProfile(activeProfileId, includeOrphaned)
      }

      // Sort competitors
      const sortedCompetitors = sortCompetitors(allCompetitors)

      // Update cache with full objects
      for (const competitor of sortedCompetitors) {
        competitorCache.current.set(competitor.id, competitor)
      }

      // Store only IDs in state
      setCompetitorIds(sortedCompetitors.map(c => c.id))
      setError(null)
    } catch (err: unknown) {
      console.error('Failed to load competitors:', err)

      const errorMessage =
        err instanceof DatabaseError
          ? `Database error: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Failed to load competitors. Please try again.'

      setError(errorMessage)
      setCompetitorIds([])
    }
  }, [activeProfileId, includeOrphaned, isAllProfiles])

  /**
   * Load competitors when profile or filter changes
   */
  useEffect(() => {
    let mounted = true

    loadCompetitorIds().then(() => {
      if (!mounted) {
        // Clear state if component unmounted during load
        setCompetitorIds([])
      }
    })

    return () => {
      mounted = false
    }
  }, [loadCompetitorIds])

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async () => {
    await loadCompetitorIds()
  }, [loadCompetitorIds])

  /**
   * Get competitor by ID from cache
   */
  const getCompetitor = useCallback((id: CompetitorId): Competitor | undefined => {
    return competitorCache.current.get(id)
  }, [])

  /**
   * Memoized array of full competitor objects
   */
  const competitors = useMemo(() => {
    return competitorIds
      .map(id => competitorCache.current.get(id))
      .filter((c): c is Competitor => c !== undefined)
  }, [competitorIds])

  return {
    competitors,
    error,
    refetch,
    isAllProfiles,
    getCompetitor,
  }
}
