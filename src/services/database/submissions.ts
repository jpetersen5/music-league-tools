/**
 * Submission Database Service
 *
 * Query operations for Music League submissions
 *
 * @module database/submissions
 */

import { getDatabase, DatabaseError } from './db'
import type { Submission, ProfileId, CompetitorId, RoundId, SpotifyUri } from '@/types/musicLeague'

// ============================================================================
// Submission Operations
// ============================================================================

/**
 * Add a single submission
 *
 * @param submission - Submission to add
 * @throws DatabaseError if operation fails
 */
export async function addSubmission(submission: Submission): Promise<void> {
  try {
    const db = await getDatabase()
    await db.add('submissions', submission)
  } catch (error) {
    throw new DatabaseError('Failed to add submission', error)
  }
}

/**
 * Add multiple submissions in a single transaction (batch insert)
 *
 * @param submissions - Array of submissions to add
 * @throws DatabaseError if operation fails
 */
export async function addSubmissions(submissions: readonly Submission[]): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction('submissions', 'readwrite')
    const store = tx.objectStore('submissions')

    await Promise.all(submissions.map(submission => store.add(submission)))
    await tx.done
  } catch (error) {
    throw new DatabaseError('Failed to add submissions', error)
  }
}

/**
 * Get a specific submission by profile and Spotify URI
 *
 * @param profileId - Profile ID
 * @param spotifyUri - Spotify track URI
 * @returns The submission or null if not found
 * @throws DatabaseError if retrieval fails
 */
export async function getSubmission(
  profileId: ProfileId,
  spotifyUri: SpotifyUri
): Promise<Submission | null> {
  try {
    const db = await getDatabase()
    const submission = await db.get('submissions', [profileId, spotifyUri])
    return submission ?? null
  } catch (error) {
    throw new DatabaseError('Failed to get submission', error)
  }
}

/**
 * Get all submissions for a profile
 *
 * @param profileId - Profile ID
 * @returns Array of submissions
 * @throws DatabaseError if retrieval fails
 */
export async function getSubmissionsByProfile(profileId: ProfileId): Promise<Submission[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('submissions', 'by-profileId', profileId)
  } catch (error) {
    throw new DatabaseError('Failed to get submissions by profile', error)
  }
}

/**
 * Get all submissions by a specific competitor
 *
 * @param profileId - Profile ID
 * @param submitterId - Competitor ID who submitted
 * @returns Array of submissions
 * @throws DatabaseError if retrieval fails
 */
export async function getSubmissionsByCompetitor(
  profileId: ProfileId,
  submitterId: CompetitorId
): Promise<Submission[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('submissions', 'by-submitterId', [profileId, submitterId])
  } catch (error) {
    throw new DatabaseError('Failed to get submissions by competitor', error)
  }
}

/**
 * Get all submissions for a specific round
 *
 * @param profileId - Profile ID
 * @param roundId - Round ID
 * @returns Array of submissions
 * @throws DatabaseError if retrieval fails
 */
export async function getSubmissionsByRound(
  profileId: ProfileId,
  roundId: RoundId
): Promise<Submission[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('submissions', 'by-roundId', [profileId, roundId])
  } catch (error) {
    throw new DatabaseError('Failed to get submissions by round', error)
  }
}

/**
 * Get submission count for a profile
 *
 * @param profileId - Profile ID
 * @returns Total number of submissions
 * @throws DatabaseError if count fails
 */
export async function getSubmissionCount(profileId: ProfileId): Promise<number> {
  try {
    const db = await getDatabase()
    const submissions = await db.getAllFromIndex('submissions', 'by-profileId', profileId)
    return submissions.length
  } catch (error) {
    throw new DatabaseError('Failed to get submission count', error)
  }
}

/**
 * Search submissions by title, album, or artist (case-insensitive)
 *
 * @param profileId - Profile ID
 * @param query - Search query
 * @returns Array of matching submissions
 * @throws DatabaseError if search fails
 */
export async function searchSubmissions(
  profileId: ProfileId,
  query: string
): Promise<Submission[]> {
  try {
    const submissions = await getSubmissionsByProfile(profileId)
    const lowerQuery = query.toLowerCase()

    return submissions.filter(submission => {
      const titleMatch = submission.title.toLowerCase().includes(lowerQuery)
      const albumMatch = submission.album.toLowerCase().includes(lowerQuery)
      const artistMatch = submission.artists.some(artist =>
        artist.toLowerCase().includes(lowerQuery)
      )

      return titleMatch || albumMatch || artistMatch
    })
  } catch (error) {
    throw new DatabaseError('Failed to search submissions', error)
  }
}

/**
 * Get submissions within a date range
 *
 * @param profileId - Profile ID
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of submissions within the date range
 * @throws DatabaseError if retrieval fails
 */
export async function getSubmissionsByDateRange(
  profileId: ProfileId,
  startDate: Date,
  endDate: Date
): Promise<Submission[]> {
  try {
    const db = await getDatabase()

    // Use composite index for efficient querying
    const lowerBound = [profileId, startDate]
    const upperBound = [profileId, endDate]

    const submissions = await db.getAllFromIndex(
      'submissions',
      'by-profile-createdAt',
      IDBKeyRange.bound(lowerBound, upperBound)
    )

    return submissions
  } catch (error) {
    throw new DatabaseError('Failed to get submissions by date range', error)
  }
}

/**
 * Get submissions with comments (non-empty comment field)
 *
 * @param profileId - Profile ID
 * @returns Array of submissions with comments
 * @throws DatabaseError if retrieval fails
 */
export async function getSubmissionsWithComments(profileId: ProfileId): Promise<Submission[]> {
  try {
    const submissions = await getSubmissionsByProfile(profileId)
    return submissions.filter(submission => submission.comment && submission.comment.trim() !== '')
  } catch (error) {
    throw new DatabaseError('Failed to get submissions with comments', error)
  }
}

/**
 * Get count of submissions by a competitor
 *
 * @param profileId - Profile ID
 * @param submitterId - Competitor ID
 * @returns Number of submissions
 * @throws DatabaseError if count fails
 */
export async function getCompetitorSubmissionCount(
  profileId: ProfileId,
  submitterId: CompetitorId
): Promise<number> {
  try {
    const submissions = await getSubmissionsByCompetitor(profileId, submitterId)
    return submissions.length
  } catch (error) {
    throw new DatabaseError('Failed to get competitor submission count', error)
  }
}
