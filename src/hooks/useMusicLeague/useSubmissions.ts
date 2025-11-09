/**
 * useSubmissions Hook
 *
 * React hook for accessing Music League submissions with efficient ID-based caching.
 * Handles active profile from ProfileContext, including "All Profiles" mode.
 * Supports comprehensive filtering and searching.
 *
 * @module hooks/useMusicLeague/useSubmissions
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type {
  Submission,
  SpotifyUri,
  ProfileId,
  CompetitorId,
  RoundId,
  DateRangeFilter,
} from '@/types/musicLeague'
import {
  getSubmissionsByProfile,
  getSubmissionsByCompetitor,
  getSubmissionsByRound,
} from '@/services/database/submissions'
import { getAllProfiles } from '@/services/database/profiles'
import { DatabaseError } from '@/services/database/db'
import { useProfileContext } from '@/contexts/ProfileContext'
import { ALL_PROFILES_ID } from './useCompetitors'

// ============================================================================
// Types
// ============================================================================

/**
 * Filter options for submission queries
 */
export interface SubmissionFilters {
  /** Filter by specific competitor who submitted */
  competitorId?: CompetitorId

  /** Filter by specific round */
  roundId?: RoundId

  /** Search query to match against title, album, or artists */
  searchQuery?: string

  /** Filter by submission date range */
  dateRange?: DateRangeFilter

  /** Only include submissions with non-empty comments */
  hasComments?: boolean

  /** Only include submissions visible to voters */
  visibleToVoters?: boolean
}

/**
 * Return value from useSubmissions hook
 */
export interface UseSubmissionsResult {
  /** Array of submissions matching filters */
  submissions: Submission[]

  /** True while loading data from IndexedDB */
  loading: boolean

  /** Error message if loading failed, null otherwise */
  error: string | null

  /** Total count of submissions (before any client-side filtering) */
  totalCount: number

  /** Function to manually refresh submission data */
  refetch: () => Promise<void>

  /** True if currently in "All Profiles" mode */
  isAllProfiles: boolean

  /** Get a specific submission by Spotify URI (uses cache) */
  getSubmission: (uri: SpotifyUri) => Submission | undefined
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if submission matches search query (title, album, or artists)
 */
function matchesSearchQuery(submission: Submission, query: string): boolean {
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    return true
  }

  const titleMatch = submission.title.toLowerCase().includes(lowerQuery)
  const albumMatch = submission.album.toLowerCase().includes(lowerQuery)
  const artistMatch = submission.artists.some(artist => artist.toLowerCase().includes(lowerQuery))

  return titleMatch || albumMatch || artistMatch
}

/**
 * Check if submission falls within date range
 */
function matchesDateRange(submission: Submission, dateRange: DateRangeFilter): boolean {
  const { from, to } = dateRange

  if (from && submission.createdAt < from) {
    return false
  }

  if (to && submission.createdAt > to) {
    return false
  }

  return true
}

/**
 * Apply all filters to a submission
 */
function matchesFilters(submission: Submission, filters: SubmissionFilters): boolean {
  // Search query filter
  if (filters.searchQuery && !matchesSearchQuery(submission, filters.searchQuery)) {
    return false
  }

  // Date range filter
  if (filters.dateRange && !matchesDateRange(submission, filters.dateRange)) {
    return false
  }

  // Comments filter
  if (filters.hasComments && (!submission.comment || submission.comment.trim() === '')) {
    return false
  }

  // Visibility filter
  if (
    filters.visibleToVoters !== undefined &&
    submission.visibleToVoters !== filters.visibleToVoters
  ) {
    return false
  }

  return true
}

/**
 * Deduplicate submissions from multiple profiles by Spotify URI
 * When duplicates exist, prefer the one from the active profile
 */
function deduplicateSubmissions(
  submissions: Submission[],
  preferredProfileId?: ProfileId
): Submission[] {
  const submissionMap = new Map<SpotifyUri, Submission>()

  for (const submission of submissions) {
    const existing = submissionMap.get(submission.spotifyUri)

    if (!existing) {
      submissionMap.set(submission.spotifyUri, submission)
    } else if (preferredProfileId && submission.profileId === preferredProfileId) {
      // Prefer submission from active profile
      submissionMap.set(submission.spotifyUri, submission)
    }
  }

  return Array.from(submissionMap.values())
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to access submissions for the active profile
 *
 * Features:
 * - ID-based caching with lazy loading (stores Spotify URIs)
 * - Handles "All Profiles" mode by aggregating data
 * - Comprehensive filtering: competitor, round, search, date range, comments
 * - Search across title, album, and artists
 * - Proper error handling and loading states
 * - Memoized results for optimal performance
 *
 * @param filters - Optional filters to apply to submissions
 * @returns Hook result with submissions array and utility functions
 *
 * @example
 * ```tsx
 * function SubmissionList() {
 *   const { submissions, loading, error, totalCount } = useSubmissions();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <div>
 *       <p>Showing {submissions.length} of {totalCount} submissions</p>
 *       {submissions.map(s => <SubmissionCard key={s.spotifyUri} submission={s} />)}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Filter submissions with search query
 * function SearchableSubmissions() {
 *   const [searchQuery, setSearchQuery] = useState('');
 *   const { submissions, loading } = useSubmissions({ searchQuery });
 *
 *   return (
 *     <div>
 *       <input
 *         value={searchQuery}
 *         onChange={(e) => setSearchQuery(e.target.value)}
 *         placeholder="Search by title, album, or artist..."
 *       />
 *       {loading ? <Spinner /> : <SubmissionList submissions={submissions} />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Filter by round and comments
 * function RoundSubmissionsWithComments({ roundId }: { roundId: RoundId }) {
 *   const { submissions } = useSubmissions({
 *     roundId,
 *     hasComments: true,
 *   });
 *
 *   return <SubmissionList submissions={submissions} />;
 * }
 * ```
 */
export function useSubmissions(filters: SubmissionFilters = {}): UseSubmissionsResult {
  const { activeProfileId } = useProfileContext()

  // State: Store only Spotify URIs for memory efficiency
  const [submissionUris, setSubmissionUris] = useState<SpotifyUri[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Cache: Persistent Map for full submission objects
  const submissionCache = useRef(new Map<SpotifyUri, Submission>())

  // Track if we're in "All Profiles" mode
  const isAllProfiles = activeProfileId === ALL_PROFILES_ID

  /**
   * Load submission URIs from database based on filters
   */
  const loadSubmissionUris = useCallback(async () => {
    if (!activeProfileId) {
      setSubmissionUris([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let allSubmissions: Submission[] = []

      if (isAllProfiles) {
        // "All Profiles" mode: aggregate from all profiles
        const allProfilesList = await getAllProfiles(false)

        // Use optimized queries when filters are present
        if (filters.competitorId) {
          // Query by competitor across all profiles
          const submissionArrays = await Promise.all(
            allProfilesList.map(profile =>
              getSubmissionsByCompetitor(profile.id as ProfileId, filters.competitorId!)
            )
          )
          allSubmissions = submissionArrays.flat()
        } else if (filters.roundId) {
          // Query by round across all profiles
          const submissionArrays = await Promise.all(
            allProfilesList.map(profile =>
              getSubmissionsByRound(profile.id as ProfileId, filters.roundId!)
            )
          )
          allSubmissions = submissionArrays.flat()
        } else {
          // Get all submissions across all profiles
          const submissionArrays = await Promise.all(
            allProfilesList.map(profile => getSubmissionsByProfile(profile.id as ProfileId))
          )
          allSubmissions = submissionArrays.flat()
        }

        // Deduplicate submissions
        allSubmissions = deduplicateSubmissions(allSubmissions)
      } else {
        // Single profile mode - use optimized queries
        if (filters.competitorId) {
          allSubmissions = await getSubmissionsByCompetitor(activeProfileId, filters.competitorId)
        } else if (filters.roundId) {
          allSubmissions = await getSubmissionsByRound(activeProfileId, filters.roundId)
        } else {
          allSubmissions = await getSubmissionsByProfile(activeProfileId)
        }
      }

      // Store total count before client-side filtering
      setTotalCount(allSubmissions.length)

      // Apply client-side filters (search, date range, comments, visibility)
      const filteredSubmissions = allSubmissions.filter(submission =>
        matchesFilters(submission, filters)
      )

      // Update cache with full objects
      for (const submission of filteredSubmissions) {
        submissionCache.current.set(submission.spotifyUri, submission)
      }

      // Store only URIs in state
      setSubmissionUris(filteredSubmissions.map(s => s.spotifyUri))
      setError(null)
    } catch (err: unknown) {
      console.error('Failed to load submissions:', err)

      const errorMessage =
        err instanceof DatabaseError
          ? `Database error: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Failed to load submissions. Please try again.'

      setError(errorMessage)
      setSubmissionUris([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [activeProfileId, filters, isAllProfiles])

  /**
   * Load submissions when profile or filters change
   */
  useEffect(() => {
    let mounted = true

    loadSubmissionUris().then(() => {
      if (!mounted) {
        // Clear state if component unmounted during load
        setSubmissionUris([])
        setTotalCount(0)
      }
    })

    return () => {
      mounted = false
    }
  }, [loadSubmissionUris])

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async () => {
    await loadSubmissionUris()
  }, [loadSubmissionUris])

  /**
   * Get submission by Spotify URI from cache
   */
  const getSubmission = useCallback((uri: SpotifyUri): Submission | undefined => {
    return submissionCache.current.get(uri)
  }, [])

  /**
   * Memoized array of full submission objects
   */
  const submissions = useMemo(() => {
    return submissionUris
      .map(uri => submissionCache.current.get(uri))
      .filter((s): s is Submission => s !== undefined)
  }, [submissionUris])

  return {
    submissions,
    loading,
    error,
    totalCount,
    refetch,
    isAllProfiles,
    getSubmission,
  }
}
