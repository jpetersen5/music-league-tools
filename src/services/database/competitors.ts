/**
 * Competitor Database Service
 *
 * Query operations for Music League competitors
 *
 * @module database/competitors
 */

import { getDatabase, DatabaseError } from './db'
import type { Competitor, ProfileId, CompetitorId } from '@/types/musicLeague'

// ============================================================================
// Competitor Operations
// ============================================================================

/**
 * Add a single competitor
 *
 * @param competitor - Competitor to add
 * @throws DatabaseError if operation fails
 */
export async function addCompetitor(competitor: Competitor): Promise<void> {
  try {
    const db = await getDatabase()
    await db.add('competitors', competitor)
  } catch (error) {
    throw new DatabaseError('Failed to add competitor', error)
  }
}

/**
 * Add multiple competitors in a single transaction (batch insert)
 *
 * @param competitors - Array of competitors to add
 * @throws DatabaseError if operation fails
 */
export async function addCompetitors(competitors: readonly Competitor[]): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction('competitors', 'readwrite')
    const store = tx.objectStore('competitors')

    await Promise.all(competitors.map(competitor => store.add(competitor)))
    await tx.done
  } catch (error) {
    throw new DatabaseError('Failed to add competitors', error)
  }
}

/**
 * Get a specific competitor by profile and competitor ID
 *
 * @param profileId - Profile ID
 * @param competitorId - Competitor ID
 * @returns The competitor or null if not found
 * @throws DatabaseError if retrieval fails
 */
export async function getCompetitor(
  profileId: ProfileId,
  competitorId: CompetitorId
): Promise<Competitor | null> {
  try {
    const db = await getDatabase()
    const competitor = await db.get('competitors', [profileId, competitorId])
    return competitor ?? null
  } catch (error) {
    throw new DatabaseError('Failed to get competitor', error)
  }
}

/**
 * Get all competitors for a profile
 *
 * @param profileId - Profile ID
 * @param includeOrphaned - If false, exclude orphaned competitors
 * @returns Array of competitors
 * @throws DatabaseError if retrieval fails
 */
export async function getCompetitorsByProfile(
  profileId: ProfileId,
  includeOrphaned = true
): Promise<Competitor[]> {
  try {
    const db = await getDatabase()

    if (includeOrphaned) {
      // Get all competitors for this profile
      return await db.getAllFromIndex('competitors', 'by-profileId', profileId)
    }

    // Get only non-orphaned competitors
    const competitors = await db.getAllFromIndex('competitors', 'by-profile-orphaned', [
      profileId,
      0,
    ])
    return competitors
  } catch (error) {
    throw new DatabaseError('Failed to get competitors by profile', error)
  }
}

/**
 * Get all orphaned competitors for a profile
 *
 * @param profileId - Profile ID
 * @returns Array of orphaned competitors
 * @throws DatabaseError if retrieval fails
 */
export async function getOrphanedCompetitors(profileId: ProfileId): Promise<Competitor[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('competitors', 'by-profile-orphaned', [profileId, 1])
  } catch (error) {
    throw new DatabaseError('Failed to get orphaned competitors', error)
  }
}

/**
 * Check if a competitor exists
 *
 * @param profileId - Profile ID
 * @param competitorId - Competitor ID
 * @returns True if competitor exists
 * @throws DatabaseError if check fails
 */
export async function competitorExists(
  profileId: ProfileId,
  competitorId: CompetitorId
): Promise<boolean> {
  try {
    const db = await getDatabase()
    const count = await db.count('competitors', [profileId, competitorId])
    return count > 0
  } catch (error) {
    throw new DatabaseError('Failed to check if competitor exists', error)
  }
}

/**
 * Get competitor count for a profile
 *
 * @param profileId - Profile ID
 * @param includeOrphaned - If false, exclude orphaned competitors
 * @returns Total number of competitors
 * @throws DatabaseError if count fails
 */
export async function getCompetitorCount(
  profileId: ProfileId,
  includeOrphaned = true
): Promise<number> {
  try {
    const competitors = await getCompetitorsByProfile(profileId, includeOrphaned)
    return competitors.length
  } catch (error) {
    throw new DatabaseError('Failed to get competitor count', error)
  }
}

/**
 * Search competitors by name (case-insensitive)
 *
 * @param profileId - Profile ID
 * @param query - Search query
 * @returns Array of matching competitors
 * @throws DatabaseError if search fails
 */
export async function searchCompetitorsByName(
  profileId: ProfileId,
  query: string
): Promise<Competitor[]> {
  try {
    const competitors = await getCompetitorsByProfile(profileId)
    const lowerQuery = query.toLowerCase()
    return competitors.filter(competitor => competitor.name.toLowerCase().includes(lowerQuery))
  } catch (error) {
    throw new DatabaseError('Failed to search competitors', error)
  }
}
