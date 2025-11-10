/**
 * useVotes Hook
 *
 * React hook for accessing Music League votes with efficient ID-based caching.
 * Handles active profile from ProfileContext, including "All Profiles" mode.
 * Supports comprehensive filtering and calculates vote statistics.
 *
 * @module hooks/useMusicLeague/useVotes
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type {
  Vote,
  ProfileId,
  CompetitorId,
  RoundId,
  SpotifyUri,
  DateRangeFilter,
} from '@/types/musicLeague'
import {
  getVotesByProfile,
  getVotesByVoter,
  getVotesForSubmission,
  getVotesByRound,
} from '@/services/database/votes'
import { getAllProfiles } from '@/services/database/profiles'
import { DatabaseError } from '@/services/database/db'
import { useProfileContext } from '@/contexts/ProfileContext'
import { ALL_PROFILES_ID } from './useCompetitors'

// ============================================================================
// Types
// ============================================================================

/**
 * Points range filter
 */
export interface PointsRange {
  /** Minimum points (inclusive) */
  min?: number
  /** Maximum points (inclusive) */
  max?: number
}

/**
 * Filter options for vote queries
 */
export interface VoteFilters {
  /** Filter by specific voter */
  voterId?: CompetitorId

  /** Filter by specific submission that was voted on */
  submissionUri?: SpotifyUri

  /** Filter by specific round */
  roundId?: RoundId

  /** Only include votes with non-empty comments */
  hasComments?: boolean

  /** Filter by points range */
  pointsRange?: PointsRange

  /** Filter by vote date range */
  dateRange?: DateRangeFilter
}

/**
 * Statistical data about votes
 */
export interface VoteStatistics {
  /** Total number of votes */
  totalVotes: number

  /** Total points assigned across all votes */
  totalPoints: number

  /** Average points per vote */
  averagePoints: number

  /** Highest points assigned in a single vote */
  highestVote: number

  /** Lowest points assigned in a single vote */
  lowestVote: number

  /** Number of votes with comments */
  votesWithComments: number

  /** Percentage of votes with comments */
  commentPercentage: number
}

/**
 * Return value from useVotes hook
 */
export interface UseVotesResult {
  /** Array of votes matching filters */
  votes: Vote[]

  /** Error message if loading failed, null otherwise */
  error: string | null

  /** Statistical summary of the votes */
  statistics: VoteStatistics

  /** Function to manually refresh vote data */
  refetch: () => Promise<void>

  /** True if currently in "All Profiles" mode */
  isAllProfiles: boolean

  /** Get votes for a specific submission (uses cache) */
  getVotesForSubmission: (uri: SpotifyUri) => Vote[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique key for a vote (for use in Map)
 */
function getVoteKey(vote: Vote): string {
  return `${vote.profileId}:${vote.spotifyUri}:${vote.voterId}`
}

/**
 * Check if vote falls within date range
 */
function matchesDateRange(vote: Vote, dateRange: DateRangeFilter): boolean {
  const { from, to } = dateRange

  if (from && vote.createdAt < from) {
    return false
  }

  if (to && vote.createdAt > to) {
    return false
  }

  return true
}

/**
 * Check if vote falls within points range
 */
function matchesPointsRange(vote: Vote, pointsRange: PointsRange): boolean {
  const { min, max } = pointsRange

  if (min !== undefined && vote.pointsAssigned < min) {
    return false
  }

  if (max !== undefined && vote.pointsAssigned > max) {
    return false
  }

  return true
}

/**
 * Apply all filters to a vote
 */
function matchesFilters(vote: Vote, filters: VoteFilters): boolean {
  // Comments filter
  if (filters.hasComments && (!vote.comment || vote.comment.trim() === '')) {
    return false
  }

  // Date range filter
  if (filters.dateRange && !matchesDateRange(vote, filters.dateRange)) {
    return false
  }

  // Points range filter
  if (filters.pointsRange && !matchesPointsRange(vote, filters.pointsRange)) {
    return false
  }

  return true
}

/**
 * Calculate statistics from votes
 */
function calculateStatistics(votes: Vote[]): VoteStatistics {
  if (votes.length === 0) {
    return {
      totalVotes: 0,
      totalPoints: 0,
      averagePoints: 0,
      highestVote: 0,
      lowestVote: 0,
      votesWithComments: 0,
      commentPercentage: 0,
    }
  }

  const totalPoints = votes.reduce((sum, vote) => sum + vote.pointsAssigned, 0)
  const averagePoints = totalPoints / votes.length

  const points = votes.map(v => v.pointsAssigned)
  const highestVote = Math.max(...points)
  const lowestVote = Math.min(...points)

  const votesWithComments = votes.filter(vote => vote.comment && vote.comment.trim() !== '').length

  const commentPercentage = (votesWithComments / votes.length) * 100

  return {
    totalVotes: votes.length,
    totalPoints,
    averagePoints: parseFloat(averagePoints.toFixed(2)),
    highestVote,
    lowestVote,
    votesWithComments,
    commentPercentage: parseFloat(commentPercentage.toFixed(2)),
  }
}

/**
 * Deduplicate votes from multiple profiles
 * When duplicates exist, prefer the one from the active profile
 */
function deduplicateVotes(votes: Vote[], preferredProfileId?: ProfileId): Vote[] {
  const voteMap = new Map<string, Vote>()

  for (const vote of votes) {
    const key = getVoteKey(vote)
    const existing = voteMap.get(key)

    if (!existing) {
      voteMap.set(key, vote)
    } else if (preferredProfileId && vote.profileId === preferredProfileId) {
      // Prefer vote from active profile
      voteMap.set(key, vote)
    }
  }

  return Array.from(voteMap.values())
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to access votes for the active profile
 *
 * Features:
 * - ID-based caching with lazy loading (stores vote keys)
 * - Handles "All Profiles" mode by aggregating data
 * - Comprehensive filtering: voter, submission, round, comments, points, date
 * - Calculates statistics: total/average points, high/low votes, comment rate
 * - Proper error handling and loading states
 * - Memoized results for optimal performance
 *
 * @param filters - Optional filters to apply to votes
 * @returns Hook result with votes array, statistics, and utility functions
 *
 * @example
 * ```tsx
 * function VoteList() {
 *   const { votes, loading, error, statistics } = useVotes();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <div>
 *       <div>
 *         <h3>Vote Statistics</h3>
 *         <p>Total Votes: {statistics.totalVotes}</p>
 *         <p>Average Points: {statistics.averagePoints}</p>
 *         <p>Comment Rate: {statistics.commentPercentage}%</p>
 *       </div>
 *       {votes.map(v => <VoteCard key={getVoteKey(v)} vote={v} />)}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Filter votes by points range
 * function HighVotes() {
 *   const { votes, statistics } = useVotes({
 *     pointsRange: { min: 5 },
 *   });
 *
 *   return (
 *     <div>
 *       <h3>High Votes (5+ points)</h3>
 *       <p>Average: {statistics.averagePoints} points</p>
 *       <VoteList votes={votes} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Get votes for a specific round with comments
 * function RoundVotesWithComments({ roundId }: { roundId: RoundId }) {
 *   const { votes, statistics } = useVotes({
 *     roundId,
 *     hasComments: true,
 *   });
 *
 *   return (
 *     <div>
 *       <p>{statistics.votesWithComments} votes with comments</p>
 *       <VoteList votes={votes} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useVotes(filters: VoteFilters = {}): UseVotesResult {
  const { activeProfileId } = useProfileContext()

  // State: Store only vote keys for memory efficiency
  const [voteKeys, setVoteKeys] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<VoteStatistics>({
    totalVotes: 0,
    totalPoints: 0,
    averagePoints: 0,
    highestVote: 0,
    lowestVote: 0,
    votesWithComments: 0,
    commentPercentage: 0,
  })

  // Cache: Persistent Map for full vote objects
  const voteCache = useRef(new Map<string, Vote>())

  // Track if we're in "All Profiles" mode
  const isAllProfiles = activeProfileId === ALL_PROFILES_ID

  /**
   * Load vote keys from database based on filters
   */
  const loadVoteKeys = useCallback(async () => {
    if (!activeProfileId) {
      setVoteKeys([])
      setStatistics({
        totalVotes: 0,
        totalPoints: 0,
        averagePoints: 0,
        highestVote: 0,
        lowestVote: 0,
        votesWithComments: 0,
        commentPercentage: 0,
      })
      return
    }

    setError(null)

    try {
      let allVotes: Vote[] = []

      if (isAllProfiles) {
        // "All Profiles" mode: aggregate from all profiles
        const allProfilesList = await getAllProfiles(false)

        // Use optimized queries when filters are present
        if (filters.voterId) {
          // Query by voter across all profiles
          const voteArrays = await Promise.all(
            allProfilesList.map(profile =>
              getVotesByVoter(profile.id as ProfileId, filters.voterId!)
            )
          )
          allVotes = voteArrays.flat()
        } else if (filters.submissionUri) {
          // Query by submission across all profiles
          const voteArrays = await Promise.all(
            allProfilesList.map(profile =>
              getVotesForSubmission(profile.id as ProfileId, filters.submissionUri!)
            )
          )
          allVotes = voteArrays.flat()
        } else if (filters.roundId) {
          // Query by round across all profiles
          const voteArrays = await Promise.all(
            allProfilesList.map(profile =>
              getVotesByRound(profile.id as ProfileId, filters.roundId!)
            )
          )
          allVotes = voteArrays.flat()
        } else {
          // Get all votes across all profiles
          const voteArrays = await Promise.all(
            allProfilesList.map(profile => getVotesByProfile(profile.id as ProfileId))
          )
          allVotes = voteArrays.flat()
        }

        // Deduplicate votes
        allVotes = deduplicateVotes(allVotes)
      } else {
        // Single profile mode - use optimized queries
        if (filters.voterId) {
          allVotes = await getVotesByVoter(activeProfileId, filters.voterId)
        } else if (filters.submissionUri) {
          allVotes = await getVotesForSubmission(activeProfileId, filters.submissionUri)
        } else if (filters.roundId) {
          allVotes = await getVotesByRound(activeProfileId, filters.roundId)
        } else {
          allVotes = await getVotesByProfile(activeProfileId)
        }
      }

      // Apply client-side filters (comments, date range, points range)
      const filteredVotes = allVotes.filter(vote => matchesFilters(vote, filters))

      // Calculate statistics
      const stats = calculateStatistics(filteredVotes)
      setStatistics(stats)

      // Update cache with full objects
      for (const vote of filteredVotes) {
        const key = getVoteKey(vote)
        voteCache.current.set(key, vote)
      }

      // Store only keys in state
      setVoteKeys(filteredVotes.map(getVoteKey))
      setError(null)
    } catch (err: unknown) {
      console.error('Failed to load votes:', err)

      const errorMessage =
        err instanceof DatabaseError
          ? `Database error: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Failed to load votes. Please try again.'

      setError(errorMessage)
      setVoteKeys([])
      setStatistics({
        totalVotes: 0,
        totalPoints: 0,
        averagePoints: 0,
        highestVote: 0,
        lowestVote: 0,
        votesWithComments: 0,
        commentPercentage: 0,
      })
    }
  }, [activeProfileId, filters, isAllProfiles])

  /**
   * Load votes when profile or filters change
   */
  useEffect(() => {
    let mounted = true

    loadVoteKeys().then(() => {
      if (!mounted) {
        // Clear state if component unmounted during load
        setVoteKeys([])
        setStatistics({
          totalVotes: 0,
          totalPoints: 0,
          averagePoints: 0,
          highestVote: 0,
          lowestVote: 0,
          votesWithComments: 0,
          commentPercentage: 0,
        })
      }
    })

    return () => {
      mounted = false
    }
  }, [loadVoteKeys])

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async () => {
    await loadVoteKeys()
  }, [loadVoteKeys])

  /**
   * Get votes for a specific submission from cache
   */
  const getVotesForSubmissionFromCache = useCallback((uri: SpotifyUri): Vote[] => {
    const allVotes = Array.from(voteCache.current.values())
    return allVotes.filter(vote => vote.spotifyUri === uri)
  }, [])

  /**
   * Memoized array of full vote objects
   */
  const votes = useMemo(() => {
    return voteKeys.map(key => voteCache.current.get(key)).filter((v): v is Vote => v !== undefined)
  }, [voteKeys])

  return {
    votes,
    error,
    statistics,
    refetch,
    isAllProfiles,
    getVotesForSubmission: getVotesForSubmissionFromCache,
  }
}
