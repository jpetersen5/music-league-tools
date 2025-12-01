/**
 * Analytics Database Service
 *
 * Complex aggregations and analytics queries for Music League data
 *
 * @module database/analytics
 */

import { DatabaseError } from './db'
import { getVotesByVoter, getVotesForSubmission } from './votes'
import { getSubmissionsByCompetitor } from './submissions'
import type { ProfileId, CompetitorId, SpotifyUri, RoundId } from '@/types/musicLeague'

// ============================================================================
// Analytics Types
// ============================================================================

export interface CompetitorRelationship {
  fromCompetitorId: CompetitorId
  toCompetitorId: CompetitorId
  totalPoints: number
  voteCount: number
  averagePoints: number
}

export interface PolarizationMetrics {
  spotifyUri: SpotifyUri
  totalVotes: number
  totalPoints: number
  averagePoints: number
  standardDeviation: number
  polarizationScore: number // 0-1, higher = more polarizing
  highVoters: number // Count of votes above average
  lowVoters: number // Count of votes below average
  zeroVoters: number // Count of zero/downvotes
}

export interface CompetitorStats {
  competitorId: CompetitorId
  submissionCount: number
  totalPointsReceived: number
  totalPointsGiven: number
  averagePointsReceived: number
  averagePointsGiven: number
  commentCount: number
}

// ============================================================================
// Relationship Analytics
// ============================================================================

/**
 * Calculate the relationship between two competitors based on voting patterns
 * (how many points one competitor gave to another's submissions)
 *
 * @param profileId - Profile ID
 * @param fromCompetitorId - Competitor who cast votes
 * @param toCompetitorId - Competitor who received votes
 * @returns Relationship metrics or null if no interaction
 * @throws DatabaseError if calculation fails
 */
export async function getCompetitorRelationship(
  profileId: ProfileId,
  fromCompetitorId: CompetitorId,
  toCompetitorId: CompetitorId
): Promise<CompetitorRelationship | null> {
  try {
    // Get all votes by the first competitor
    const voterVotes = await getVotesByVoter(profileId, fromCompetitorId)

    // Get all submissions by the second competitor
    const submissions = await getSubmissionsByCompetitor(profileId, toCompetitorId)

    // Find votes from first competitor to second competitor's submissions
    const submissionUris = new Set(submissions.map(s => s.spotifyUri))
    const relevantVotes = voterVotes.filter(vote => submissionUris.has(vote.spotifyUri))

    if (relevantVotes.length === 0) {
      return null
    }

    const totalPoints = relevantVotes.reduce((sum, vote) => sum + vote.pointsAssigned, 0)

    return {
      fromCompetitorId,
      toCompetitorId,
      totalPoints,
      voteCount: relevantVotes.length,
      averagePoints: totalPoints / relevantVotes.length,
    }
  } catch (error) {
    throw new DatabaseError('Failed to calculate competitor relationship', error)
  }
}

/**
 * Find the "biggest fan" - competitor who gave the most total points
 * to a specific competitor's submissions
 *
 * @param profileId - Profile ID
 * @param competitorId - Competitor to analyze
 * @returns Biggest fan relationship or null if no votes
 * @throws DatabaseError if calculation fails
 */
export async function getBiggestFan(
  profileId: ProfileId,
  competitorId: CompetitorId
): Promise<CompetitorRelationship | null> {
  try {
    // Get all submissions by this competitor
    const submissions = await getSubmissionsByCompetitor(profileId, competitorId)

    if (submissions.length === 0) {
      return null
    }

    // Collect all votes for these submissions
    const votesByVoter = new Map<CompetitorId, number>()
    const voteCountByVoter = new Map<CompetitorId, number>()

    for (const submission of submissions) {
      const votes = await getVotesForSubmission(profileId, submission.spotifyUri)

      for (const vote of votes) {
        // Don't count self-votes
        if (vote.voterId === competitorId) continue

        const currentPoints = votesByVoter.get(vote.voterId) ?? 0
        const currentCount = voteCountByVoter.get(vote.voterId) ?? 0

        votesByVoter.set(vote.voterId, currentPoints + vote.pointsAssigned)
        voteCountByVoter.set(vote.voterId, currentCount + 1)
      }
    }

    if (votesByVoter.size === 0) {
      return null
    }

    // Find voter with highest total points
    let biggestFanId: CompetitorId | null = null
    let maxPoints = -Infinity

    for (const [voterId, points] of votesByVoter.entries()) {
      if (points > maxPoints) {
        maxPoints = points
        biggestFanId = voterId
      }
    }

    if (!biggestFanId) {
      return null
    }

    const voteCount = voteCountByVoter.get(biggestFanId)!

    return {
      fromCompetitorId: biggestFanId,
      toCompetitorId: competitorId,
      totalPoints: maxPoints,
      voteCount,
      averagePoints: maxPoints / voteCount,
    }
  } catch (error) {
    throw new DatabaseError('Failed to find biggest fan', error)
  }
}

/**
 * Find the "biggest hater" - competitor who gave the least total points
 * to a specific competitor's submissions
 *
 * @param profileId - Profile ID
 * @param competitorId - Competitor to analyze
 * @returns Biggest hater relationship or null if no votes
 * @throws DatabaseError if calculation fails
 */
export async function getBiggestHater(
  profileId: ProfileId,
  competitorId: CompetitorId
): Promise<CompetitorRelationship | null> {
  try {
    // Get all submissions by this competitor
    const submissions = await getSubmissionsByCompetitor(profileId, competitorId)

    if (submissions.length === 0) {
      return null
    }

    // Collect all votes for these submissions
    const votesByVoter = new Map<CompetitorId, number>()
    const voteCountByVoter = new Map<CompetitorId, number>()

    for (const submission of submissions) {
      const votes = await getVotesForSubmission(profileId, submission.spotifyUri)

      for (const vote of votes) {
        // Don't count self-votes
        if (vote.voterId === competitorId) continue

        const currentPoints = votesByVoter.get(vote.voterId) ?? 0
        const currentCount = voteCountByVoter.get(vote.voterId) ?? 0

        votesByVoter.set(vote.voterId, currentPoints + vote.pointsAssigned)
        voteCountByVoter.set(vote.voterId, currentCount + 1)
      }
    }

    if (votesByVoter.size === 0) {
      return null
    }

    // Find voter with lowest total points
    let biggestHaterId: CompetitorId | null = null
    let minPoints = Infinity

    for (const [voterId, points] of votesByVoter.entries()) {
      if (points < minPoints) {
        minPoints = points
        biggestHaterId = voterId
      }
    }

    if (!biggestHaterId) {
      return null
    }

    const voteCount = voteCountByVoter.get(biggestHaterId)!

    return {
      fromCompetitorId: biggestHaterId,
      toCompetitorId: competitorId,
      totalPoints: minPoints,
      voteCount,
      averagePoints: minPoints / voteCount,
    }
  } catch (error) {
    throw new DatabaseError('Failed to find biggest hater', error)
  }
}

// ============================================================================
// Polarization Analytics
// ============================================================================

/**
 * Calculate polarization metrics for a submission
 * High polarization = some loved it, some hated it
 * Low polarization = everyone gave similar scores
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify track URI
 * @returns Polarization metrics or null if insufficient votes
 * @throws DatabaseError if calculation fails
 */
export async function getSubmissionPolarization(
  profileId: ProfileId,
  spotifyUri: SpotifyUri
): Promise<PolarizationMetrics | null> {
  try {
    const votes = await getVotesForSubmission(profileId, spotifyUri)

    if (votes.length < 2) {
      // Need at least 2 votes for meaningful polarization
      return null
    }

    const points = votes.map(v => v.pointsAssigned)
    const totalPoints = points.reduce((sum, p) => sum + p, 0)
    const averagePoints = totalPoints / points.length

    // Calculate standard deviation
    const squaredDiffs = points.map(p => Math.pow(p - averagePoints, 2))
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / points.length
    const standardDeviation = Math.sqrt(variance)

    // Polarization score: normalized standard deviation (0-1)
    // Higher values = more polarizing
    const maxPossibleStdDev = Math.max(...points) - Math.min(...points)
    const polarizationScore = maxPossibleStdDev > 0 ? standardDeviation / maxPossibleStdDev : 0

    // Count distribution
    const highVoters = points.filter(p => p > averagePoints).length
    const lowVoters = points.filter(p => p < averagePoints && p > 0).length
    const zeroVoters = points.filter(p => p === 0).length

    return {
      spotifyUri,
      totalVotes: votes.length,
      totalPoints,
      averagePoints,
      standardDeviation,
      polarizationScore,
      highVoters,
      lowVoters,
      zeroVoters,
    }
  } catch (error) {
    throw new DatabaseError('Failed to calculate submission polarization', error)
  }
}

// ============================================================================
// Competitor Statistics
// ============================================================================

/**
 * Get comprehensive statistics for a competitor
 *
 * @param profileId - Profile ID
 * @param competitorId - Competitor ID
 * @returns Competitor statistics
 * @throws DatabaseError if calculation fails
 */
export async function getCompetitorStatistics(
  profileId: ProfileId,
  competitorId: CompetitorId
): Promise<CompetitorStats> {
  try {
    // Get submissions by this competitor
    const submissions = await getSubmissionsByCompetitor(profileId, competitorId)

    // Get votes cast by this competitor
    const votesCast = await getVotesByVoter(profileId, competitorId)

    // Calculate points received on their submissions
    let totalPointsReceived = 0
    let commentCount = 0

    for (const submission of submissions) {
      const votes = await getVotesForSubmission(profileId, submission.spotifyUri)
      totalPointsReceived += votes.reduce((sum, vote) => sum + vote.pointsAssigned, 0)

      if (submission.comment && submission.comment.trim() !== '') {
        commentCount++
      }
    }

    // Calculate points given
    const totalPointsGiven = votesCast.reduce((sum, vote) => sum + vote.pointsAssigned, 0)

    return {
      competitorId,
      submissionCount: submissions.length,
      totalPointsReceived,
      totalPointsGiven,
      averagePointsReceived: submissions.length > 0 ? totalPointsReceived / submissions.length : 0,
      averagePointsGiven: votesCast.length > 0 ? totalPointsGiven / votesCast.length : 0,
      commentCount,
    }
  } catch (error) {
    throw new DatabaseError('Failed to get competitor statistics', error)
  }
}

// ============================================================================
// League Statistics
// ============================================================================

export interface LeagueStatistics {
  totalRounds: number
  totalCompetitors: number
  totalSubmissions: number
  totalVotes: number
  totalComments: number
  totalDownvotes: number
  uniqueWinners: number
  uniqueArtists: number
  startDate: Date | null
  endDate: Date | null
  lengthInDays: number
  avgParticipation: number // % of competitors submitting per round
  avgPointSpread: number // Avg difference between 1st and last place
  commentRate: number // % of votes with comments
  sentiment: {
    average: number
    positivePercent: number
    neutralPercent: number
    negativePercent: number
    polarization: number
  }
}

/**
 * Get aggregated statistics for a league (profile)
 *
 * @param profileId - Profile ID
 * @returns League statistics
 */
export async function getLeagueStatistics(profileId: ProfileId): Promise<LeagueStatistics> {
  try {
    const [rounds, competitors, submissions, votes] = await Promise.all([
      import('./rounds').then(m => m.getRoundsByProfile(profileId)),
      import('./competitors').then(m => m.getCompetitorsByProfile(profileId)),
      import('./submissions').then(m => m.getSubmissionsByProfile(profileId)),
      import('./votes').then(m => m.getVotesByProfile(profileId)),
    ])

    // Basic counts
    const totalRounds = rounds.length
    const totalCompetitors = competitors.length
    const totalSubmissions = submissions.length
    const totalVotes = votes.length
    const totalComments = votes.filter(v => v.comment && v.comment.trim().length > 0).length
    const totalDownvotes = votes.filter(v => v.pointsAssigned < 0).length

    // Dates
    const dates = [
      ...rounds.map(r => r.createdAt),
      ...submissions.map(s => s.createdAt),
      ...votes.map(v => v.createdAt),
    ].sort((a, b) => a.getTime() - b.getTime())

    const startDate = dates.length > 0 ? dates[0] : null
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null
    const lengthInDays =
      startDate && endDate
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    // Unique Winners
    const roundWinners = new Set<CompetitorId>()
    const roundSpreads: number[] = []
    const roundParticipation: number[] = []

    for (const round of rounds) {
      const roundSubmissions = submissions.filter(s => s.roundId === round.id)
      const roundVotes = votes.filter(v => v.roundId === round.id)

      if (roundSubmissions.length === 0) continue

      // Participation
      roundParticipation.push(roundSubmissions.length / (totalCompetitors || 1))

      // Calculate points for this round
      const submissionPoints = new Map<SpotifyUri, number>()
      const submitterMap = new Map<SpotifyUri, CompetitorId>()

      roundSubmissions.forEach(s => {
        submissionPoints.set(s.spotifyUri, 0)
        submitterMap.set(s.spotifyUri, s.submitterId)
      })

      roundVotes.forEach(v => {
        const current = submissionPoints.get(v.spotifyUri) || 0
        submissionPoints.set(v.spotifyUri, current + v.pointsAssigned)
      })

      // Find winner and spread
      const points = Array.from(submissionPoints.values()).sort((a, b) => b - a)
      if (points.length > 0) {
        const maxPoints = points[0]!
        const minPoints = points[points.length - 1]!
        roundSpreads.push(maxPoints - minPoints)

        // Find submitter of winning song
        for (const [uri, p] of submissionPoints.entries()) {
          if (p === maxPoints) {
            const submitter = submitterMap.get(uri)
            if (submitter) roundWinners.add(submitter)
          }
        }
      }
    }

    // Unique Artists
    const uniqueArtists = new Set(submissions.flatMap(s => s.artists)).size

    return {
      totalRounds,
      totalCompetitors,
      totalSubmissions,
      totalVotes,
      totalComments,
      totalDownvotes,
      uniqueWinners: roundWinners.size,
      uniqueArtists,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      lengthInDays,
      avgParticipation:
        roundParticipation.length > 0
          ? roundParticipation.reduce((a, b) => a + b, 0) / roundParticipation.length
          : 0,
      avgPointSpread:
        roundSpreads.length > 0 ? roundSpreads.reduce((a, b) => a + b, 0) / roundSpreads.length : 0,
      commentRate: totalVotes > 0 ? totalComments / totalVotes : 0,
      sentiment: {
        average: 0,
        positivePercent: 0,
        neutralPercent: 0,
        negativePercent: 0,
        polarization: 0,
      },
    }
  } catch (error) {
    throw new DatabaseError('Failed to get league statistics', error)
  }
}

// ============================================================================
// Round Statistics
// ============================================================================

export interface RoundStatistics {
  roundId: RoundId
  competitorCount: number
  submissionCount: number
  voteCount: number
  commentCount: number
  startDate: Date | null
  endDate: Date | null
  winningSubmission: {
    title: string
    artist: string
    submitterId: CompetitorId
    points: number
  } | null
  maxPoints: number
  minPoints: number
  avgSentiment: number
  sentiment: {
    positive: number
    neutral: number
    negative: number
    polarization: number
  }
}

/**
 * Get aggregated statistics for a specific round
 *
 * @param profileId - Profile ID
 * @param roundId - Round ID
 * @returns Round statistics
 */
export async function getRoundStatistics(
  profileId: ProfileId,
  roundId: RoundId
): Promise<RoundStatistics> {
  try {
    const [submissions, votes] = await Promise.all([
      import('./submissions').then(m => m.getSubmissionsByRound(profileId, roundId)),
      import('./votes').then(m => m.getVotesByRound(profileId, roundId)),
    ])

    // Competitors who submitted
    const competitors = new Set(submissions.map(s => s.submitterId)).size

    // Dates
    const dates = [...submissions.map(s => s.createdAt), ...votes.map(v => v.createdAt)].sort(
      (a, b) => a.getTime() - b.getTime()
    )

    const startDate = dates.length > 0 ? dates[0] : null
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null

    // Points calculation
    const submissionPoints = new Map<SpotifyUri, number>()
    const submissionMap = new Map<SpotifyUri, (typeof submissions)[0]>()

    submissions.forEach(s => {
      submissionPoints.set(s.spotifyUri, 0)
      submissionMap.set(s.spotifyUri, s)
    })

    votes.forEach(v => {
      const current = submissionPoints.get(v.spotifyUri) || 0
      submissionPoints.set(v.spotifyUri, current + v.pointsAssigned)
    })

    // Find winner and stats
    let winningSubmission: RoundStatistics['winningSubmission'] = null
    let maxPoints = -Infinity
    let minPoints = Infinity

    if (submissionPoints.size > 0) {
      const points = Array.from(submissionPoints.values())
      maxPoints = Math.max(...points)
      minPoints = Math.min(...points)

      for (const [uri, p] of submissionPoints.entries()) {
        if (p === maxPoints) {
          const s = submissionMap.get(uri)!
          winningSubmission = {
            title: s.title,
            artist: s.artists[0] || 'Unknown',
            submitterId: s.submitterId,
            points: p,
          }
          break // Take first winner if tie
        }
      }
    } else {
      maxPoints = 0
      minPoints = 0
    }

    // Comments and Sentiment
    const comments = votes
      .filter(v => v.comment && v.comment.trim().length > 0)
      .map(v => ({ text: v.comment, sentiment: v.sentimentScore }))

    const commentCount = comments.length

    // Calculate sentiment stats
    let avgSentiment = 0
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
      polarization: 0,
    }

    if (commentCount > 0) {
      const scores = comments.map(c => c.sentiment || 0)
      const totalScore = scores.reduce((sum, s) => sum + s, 0)
      avgSentiment = totalScore / commentCount

      sentimentCounts.positive = scores.filter(s => s > 0.05).length
      sentimentCounts.neutral = scores.filter(s => s >= -0.05 && s <= 0.05).length
      sentimentCounts.negative = scores.filter(s => s < -0.05).length

      // Calculate polarization (std dev)
      if (commentCount > 1) {
        const variance =
          scores.reduce((sum, s) => sum + Math.pow(s - avgSentiment, 2), 0) / commentCount
        sentimentCounts.polarization = Math.sqrt(variance)
      }
    }

    return {
      roundId,
      competitorCount: competitors,
      submissionCount: submissions.length,
      voteCount: votes.length,
      commentCount,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      winningSubmission,
      maxPoints,
      minPoints,
      avgSentiment,
      sentiment: sentimentCounts,
    }
  } catch (error) {
    throw new DatabaseError('Failed to get round statistics', error)
  }
}

// ============================================================================
// Submission Statistics
// ============================================================================

export interface SubmissionStatistics {
  spotifyUri: SpotifyUri
  totalPoints: number
  positivePoints: number
  negativePoints: number
  uniqueVoters: number
  commentCount: number
  sentiment: {
    average: number
    polarization: number
  }
}

/**
 * Get aggregated statistics for a specific submission
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify URI
 * @returns Submission statistics
 */
export async function getSubmissionStatistics(
  profileId: ProfileId,
  spotifyUri: SpotifyUri
): Promise<SubmissionStatistics> {
  try {
    const votes = await import('./votes').then(m => m.getVotesForSubmission(profileId, spotifyUri))

    // Points
    const totalPoints = votes.reduce((sum, v) => sum + v.pointsAssigned, 0)
    const positivePoints = votes
      .filter(v => v.pointsAssigned > 0)
      .reduce((sum, v) => sum + v.pointsAssigned, 0)
    const negativePoints = votes
      .filter(v => v.pointsAssigned < 0)
      .reduce((sum, v) => sum + v.pointsAssigned, 0)

    // Voters
    const uniqueVoters = new Set(votes.filter(v => v.pointsAssigned !== 0).map(v => v.voterId)).size

    // Comments
    const commentCount = votes.filter(v => v.comment && v.comment.trim().length > 0).length

    // Sentiment
    let avgSentiment = 0
    let polarizationScore = 0

    const comments = votes
      .filter(v => v.comment && v.comment.trim().length > 0)
      .map(v => ({ text: v.comment, sentiment: v.sentimentScore }))

    if (comments.length > 0) {
      const scores = comments.map(c => c.sentiment || 0)
      avgSentiment = scores.reduce((sum, s) => sum + s, 0) / comments.length
    }

    // Polarization
    const polarization = await getSubmissionPolarization(profileId, spotifyUri)
    polarizationScore = polarization?.polarizationScore ?? 0

    return {
      spotifyUri,
      totalPoints,
      positivePoints,
      negativePoints,
      uniqueVoters,
      commentCount,
      sentiment: {
        average: avgSentiment,
        polarization: polarizationScore,
      },
    }
  } catch (error) {
    throw new DatabaseError('Failed to get submission statistics', error)
  }
}
