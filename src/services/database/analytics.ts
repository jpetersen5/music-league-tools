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
import type { ProfileId, CompetitorId, RoundId } from '@/types/musicLeague'

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

      if (roundSubmissions.length === 0) continue

      // Participation
      roundParticipation.push(roundSubmissions.length / (totalCompetitors || 1))

      // Calculate points for this round
      if (roundSubmissions.length > 0) {
        // Use pre-calculated totalPoints
        const scores = roundSubmissions.map(s => s.totalPoints || 0)
        const maxPoints = Math.max(...scores)
        const minPoints = Math.min(...scores)

        roundSpreads.push(maxPoints - minPoints)

        // Find submitters of winning songs
        roundSubmissions.forEach(s => {
          if ((s.totalPoints || 0) === maxPoints) {
            roundWinners.add(s.submitterId)
          }
        })
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

    // Find winner and stats
    let winningSubmission: RoundStatistics['winningSubmission'] = null
    let maxPoints = -Infinity
    let minPoints = Infinity

    if (submissions.length > 0) {
      // Use pre-calculated totalPoints
      const scores = submissions.map(s => s.totalPoints || 0)
      maxPoints = Math.max(...scores)
      minPoints = Math.min(...scores)

      // Find winner
      const winners = submissions.filter(s => (s.totalPoints || 0) === maxPoints)
      if (winners.length > 0) {
        const winner = winners[0]
        winningSubmission = {
          title: winner!.title,
          artist: winner!.artists[0] || 'Unknown',
          submitterId: winner!.submitterId,
          points: maxPoints,
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
