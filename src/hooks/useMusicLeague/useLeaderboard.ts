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
  calculateStandardDeviation,
  calculateTotalPoints,
  calculateWinRate,
  calculatePodiumRate,
  calculateAveragePosition,
  calculateConsistency,
  assignRanks,
  calculateUniqueWinners,
  calculateAvgPointsSpread,
  analyzeSentiment,
  calculateCommentStats,
  findClosestRound,
  calculateUniqueArtists,
  findMostPositiveSong,
  findMostNegativeSong,
  findHighestScoredSong,
  findLowestScoredSong,
  findMostUniqueVotersSong,
  findMostSubmittedArtist,
  findMostPositiveCommenter,
  findMostNegativeCommenter,
  findMostLovedSubmitter,
  findMostHatedSubmitter,
  isPositiveVote,
  calculateSubmissionPoints,
} from '@/utils/musicLeague/leaderboard/calculations'

function calculateRoundPoints(
  roundVotes: Vote[],
  roundSubmissions: Submission[]
): Map<CompetitorId, number> {
  const votersInRound = new Set<CompetitorId>()
  for (const vote of roundVotes) {
    votersInRound.add(vote.voterId)
  }

  const submissionPoints = new Map<CompetitorId, number>()

  for (const submission of roundSubmissions) {
    const points = calculateSubmissionPoints(roundVotes, submission, votersInRound)
    if (points !== 0) {
      const current = submissionPoints.get(submission.submitterId) || 0
      submissionPoints.set(submission.submitterId, current + points)
    }
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
      const votesReceived = votesForCompetitor.filter(isPositiveVote).length

      // BUSINESS RULE: Only count positive votes for average calculation
      const competitorVotes = filteredVotes.filter(v => v.voterId === competitor.id)
      const positiveVotes = competitorVotes.filter(isPositiveVote)
      const totalPointsGiven = positiveVotes.reduce((sum, vote) => sum + vote.pointsAssigned, 0)
      const avgVoteCast = positiveVotes.length > 0 ? totalPointsGiven / positiveVotes.length : 0

      // New Metrics Calculation
      const votesCast = filteredVotes.filter(v => v.voterId === competitor.id)
      const nonZeroVotesCast = votesCast.filter(v => v.pointsAssigned !== 0)
      const avgNonZeroVote =
        nonZeroVotesCast.length > 0
          ? nonZeroVotesCast.reduce((sum, v) => sum + v.pointsAssigned, 0) / nonZeroVotesCast.length
          : 0

      const firstPlaceCount = performances.filter((p: RoundPerformance) => p.position === 1).length
      const podiumCount = performances.filter((p: RoundPerformance) => p.position <= 3).length

      const commentsGiven = votesCast.filter(v => v.comment && v.comment.trim().length > 0).length
      const commentsReceived = votesForCompetitor.filter(
        v => v.comment && v.comment.trim().length > 0
      ).length
      const downvotesEarned = votesForCompetitor.filter(v => v.pointsAssigned < 0).length
      const positivePoints = votesForCompetitor
        .filter(isPositiveVote)
        .reduce((sum, v) => sum + v.pointsAssigned, 0)
      const negativePoints = votesForCompetitor
        .filter(v => v.pointsAssigned < 0)
        .reduce((sum, v) => sum + v.pointsAssigned, 0)

      // Sentiment Given
      const sentimentGivenVotes = votesCast.filter(
        v => v.sentimentScore !== undefined && v.sentimentScore !== null
      )
      const sentimentGivenAvg =
        sentimentGivenVotes.length > 0
          ? sentimentGivenVotes.reduce((sum, v) => sum + v.sentimentScore!, 0) /
            sentimentGivenVotes.length
          : 0
      // Polarization Given (std dev of sentiment scores)
      const sentimentGivenScores = sentimentGivenVotes.map(v => v.sentimentScore!)
      const sentimentGivenPolarization = calculateStandardDeviation(sentimentGivenScores)

      // Sentiment Received
      const sentimentReceivedVotes = votesForCompetitor.filter(
        v => v.sentimentScore !== undefined && v.sentimentScore !== null
      )
      const sentimentReceivedAvg =
        sentimentReceivedVotes.length > 0
          ? sentimentReceivedVotes.reduce((sum, v) => sum + v.sentimentScore!, 0) /
            sentimentReceivedVotes.length
          : 0
      // Polarization Received
      const sentimentReceivedScores = sentimentReceivedVotes.map(v => v.sentimentScore!)
      const sentimentReceivedPolarization = calculateStandardDeviation(sentimentReceivedScores)

      // Max/Min Points
      const pointsReceived = performances.map((p: RoundPerformance) => p.pointsReceived)
      const maxPoints = pointsReceived.length > 0 ? Math.max(...pointsReceived) : 0
      const minPoints = pointsReceived.length > 0 ? Math.min(...pointsReceived) : 0

      const entry: Omit<LeaderboardEntry, 'rank'> = {
        competitorId: competitor.id,
        competitorName: competitor.name,
        totalPoints: calculateTotalPoints(performances),
        positivePoints,
        negativePoints,
        winRate: calculateWinRate(performances),
        podiumRate: calculatePodiumRate(performances),
        averagePosition: calculateAveragePosition(performances),
        consistencyScore: calculateConsistency(performances),
        roundsParticipated: performances.length,
        votesReceived,
        avgVoteCast,
        avgNonZeroVote,
        firstPlaceCount,
        podiumCount,
        votesCast: votesCast.length,
        commentsGiven,
        commentsReceived,
        downvotesEarned,
        sentimentGiven: { average: sentimentGivenAvg, polarization: sentimentGivenPolarization },
        sentimentReceived: {
          average: sentimentReceivedAvg,
          polarization: sentimentReceivedPolarization,
        },
        maxPoints,
        minPoints,
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
    const filteredSubmissions = submissions?.filter(s => filteredRoundIds.has(s.roundId)) || []

    // Date range calculation
    let dateRange: { earliest: Date; latest: Date } | null = null
    if (filteredVotes.length > 0) {
      const voteDates = filteredVotes.map(v => v.createdAt.getTime())
      const earliest = voteDates.reduce(
        (min, date) => (date < min ? date : min),
        voteDates[0] ?? Date.now()
      )
      const latest = voteDates.reduce(
        (max, date) => (date > max ? date : max),
        voteDates[0] ?? Date.now()
      )
      dateRange = {
        earliest: new Date(earliest),
        latest: new Date(latest),
      }
    }

    // Create performancesByRound Map for competition intensity calculations
    const performancesByRound = new Map<RoundId, RoundPerformance[]>()
    for (const entry of unrankedEntries) {
      for (const perf of entry.performances) {
        const existing = performancesByRound.get(perf.roundId) || []
        existing.push(perf)
        performancesByRound.set(perf.roundId, existing)
      }
    }

    // Create lookup maps for competitors and rounds
    const competitorMap = new Map(competitors?.map(c => [c.id, c]) || [])
    const roundMap = new Map(filteredRounds?.map(r => [r.id, { name: r.name }]) || [])

    // Competition Intensity
    const uniqueWinners = calculateUniqueWinners(unrankedEntries)
    const closestRound = findClosestRound(performancesByRound)
    const avgPointsSpread = calculateAvgPointsSpread(performancesByRound)

    // Engagement - Comment and sentiment stats
    const { totalComments, totalDownvotes, commentRate } = calculateCommentStats(filteredVotes)
    const { avgSentiment, avgLabel, breakdown } = analyzeSentiment(filteredVotes)

    // Unique artists
    const uniqueArtists = calculateUniqueArtists(filteredSubmissions)

    // "Most Y X" Metrics
    const mostPositiveSong = findMostPositiveSong(
      filteredVotes,
      filteredSubmissions,
      competitorMap,
      roundMap
    )
    const mostNegativeSong = findMostNegativeSong(
      filteredVotes,
      filteredSubmissions,
      competitorMap,
      roundMap
    )
    const highestScoredSong = findHighestScoredSong(
      filteredVotes,
      filteredSubmissions,
      competitorMap,
      roundMap
    )
    const lowestScoredSong = findLowestScoredSong(
      filteredVotes,
      filteredSubmissions,
      competitorMap,
      roundMap
    )
    const mostUniqueVotersSong = findMostUniqueVotersSong(
      filteredVotes,
      filteredSubmissions,
      competitorMap,
      roundMap
    )
    const mostSubmittedArtist = findMostSubmittedArtist(filteredSubmissions)
    const mostPositiveCommenter = findMostPositiveCommenter(filteredVotes, competitorMap)
    const mostNegativeCommenter = findMostNegativeCommenter(filteredVotes, competitorMap)
    const mostLovedSubmitter = findMostLovedSubmitter(
      filteredVotes,
      filteredSubmissions,
      competitorMap
    )
    const mostHatedSubmitter = findMostHatedSubmitter(
      filteredVotes,
      filteredSubmissions,
      competitorMap
    )

    // Submission Stats - Total unique tracks
    const uniqueSpotifyUris = new Set(filteredSubmissions.map(s => s.spotifyUri))
    const totalTracks = uniqueSpotifyUris.size

    // Polarization calculation
    let avgPolarization = 0
    let mostPolarizingTrack: { title: string; artists: string; score: number } | null = null

    if (filteredSubmissions.length > 0) {
      const submissionPolarization = new Map<string, { score: number; submission: Submission }>()

      // Group votes by submission
      const votesByUri = new Map<string, number[]>()
      for (const vote of filteredVotes) {
        if (!vote.spotifyUri) continue
        const existing = votesByUri.get(vote.spotifyUri) || []
        existing.push(vote.pointsAssigned)
        votesByUri.set(vote.spotifyUri, existing)
      }

      // Calculate polarization score (standard deviation) for each submission
      for (const submission of filteredSubmissions) {
        const votePoints = votesByUri.get(submission.spotifyUri)
        if (!votePoints) continue

        const stddev = calculateStandardDeviation(votePoints)
        if (stddev > 0) {
          submissionPolarization.set(submission.spotifyUri, {
            score: stddev,
            submission,
          })
        }
      }

      // Calculate average polarization
      if (submissionPolarization.size > 0) {
        const totalPolarization = Array.from(submissionPolarization.values()).reduce(
          (sum, item) => sum + item.score,
          0
        )
        avgPolarization = totalPolarization / submissionPolarization.size

        // Find most polarizing track
        const mostPolarizing = Array.from(submissionPolarization.values()).reduce((max, item) =>
          item.score > max.score ? item : max
        )
        mostPolarizingTrack = {
          title: mostPolarizing.submission.title,
          artists: mostPolarizing.submission.artists.join(', '),
          score: mostPolarizing.score,
        }
      }
    }

    // Average competitors per round
    let avgCompetitorsPerRound = 0
    if (performancesByRound.size > 0) {
      const totalCompetitors = Array.from(performancesByRound.values()).reduce(
        (sum, perfs) => sum + perfs.length,
        0
      )
      avgCompetitorsPerRound = totalCompetitors / performancesByRound.size
    }

    return {
      // Primary Metrics
      totalRounds: filteredRounds?.length || 0,
      totalCompetitors: unrankedEntries.length,
      dateRange,
      totalVotes: filteredVotes.length,
      // Secondary Metrics
      uniqueWinners,
      closestRound,
      avgPointsSpread,
      uniqueArtists,
      totalComments,
      avgCommentSentiment: avgSentiment,
      avgCommentSentimentLabel: avgLabel,
      totalDownvotes,
      avgCompetitorsPerRound,
      totalTracks,
      avgPolarization,
      mostPolarizingTrack,
      commentRate,
      sentimentBreakdown: breakdown,
      // "Most Y X" Metrics
      mostPositiveSong,
      mostNegativeSong,
      highestScoredSong,
      lowestScoredSong,
      mostUniqueVotersSong,
      mostSubmittedArtist,
      mostPositiveCommenter,
      mostNegativeCommenter,
      mostLovedSubmitter,
      mostHatedSubmitter,
    }
  }, [unrankedEntries, filteredRounds, votes, submissions, competitors])

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
