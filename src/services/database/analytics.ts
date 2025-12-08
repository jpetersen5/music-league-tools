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
import type { ProfileId, CompetitorId } from '@/types/musicLeague'

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
