/**
 * Profile Database Service
 *
 * CRUD operations for Music League profiles
 *
 * @module database/profiles
 */

import { getDatabase, DatabaseError } from './db'
import type { Profile, ProfileId } from '@/types/musicLeague'

// ============================================================================
// Profile CRUD Operations
// ============================================================================

/**
 * Create a new profile
 *
 * @param profile - Profile data to create
 * @returns The created profile
 * @throws DatabaseError if creation fails
 */
export async function createProfile(profile: Profile): Promise<Profile> {
  try {
    const db = await getDatabase()
    await db.add('profiles', profile)
    return profile
  } catch (error) {
    if (DatabaseError.isQuotaExceeded(error)) {
      throw new DatabaseError(
        'Storage quota exceeded. Please delete old profiles to free up space.',
        error
      )
    }
    throw new DatabaseError('Failed to create profile', error)
  }
}

/**
 * Get a profile by ID
 *
 * @param profileId - ID of the profile to retrieve
 * @returns The profile or null if not found
 * @throws DatabaseError if retrieval fails
 */
export async function getProfile(profileId: ProfileId): Promise<Profile | null> {
  try {
    const db = await getDatabase()
    const profile = await db.get('profiles', profileId)
    return profile ?? null
  } catch (error) {
    throw new DatabaseError('Failed to get profile', error)
  }
}

/**
 * Get all profiles, optionally sorted by last modified
 *
 * @param sortByLastModified - If true, sort by most recently modified first
 * @returns Array of all profiles
 * @throws DatabaseError if retrieval fails
 */
export async function getAllProfiles(sortByLastModified = true): Promise<Profile[]> {
  try {
    const db = await getDatabase()

    if (sortByLastModified) {
      // Get all profiles sorted by updatedAt in descending order
      const profiles = await db.getAllFromIndex('profiles', 'by-updatedAt')
      return profiles.reverse() // Reverse to get most recent first
    }

    return await db.getAll('profiles')
  } catch (error) {
    throw new DatabaseError('Failed to get all profiles', error)
  }
}

/**
 * Update an existing profile
 *
 * @param profileId - ID of the profile to update
 * @param updates - Partial profile data to update
 * @returns The updated profile or null if not found
 * @throws DatabaseError if update fails
 */
export async function updateProfile(
  profileId: ProfileId,
  updates: Partial<Omit<Profile, 'id' | 'createdAt'>>
): Promise<Profile | null> {
  try {
    const db = await getDatabase()
    const existing = await db.get('profiles', profileId)

    if (!existing) {
      return null
    }

    const updated: Profile = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date(), // Always update updatedAt
    }

    await db.put('profiles', updated)
    return updated
  } catch (error) {
    throw new DatabaseError('Failed to update profile', error)
  }
}

/**
 * Delete a profile and all associated data
 *
 * @param profileId - ID of the profile to delete
 * @returns True if profile was deleted, false if not found
 * @throws DatabaseError if deletion fails
 */
export async function deleteProfile(profileId: ProfileId): Promise<boolean> {
  try {
    const db = await getDatabase()

    // Check if profile exists
    const profile = await db.get('profiles', profileId)
    if (!profile) {
      return false
    }

    // Delete all data in a single transaction for atomicity
    const tx = db.transaction(
      ['profiles', 'competitors', 'rounds', 'submissions', 'votes'],
      'readwrite'
    )

    // Delete profile
    await tx.objectStore('profiles').delete(profileId)

    // Delete all competitors for this profile
    const competitorIndex = tx.objectStore('competitors').index('by-profileId')
    let competitorCursor = await competitorIndex.openCursor(IDBKeyRange.only(profileId))
    while (competitorCursor) {
      await competitorCursor.delete()
      competitorCursor = await competitorCursor.continue()
    }

    // Delete all rounds for this profile
    const roundIndex = tx.objectStore('rounds').index('by-profileId')
    let roundCursor = await roundIndex.openCursor(IDBKeyRange.only(profileId))
    while (roundCursor) {
      await roundCursor.delete()
      roundCursor = await roundCursor.continue()
    }

    // Delete all submissions for this profile
    const submissionIndex = tx.objectStore('submissions').index('by-profileId')
    let submissionCursor = await submissionIndex.openCursor(IDBKeyRange.only(profileId))
    while (submissionCursor) {
      await submissionCursor.delete()
      submissionCursor = await submissionCursor.continue()
    }

    // Delete all votes for this profile
    const voteIndex = tx.objectStore('votes').index('by-profileId')
    let voteCursor = await voteIndex.openCursor(IDBKeyRange.only(profileId))
    while (voteCursor) {
      await voteCursor.delete()
      voteCursor = await voteCursor.continue()
    }

    await tx.done
    return true
  } catch (error) {
    throw new DatabaseError('Failed to delete profile', error)
  }
}

/**
 * Check if a profile exists
 *
 * @param profileId - ID of the profile to check
 * @returns True if profile exists
 * @throws DatabaseError if check fails
 */
export async function profileExists(profileId: ProfileId): Promise<boolean> {
  try {
    const db = await getDatabase()
    const count = await db.count('profiles', profileId)
    return count > 0
  } catch (error) {
    throw new DatabaseError('Failed to check if profile exists', error)
  }
}

/**
 * Update profile metadata (name)
 *
 * @param profileId - ID of the profile to update
 * @param metadata - Metadata to update (name)
 * @returns The updated profile or null if not found
 * @throws DatabaseError if update fails
 */
export async function updateProfileMetadata(
  profileId: ProfileId,
  metadata: { name?: string }
): Promise<Profile | null> {
  return updateProfile(profileId, metadata)
}

/**
 * Get profile count
 *
 * @returns Total number of profiles
 * @throws DatabaseError if count fails
 */
export async function getProfileCount(): Promise<number> {
  try {
    const db = await getDatabase()
    return await db.count('profiles')
  } catch (error) {
    throw new DatabaseError('Failed to get profile count', error)
  }
}

/**
 * Search profiles by name (case-insensitive)
 *
 * @param query - Search query
 * @returns Array of matching profiles
 * @throws DatabaseError if search fails
 */
export async function searchProfilesByName(query: string): Promise<Profile[]> {
  try {
    const db = await getDatabase()
    const allProfiles = await db.getAll('profiles')

    const lowerQuery = query.toLowerCase()
    return allProfiles.filter(profile => profile.name.toLowerCase().includes(lowerQuery))
  } catch (error) {
    throw new DatabaseError('Failed to search profiles', error)
  }
}
