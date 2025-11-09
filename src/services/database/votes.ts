/**
 * Vote Database Service
 *
 * Query operations for Music League votes
 *
 * @module database/votes
 */

import { getDatabase, DatabaseError } from './db'
import type { Vote, ProfileId, CompetitorId, RoundId, SpotifyUri } from '@/types/musicLeague'

// ============================================================================
// Vote Operations
// ============================================================================

/**
 * Add a single vote
 *
 * @param vote - Vote to add
 * @throws DatabaseError if operation fails
 */
export async function addVote(vote: Vote): Promise<void> {
  try {
    const db = await getDatabase()
    await db.add('votes', vote)
  } catch (error) {
    throw new DatabaseError('Failed to add vote', error)
  }
}

/**
 * Add multiple votes in a single transaction (batch insert)
 *
 * @param votes - Array of votes to add
 * @throws DatabaseError if operation fails
 */
export async function addVotes(votes: readonly Vote[]): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction('votes', 'readwrite')
    const store = tx.objectStore('votes')

    await Promise.all(votes.map(vote => store.add(vote)))
    await tx.done
  } catch (error) {
    throw new DatabaseError('Failed to add votes', error)
  }
}

/**
 * Get a specific vote by profile, Spotify URI, and voter ID
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify track URI
 * @param voterId - Competitor ID who voted
 * @returns The vote or null if not found
 * @throws DatabaseError if retrieval fails
 */
export async function getVote(
  profileId: ProfileId,
  spotifyUri: SpotifyUri,
  voterId: CompetitorId
): Promise<Vote | null> {
  try {
    const db = await getDatabase()
    const vote = await db.get('votes', [profileId, spotifyUri, voterId])
    return vote ?? null
  } catch (error) {
    throw new DatabaseError('Failed to get vote', error)
  }
}

/**
 * Get all votes for a profile
 *
 * @param profileId - Profile ID
 * @returns Array of votes
 * @throws DatabaseError if retrieval fails
 */
export async function getVotesByProfile(profileId: ProfileId): Promise<Vote[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('votes', 'by-profileId', profileId)
  } catch (error) {
    throw new DatabaseError('Failed to get votes by profile', error)
  }
}

/**
 * Get all votes cast by a specific competitor
 *
 * @param profileId - Profile ID
 * @param voterId - Competitor ID who voted
 * @returns Array of votes
 * @throws DatabaseError if retrieval fails
 */
export async function getVotesByVoter(
  profileId: ProfileId,
  voterId: CompetitorId
): Promise<Vote[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('votes', 'by-voterId', [profileId, voterId])
  } catch (error) {
    throw new DatabaseError('Failed to get votes by voter', error)
  }
}

/**
 * Get all votes for a specific submission
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify track URI
 * @returns Array of votes
 * @throws DatabaseError if retrieval fails
 */
export async function getVotesForSubmission(
  profileId: ProfileId,
  spotifyUri: SpotifyUri
): Promise<Vote[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('votes', 'by-spotifyUri', [profileId, spotifyUri])
  } catch (error) {
    throw new DatabaseError('Failed to get votes for submission', error)
  }
}

/**
 * Get all votes for a specific round
 *
 * @param profileId - Profile ID
 * @param roundId - Round ID
 * @returns Array of votes
 * @throws DatabaseError if retrieval fails
 */
export async function getVotesByRound(profileId: ProfileId, roundId: RoundId): Promise<Vote[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('votes', 'by-roundId', [profileId, roundId])
  } catch (error) {
    throw new DatabaseError('Failed to get votes by round', error)
  }
}

/**
 * Get vote count for a profile
 *
 * @param profileId - Profile ID
 * @returns Total number of votes
 * @throws DatabaseError if count fails
 */
export async function getVoteCount(profileId: ProfileId): Promise<number> {
  try {
    const db = await getDatabase()
    const votes = await db.getAllFromIndex('votes', 'by-profileId', profileId)
    return votes.length
  } catch (error) {
    throw new DatabaseError('Failed to get vote count', error)
  }
}

/**
 * Get total points assigned by a voter
 *
 * @param profileId - Profile ID
 * @param voterId - Competitor ID who voted
 * @returns Total points assigned
 * @throws DatabaseError if calculation fails
 */
export async function getTotalPointsByVoter(
  profileId: ProfileId,
  voterId: CompetitorId
): Promise<number> {
  try {
    const votes = await getVotesByVoter(profileId, voterId)
    return votes.reduce((total, vote) => total + vote.pointsAssigned, 0)
  } catch (error) {
    throw new DatabaseError('Failed to get total points by voter', error)
  }
}

/**
 * Get total points received by a submission
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify track URI
 * @returns Total points received
 * @throws DatabaseError if calculation fails
 */
export async function getTotalPointsForSubmission(
  profileId: ProfileId,
  spotifyUri: SpotifyUri
): Promise<number> {
  try {
    const votes = await getVotesForSubmission(profileId, spotifyUri)
    return votes.reduce((total, vote) => total + vote.pointsAssigned, 0)
  } catch (error) {
    throw new DatabaseError('Failed to get total points for submission', error)
  }
}

/**
 * Get votes with comments (non-empty comment field)
 *
 * @param profileId - Profile ID
 * @returns Array of votes with comments
 * @throws DatabaseError if retrieval fails
 */
export async function getVotesWithComments(profileId: ProfileId): Promise<Vote[]> {
  try {
    const votes = await getVotesByProfile(profileId)
    return votes.filter(vote => vote.comment && vote.comment.trim() !== '')
  } catch (error) {
    throw new DatabaseError('Failed to get votes with comments', error)
  }
}

/**
 * Get votes within a date range
 *
 * @param profileId - Profile ID
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of votes within the date range
 * @throws DatabaseError if retrieval fails
 */
export async function getVotesByDateRange(
  profileId: ProfileId,
  startDate: Date,
  endDate: Date
): Promise<Vote[]> {
  try {
    const db = await getDatabase()

    // Use composite index for efficient querying
    const lowerBound = [profileId, startDate]
    const upperBound = [profileId, endDate]

    const votes = await db.getAllFromIndex(
      'votes',
      'by-profile-createdAt',
      IDBKeyRange.bound(lowerBound, upperBound)
    )

    return votes
  } catch (error) {
    throw new DatabaseError('Failed to get votes by date range', error)
  }
}

/**
 * Get average points for a submission
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify track URI
 * @returns Average points or 0 if no votes
 * @throws DatabaseError if calculation fails
 */
export async function getAveragePointsForSubmission(
  profileId: ProfileId,
  spotifyUri: SpotifyUri
): Promise<number> {
  try {
    const votes = await getVotesForSubmission(profileId, spotifyUri)
    if (votes.length === 0) return 0

    const total = votes.reduce((sum, vote) => sum + vote.pointsAssigned, 0)
    return total / votes.length
  } catch (error) {
    throw new DatabaseError('Failed to get average points for submission', error)
  }
}
