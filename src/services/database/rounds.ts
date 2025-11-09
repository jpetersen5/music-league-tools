/**
 * Round Database Service
 *
 * Query operations for Music League rounds
 *
 * @module database/rounds
 */

import { getDatabase, DatabaseError } from './db'
import type { Round, ProfileId, RoundId } from '@/types/musicLeague'

// ============================================================================
// Round Operations
// ============================================================================

/**
 * Add a single round
 *
 * @param round - Round to add
 * @throws DatabaseError if operation fails
 */
export async function addRound(round: Round): Promise<void> {
  try {
    const db = await getDatabase()
    await db.add('rounds', round)
  } catch (error) {
    throw new DatabaseError('Failed to add round', error)
  }
}

/**
 * Add multiple rounds in a single transaction (batch insert)
 *
 * @param rounds - Array of rounds to add
 * @throws DatabaseError if operation fails
 */
export async function addRounds(rounds: readonly Round[]): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction('rounds', 'readwrite')
    const store = tx.objectStore('rounds')

    await Promise.all(rounds.map(round => store.add(round)))
    await tx.done
  } catch (error) {
    throw new DatabaseError('Failed to add rounds', error)
  }
}

/**
 * Get a specific round by profile and round ID
 *
 * @param profileId - Profile ID
 * @param roundId - Round ID
 * @returns The round or null if not found
 * @throws DatabaseError if retrieval fails
 */
export async function getRound(profileId: ProfileId, roundId: RoundId): Promise<Round | null> {
  try {
    const db = await getDatabase()
    const round = await db.get('rounds', [profileId, roundId])
    return round ?? null
  } catch (error) {
    throw new DatabaseError('Failed to get round', error)
  }
}

/**
 * Get all rounds for a profile, optionally sorted by creation date
 *
 * @param profileId - Profile ID
 * @param sortByDate - If true, sort by creation date (oldest first)
 * @returns Array of rounds
 * @throws DatabaseError if retrieval fails
 */
export async function getRoundsByProfile(
  profileId: ProfileId,
  sortByDate = true
): Promise<Round[]> {
  try {
    const db = await getDatabase()

    if (sortByDate) {
      // Use the composite index to get sorted results
      const rounds = await db.getAllFromIndex(
        'rounds',
        'by-profile-createdAt',
        IDBKeyRange.bound([profileId, new Date(0)], [profileId, new Date()])
      )
      return rounds
    }

    return await db.getAllFromIndex('rounds', 'by-profileId', profileId)
  } catch (error) {
    throw new DatabaseError('Failed to get rounds by profile', error)
  }
}

/**
 * Get rounds within a date range
 *
 * @param profileId - Profile ID
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of rounds within the date range
 * @throws DatabaseError if retrieval fails
 */
export async function getRoundsByDateRange(
  profileId: ProfileId,
  startDate: Date,
  endDate: Date
): Promise<Round[]> {
  try {
    const db = await getDatabase()
    const rounds = await db.getAllFromIndex(
      'rounds',
      'by-profile-createdAt',
      IDBKeyRange.bound([profileId, startDate], [profileId, endDate])
    )
    return rounds
  } catch (error) {
    throw new DatabaseError('Failed to get rounds by date range', error)
  }
}

/**
 * Get the earliest and latest round dates for a profile
 *
 * @param profileId - Profile ID
 * @returns Date range or null if no rounds exist
 * @throws DatabaseError if retrieval fails
 */
export async function getRoundDateRange(
  profileId: ProfileId
): Promise<{ start: Date; end: Date } | null> {
  try {
    const rounds = await getRoundsByProfile(profileId, true)

    if (rounds.length === 0) {
      return null
    }

    return {
      start: rounds[0]!.createdAt,
      end: rounds[rounds.length - 1]!.createdAt,
    }
  } catch (error) {
    throw new DatabaseError('Failed to get round date range', error)
  }
}

/**
 * Get round count for a profile
 *
 * @param profileId - Profile ID
 * @returns Total number of rounds
 * @throws DatabaseError if count fails
 */
export async function getRoundCount(profileId: ProfileId): Promise<number> {
  try {
    const db = await getDatabase()
    const rounds = await db.getAllFromIndex('rounds', 'by-profileId', profileId)
    return rounds.length
  } catch (error) {
    throw new DatabaseError('Failed to get round count', error)
  }
}

/**
 * Search rounds by name or description (case-insensitive)
 *
 * @param profileId - Profile ID
 * @param query - Search query
 * @returns Array of matching rounds
 * @throws DatabaseError if search fails
 */
export async function searchRounds(profileId: ProfileId, query: string): Promise<Round[]> {
  try {
    const rounds = await getRoundsByProfile(profileId)
    const lowerQuery = query.toLowerCase()

    return rounds.filter(
      round =>
        round.name.toLowerCase().includes(lowerQuery) ||
        round.description.toLowerCase().includes(lowerQuery)
    )
  } catch (error) {
    throw new DatabaseError('Failed to search rounds', error)
  }
}
