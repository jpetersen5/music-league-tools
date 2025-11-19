import { useMemo, useCallback } from 'react'
import { useCompetitors } from './useCompetitors'
import { useRounds } from './useRounds'
import { useVotes } from './useVotes'
import { useSubmissions } from './useSubmissions'
import type {
  LeaderboardFilters,
  LeaderboardEntry,
  LeaderboardStatistics,
  UseLeaderboardResult,
  RoundPerformance,
} from '@/types/leaderboard'
import { RankingMetric } from '@/types/leaderboard'
import type { CompetitorId, RoundId, Vote, Submission } from '@/types/musicLeague'
import {
  calculateTotalPoints,
  calculateWinRate,
  calculatePodiumRate,
  calculateAveragePosition,
  calculateConsistency,
  assignRanks,
} from '@/utils/musicLeague/leaderboard/calculations'

/**
 * Filter votes to only include meaningful votes (those with positive points assigned).
 *
 * BUSINESS RULE: 0-point votes are excluded from counts and calculations because they
 * represent votes that were only recorded due to having a comment, not actual point allocation.
 * This applies to:
 * - votesReceived count
 * - avgVoteCast calculation
 */
function filterPositiveVotes(votes: Vote[]): Vote[] {
  return votes.filter(v => v.pointsAssigned > 0)
}

/**
 * Calculate points per submitter for a round, applying business rules.
 * BUSINESS RULE 2: If submitter didn't vote, only negative votes count.
 */
function calculateRoundPoints(
  roundVotes: Vote[],
  roundSubmissions: Submission[]
): Map<CompetitorId, number> {
  const uriToSubmitter = new Map<string, CompetitorId>()
  for (const submission of roundSubmissions) {
    uriToSubmitter.set(submission.spotifyUri, submission.submitterId)
  }

  const votersInRound = new Set<CompetitorId>()
  for (const vote of roundVotes) {
    votersInRound.add(vote.voterId)
  }

  const submissionPoints = new Map<CompetitorId, number>()

  for (const vote of roundVotes) {
    if (!vote.spotifyUri || vote.pointsAssigned == null) continue

    const submitterId = uriToSubmitter.get(vote.spotifyUri)
    if (!submitterId) continue

    // BUSINESS RULE 2: Non-voters only receive negative votes
    const submitterVoted = votersInRound.has(submitterId)
    if (!submitterVoted && vote.pointsAssigned >= 0) {
      continue
    }

    const current = submissionPoints.get(submitterId) || 0
    submissionPoints.set(submitterId, current + vote.pointsAssigned)
  }

  return submissionPoints
}

export function useLeaderboard(filters: LeaderboardFilters): UseLeaderboardResult {
  // Stable empty objects to prevent infinite loops from default parameters
  const emptyVoteFilters = useMemo(() => ({}), [])
  const emptySubmissionFilters = useMemo(() => ({}), [])

  const { competitors, loading: competitorsLoading, error: competitorsError } = useCompetitors(true)
  const { rounds, loading: roundsLoading, error: roundsError } = useRounds(true)
  const { votes, loading: votesLoading, error: votesError } = useVotes(emptyVoteFilters)
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useSubmissions(emptySubmissionFilters)

  const isLoading = competitorsLoading || roundsLoading || votesLoading || submissionsLoading

  const filteredRounds = useMemo(() => {
    if (!rounds) return []

    let filtered = rounds

    if (filters.time.from) {
      const from = filters.time.from
      filtered = filtered.filter(r => r.createdAt >= from)
    }
    if (filters.time.to) {
      const to = filters.time.to
      filtered = filtered.filter(r => r.createdAt <= to)
    }

    if (filters.time.roundIds && filters.time.roundIds.length > 0) {
      const roundIdSet = new Set(filters.time.roundIds)
      filtered = filtered.filter(r => roundIdSet.has(r.id))
    }

    return filtered
  }, [rounds, filters.time])

  // Pre-index votes and submissions by roundId for O(1) lookups
  const votesByRound = useMemo(() => {
    if (!votes) return new Map<RoundId, Vote[]>()
    const map = new Map<RoundId, Vote[]>()
    for (const vote of votes) {
      const existing = map.get(vote.roundId) || []
      existing.push(vote)
      map.set(vote.roundId, existing)
    }
    return map
  }, [votes])

  const submissionsByRound = useMemo(() => {
    if (!submissions) return new Map<RoundId, Submission[]>()
    const map = new Map<RoundId, Submission[]>()
    for (const submission of submissions) {
      const existing = map.get(submission.roundId) || []
      existing.push(submission)
      map.set(submission.roundId, existing)
    }
    return map
  }, [submissions])

  // Map of roundId -> competitorId -> position
  const roundPositions = useMemo(() => {
    if (!filteredRounds) return new Map()

    const positions = new Map<RoundId, Map<CompetitorId, number>>()

    for (const round of filteredRounds) {
      const roundVotes = votesByRound.get(round.id) || []
      const roundSubmissions = submissionsByRound.get(round.id) || []

      const submissionPoints = calculateRoundPoints(roundVotes, roundSubmissions)

      // Sort by points descending and assign positions with tie handling
      const sorted = Array.from(submissionPoints.entries()).sort((a, b) => b[1] - a[1])

      const roundPos = new Map<CompetitorId, number>()
      let currentPosition = 1

      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i]
        if (!entry) continue
        const [competitorId, points] = entry

        if (i > 0) {
          const prevEntry = sorted[i - 1]
          if (prevEntry && points !== prevEntry[1]) {
            currentPosition = i + 1
          }
        }

        roundPos.set(competitorId, currentPosition)
      }

      positions.set(round.id, roundPos)
    }

    return positions
  }, [votesByRound, submissionsByRound, filteredRounds])

  const competitorPerformances = useMemo(() => {
    if (!filteredRounds || !roundPositions) return new Map()

    const performances = new Map<CompetitorId, RoundPerformance[]>()

    for (const round of filteredRounds) {
      const roundVotes = votesByRound.get(round.id) || []
      const roundSubmissions = submissionsByRound.get(round.id) || []
      const roundPos = roundPositions.get(round.id)
      if (!roundPos) continue

      const competitorPoints = calculateRoundPoints(roundVotes, roundSubmissions)
      const totalCompetitors = roundPos.size

      for (const [competitorId, points] of competitorPoints) {
        const position = roundPos.get(competitorId) || 0
        if (position === 0) continue

        const perf: RoundPerformance = {
          roundId: round.id,
          roundName: round.name,
          roundDate: round.createdAt,
          pointsReceived: points,
          position,
          totalCompetitors,
        }

        const existing = performances.get(competitorId) || []
        performances.set(competitorId, [...existing, perf])
      }
    }

    return performances
  }, [votesByRound, submissionsByRound, filteredRounds, roundPositions])

  const unrankedEntries = useMemo(() => {
    if (!competitors || !competitorPerformances || !votes || !submissions) return []

    const entries: Omit<LeaderboardEntry, 'rank'>[] = []

    // Use Set for O(1) lookup instead of O(n) Array.includes()
    const filteredRoundIds = new Set(filteredRounds?.map(r => r.id))
    const excludeSet = new Set(filters.competitors.excludeIds)
    const filteredVotes = votes.filter(v => filteredRoundIds.has(v.roundId))
    const filteredSubmissions = submissions.filter(s => filteredRoundIds.has(s.roundId))

    for (const competitor of competitors) {
      const performances = competitorPerformances.get(competitor.id) || []

      if (performances.length < filters.competitors.minParticipation) {
        continue
      }

      if (excludeSet.has(competitor.id)) {
        continue
      }

      const competitorSubmissionUris = new Set(
        filteredSubmissions.filter(s => s.submitterId === competitor.id).map(s => s.spotifyUri)
      )

      // BUSINESS RULE: Only count votes with positive points assigned
      // 0-point votes are excluded as they only exist due to having comments
      const votesForCompetitor = filteredVotes.filter(v =>
        competitorSubmissionUris.has(v.spotifyUri)
      )
      const votesReceived = filterPositiveVotes(votesForCompetitor).length

      // BUSINESS RULE: Only count positive votes for average calculation
      const competitorVotes = filteredVotes.filter(v => v.voterId === competitor.id)
      const positiveVotes = filterPositiveVotes(competitorVotes)
      const totalPointsGiven = positiveVotes.reduce((sum, vote) => sum + vote.pointsAssigned, 0)
      const avgVoteCast = positiveVotes.length > 0 ? totalPointsGiven / positiveVotes.length : 0

      const entry: Omit<LeaderboardEntry, 'rank'> = {
        competitorId: competitor.id,
        competitorName: competitor.name,
        totalPoints: calculateTotalPoints(performances),
        winRate: calculateWinRate(performances),
        podiumRate: calculatePodiumRate(performances),
        averagePosition: calculateAveragePosition(performances),
        consistencyScore: calculateConsistency(performances),
        roundsParticipated: performances.length,
        votesReceived,
        avgVoteCast,
        performances,
      }

      entries.push(entry)
    }

    return entries
  }, [competitors, competitorPerformances, filters.competitors, votes, submissions, filteredRounds])

  const rankings = useMemo((): LeaderboardEntry[] => {
    const metricGetters: Record<RankingMetric, (entry: Omit<LeaderboardEntry, 'rank'>) => number> =
      {
        [RankingMetric.TotalPoints]: e => e.totalPoints,
        [RankingMetric.WinRate]: e => e.winRate,
        [RankingMetric.PodiumRate]: e => e.podiumRate,
        [RankingMetric.AveragePosition]: e => e.averagePosition,
        [RankingMetric.Consistency]: e => e.consistencyScore,
      }

    const getter = metricGetters[filters.metric]

    // Lower is better for position and consistency
    const ascending =
      filters.metric === RankingMetric.AveragePosition ||
      filters.metric === RankingMetric.Consistency

    return assignRanks(unrankedEntries, getter, ascending) as LeaderboardEntry[]
  }, [unrankedEntries, filters.metric])

  const statistics = useMemo((): LeaderboardStatistics => {
    const filteredRoundIds = new Set(filteredRounds?.map(r => r.id))
    const filteredVotes = votes?.filter(v => filteredRoundIds.has(v.roundId)) || []

    let dateRange: { earliest: Date; latest: Date } | null = null
    if (filteredVotes.length > 0) {
      const voteDates = filteredVotes.map(v => v.createdAt.getTime())
      dateRange = {
        earliest: new Date(Math.min(...voteDates)),
        latest: new Date(Math.max(...voteDates)),
      }
    }

    return {
      totalRounds: filteredRounds?.length || 0,
      totalCompetitors: unrankedEntries.length,
      dateRange,
      totalVotes: filteredVotes.length,
    }
  }, [unrankedEntries, filteredRounds, votes])

  const error = useMemo(() => {
    const errors = [competitorsError, roundsError, votesError, submissionsError].filter(Boolean)
    return errors.length > 0 ? errors.join('; ') : null
  }, [competitorsError, roundsError, votesError, submissionsError])

  // No-op: Data refreshes automatically when activeProfileId changes in underlying hooks
  const refetch = useCallback(async () => {}, [])

  return {
    rankings,
    statistics,
    isLoading,
    error,
    refetch,
  }
}
