/**
 * Music League Database - IndexedDB Initialization
 *
 * Manages the IndexedDB database schema for storing Music League data.
 * Uses the 'idb' library for better TypeScript support and cleaner API.
 *
 * @module database/db
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type { Profile, Competitor, Round, Submission, Vote } from '@/types/musicLeague'

// ============================================================================
// Database Schema Definition
// ============================================================================

/**
 * IndexedDB schema for Music League Tools
 */
export interface MusicLeagueDB extends DBSchema {
  profiles: {
    key: string // ProfileId
    value: Profile
    indexes: {
      'by-updatedAt': Date
      'by-name': string
    }
  }
  competitors: {
    key: [string, string] // [profileId, competitorId]
    value: Competitor
    indexes: {
      'by-profileId': string
      'by-isOrphaned': number // 0 or 1 for boolean indexing
      'by-profile-orphaned': [string, number] // Composite for filtered queries
    }
  }
  rounds: {
    key: [string, string] // [profileId, roundId]
    value: Round
    indexes: {
      'by-profileId': string
      'by-createdAt': Date
      'by-profile-createdAt': [string, Date] // Composite for sorted queries
    }
  }
  submissions: {
    key: [string, string, string] // [profileId, roundId, spotifyUri]
    value: Submission
    indexes: {
      'by-profileId': string
      'by-submitterId': [string, string] // [profileId, submitterId]
      'by-roundId': [string, string] // [profileId, roundId]
      'by-spotifyUri': [string, string] // [profileId, spotifyUri]
      'by-created': Date
      'by-profile-createdAt': [string, Date] // [profileId, createdAt]
    }
  }
  votes: {
    key: [string, string, string, string] // [profileId, roundId, spotifyUri, voterId]
    value: Vote
    indexes: {
      'by-profileId': string
      'by-voterId': [string, string] // [profileId, voterId]
      'by-spotifyUri': [string, string] // [profileId, spotifyUri]
      'by-roundId': [string, string] // [profileId, roundId]
      'by-created': Date
      'by-profile-createdAt': [string, Date] // [profileId, createdAt]
    }
  }
}

// ============================================================================
// Database Configuration
// ============================================================================

const DB_NAME = 'music-league-tools'
const DB_VERSION = 4

/**
 * Singleton database instance
 */
let dbInstance: IDBPDatabase<MusicLeagueDB> | null = null

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize the IndexedDB database with proper schema and indexes
 *
 * @returns Promise resolving to the database instance
 * @throws Error if database cannot be opened or upgraded
 */
export async function initDatabase(): Promise<IDBPDatabase<MusicLeagueDB>> {
  try {
    const db = await openDB<MusicLeagueDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _, transaction) {
        // Version 1: Initial schema
        if (oldVersion < 1) {
          // Create profiles store
          if (!db.objectStoreNames.contains('profiles')) {
            const profileStore = db.createObjectStore('profiles', {
              keyPath: 'id',
            })
            profileStore.createIndex('by-updatedAt', 'updatedAt')
            profileStore.createIndex('by-name', 'name')
          }

          // Create competitors store with composite key
          if (!db.objectStoreNames.contains('competitors')) {
            const competitorStore = db.createObjectStore('competitors', {
              keyPath: ['profileId', 'id'],
            })
            competitorStore.createIndex('by-profileId', 'profileId')
            // Convert boolean to number for indexing (IndexedDB doesn't support boolean indexes well)
            competitorStore.createIndex('by-isOrphaned', 'isOrphaned')
            competitorStore.createIndex('by-profile-orphaned', ['profileId', 'isOrphaned'])
          }

          // Create rounds store with composite key
          if (!db.objectStoreNames.contains('rounds')) {
            const roundStore = db.createObjectStore('rounds', {
              keyPath: ['profileId', 'id'],
            })
            roundStore.createIndex('by-profileId', 'profileId')
            roundStore.createIndex('by-createdAt', 'createdAt')
            roundStore.createIndex('by-profile-createdAt', ['profileId', 'createdAt'])
          }

          // Create submissions store with composite key
          if (!db.objectStoreNames.contains('submissions')) {
            const submissionStore = db.createObjectStore('submissions', {
              keyPath: ['profileId', 'spotifyUri'],
            })
            submissionStore.createIndex('by-profileId', 'profileId')
            submissionStore.createIndex('by-submitterId', ['profileId', 'submitterId'])
            submissionStore.createIndex('by-roundId', ['profileId', 'roundId'])
            submissionStore.createIndex('by-spotifyUri', ['profileId', 'spotifyUri'])
            submissionStore.createIndex('by-created', 'createdAt')
            submissionStore.createIndex('by-profile-createdAt', ['profileId', 'createdAt'])
          }

          // Create votes store with composite key (profile, spotify URI, voter)
          if (!db.objectStoreNames.contains('votes')) {
            const voteStore = db.createObjectStore('votes', {
              keyPath: ['profileId', 'spotifyUri', 'voterId'],
            })
            voteStore.createIndex('by-profileId', 'profileId')
            voteStore.createIndex('by-voterId', ['profileId', 'voterId'])
            voteStore.createIndex('by-spotifyUri', ['profileId', 'spotifyUri'])
            voteStore.createIndex('by-roundId', ['profileId', 'roundId'])
            voteStore.createIndex('by-created', 'createdAt')
            voteStore.createIndex('by-profile-createdAt', ['profileId', 'createdAt'])
          }
        }

        // Version 2: Update submissions key to include roundId
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('submissions')) {
            // Use the existing transaction for reading
            const oldStore = transaction.objectStore('submissions')
            const allSubmissions = await oldStore.getAll()

            // Delete old store
            db.deleteObjectStore('submissions')

            // Create new store with updated keyPath
            const newStore = db.createObjectStore('submissions', {
              keyPath: ['profileId', 'roundId', 'spotifyUri'],
            })

            // Re-create indexes
            newStore.createIndex('by-profileId', 'profileId')
            newStore.createIndex('by-submitterId', ['profileId', 'submitterId'])
            newStore.createIndex('by-roundId', ['profileId', 'roundId'])
            newStore.createIndex('by-spotifyUri', ['profileId', 'spotifyUri'])
            newStore.createIndex('by-created', 'createdAt')
            newStore.createIndex('by-profile-createdAt', ['profileId', 'createdAt'])

            // Migrate data back
            for (const submission of allSubmissions) {
              await newStore.put(submission)
            }
          }

          if (db.objectStoreNames.contains('votes')) {
            // Use the existing transaction for reading
            const oldStore = transaction.objectStore('votes')
            const allVotes = await oldStore.getAll()

            // Delete old store
            db.deleteObjectStore('votes')

            // Create new store with updated keyPath
            const newStore = db.createObjectStore('votes', {
              keyPath: ['profileId', 'roundId', 'spotifyUri', 'voterId'],
            })

            // Re-create indexes
            newStore.createIndex('by-profileId', 'profileId')
            newStore.createIndex('by-voterId', ['profileId', 'voterId'])
            newStore.createIndex('by-spotifyUri', ['profileId', 'spotifyUri'])
            newStore.createIndex('by-roundId', ['profileId', 'roundId'])
            newStore.createIndex('by-created', 'createdAt')
            newStore.createIndex('by-profile-createdAt', ['profileId', 'createdAt'])

            // Migrate data back
            for (const vote of allVotes) {
              await newStore.put(vote)
            }
          }
        }

        // Version 3: Replace rankInRound with totalPoints
        if (oldVersion < 3) {
          if (
            db.objectStoreNames.contains('submissions') &&
            db.objectStoreNames.contains('votes')
          ) {
            const tx = transaction
            const submissionStore = tx.objectStore('submissions')
            const voteStore = tx.objectStore('votes')

            const allSubmissions = await submissionStore.getAll()
            const allVotes = await voteStore.getAll()

            const votersByRound = new Map<string, Set<string>>()
            const votesBySubmissionKey = new Map<string, Vote[]>()

            for (const vote of allVotes) {
              // Track who voted in which round (per profile)
              const roundKey = `${vote.profileId}:${vote.roundId}`
              if (!votersByRound.has(roundKey)) {
                votersByRound.set(roundKey, new Set())
              }
              votersByRound.get(roundKey)!.add(vote.voterId)

              // Group votes
              const submissionKey = `${vote.profileId}:${vote.roundId}:${vote.spotifyUri}`
              if (!votesBySubmissionKey.has(submissionKey)) {
                votesBySubmissionKey.set(submissionKey, [])
              }
              votesBySubmissionKey.get(submissionKey)!.push(vote)
            }

            for (const submission of allSubmissions) {
              const roundKey = `${submission.profileId}:${submission.roundId}`
              const submissionKey = `${submission.profileId}:${submission.roundId}:${submission.spotifyUri}`

              const votersInRound = votersByRound.get(roundKey)
              const submitterVoted = votersInRound?.has(submission.submitterId) ?? false

              const votes = votesBySubmissionKey.get(submissionKey) ?? []

              let totalPoints = 0
              for (const vote of votes) {
                if (submitterVoted) {
                  totalPoints += vote.pointsAssigned
                } else {
                  // If they didn't vote, only count negative points
                  if (vote.pointsAssigned < 0) {
                    totalPoints += vote.pointsAssigned
                  }
                }
              }

              // @ts-expect-error: Migration logic
              delete submission.rankInRound

              // @ts-expect-error: Migration logic
              submission.totalPoints = totalPoints

              await submissionStore.put(submission)
            }
          }
        }

        // Version 4: Pre-calculate detailed submission stats
        if (oldVersion < 4) {
          if (
            db.objectStoreNames.contains('submissions') &&
            db.objectStoreNames.contains('votes')
          ) {
            const tx = transaction
            const submissionStore = tx.objectStore('submissions')
            const voteStore = tx.objectStore('votes')

            const allSubmissions = await submissionStore.getAll()
            const allVotes = await voteStore.getAll()

            // Map votes by submission key
            const votesBySubmissionKey = new Map<string, Vote[]>()
            for (const vote of allVotes) {
              const submissionKey = `${vote.profileId}:${vote.roundId}:${vote.spotifyUri}`
              if (!votesBySubmissionKey.has(submissionKey)) {
                votesBySubmissionKey.set(submissionKey, [])
              }
              votesBySubmissionKey.get(submissionKey)!.push(vote)
            }

            for (const submission of allSubmissions) {
              const submissionKey = `${submission.profileId}:${submission.roundId}:${submission.spotifyUri}`
              const votes = votesBySubmissionKey.get(submissionKey) ?? []

              // Points breakdown
              const positivePoints = votes
                .filter(v => v.pointsAssigned > 0)
                .reduce((sum, v) => sum + v.pointsAssigned, 0)

              const negativePoints = votes
                .filter(v => v.pointsAssigned < 0)
                .reduce((sum, v) => sum + v.pointsAssigned, 0)

              const uniqueVoters = new Set(
                votes.filter(v => v.pointsAssigned !== 0).map(v => v.voterId)
              ).size

              // Comments & Sentiment
              const comments = votes
                .filter(v => v.comment && v.comment.trim().length > 0)
                .map(v => ({ text: v.comment, sentiment: v.sentimentScore }))

              const commentCount = comments.length

              let averageSentiment = 0
              if (comments.length > 0) {
                const totalSentiment = comments.reduce((sum, c) => sum + (c.sentiment || 0), 0)
                averageSentiment = totalSentiment / comments.length
              }

              // Polarization
              let polarizationScore = 0
              if (votes.length >= 2) {
                const points = votes.map(v => v.pointsAssigned)
                const totalPoints = points.reduce((sum, p) => sum + p, 0)
                const avgPoints = totalPoints / points.length

                const squaredDiffs = points.map(p => Math.pow(p - avgPoints, 2))
                const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / points.length
                const stdDev = Math.sqrt(variance)

                const maxPossibleStdDev = Math.max(...points) - Math.min(...points)
                if (maxPossibleStdDev > 0) {
                  polarizationScore = stdDev / maxPossibleStdDev
                }
              }

              // @ts-expect-error: Migration logic
              submission.positivePoints = positivePoints
              // @ts-expect-error: Migration logic
              submission.negativePoints = negativePoints
              // @ts-expect-error: Migration logic
              submission.uniqueVoters = uniqueVoters
              // @ts-expect-error: Migration logic
              submission.commentCount = commentCount
              // @ts-expect-error: Migration logic
              submission.averageSentiment = averageSentiment
              // @ts-expect-error: Migration logic
              submission.polarizationScore = polarizationScore

              await submissionStore.put(submission)
            }
          }
        }
      },
      blocked() {
        console.warn('Database upgrade blocked. Please close all other tabs with this app open.')
      },
      blocking() {
        console.warn('This connection is blocking a database upgrade. Consider closing this tab.')
      },
      terminated() {
        console.error('Database connection was unexpectedly terminated.')
        dbInstance = null
      },
    })

    dbInstance = db
    return db
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw new DatabaseError('Failed to initialize database', error)
  }
}

/**
 * Get the database instance, initializing if necessary
 *
 * @returns Promise resolving to the database instance
 */
export async function getDatabase(): Promise<IDBPDatabase<MusicLeagueDB>> {
  if (dbInstance) {
    return dbInstance
  }
  return await initDatabase()
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError)
    }
  }

  /**
   * Check if error is due to quota exceeded
   */
  static isQuotaExceeded(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    }
    return false
  }

  /**
   * Check if error is due to version conflict
   */
  static isVersionError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'VersionError' || error.message.includes('version')
    }
    return false
  }

  /**
   * Check if error is due to blocked upgrade
   */
  static isBlocked(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'blocked' || error.message.includes('blocked')
    }
    return false
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if IndexedDB is available in the current environment
 *
 * @returns True if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/**
 * Get estimated storage quota information
 *
 * @returns Storage estimate or null if not available
 */
export async function getStorageEstimate(): Promise<{
  usage: number
  quota: number
  percentage: number
} | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      const percentage = quota > 0 ? (usage / quota) * 100 : 0

      return {
        usage,
        quota,
        percentage,
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get storage estimate:', error)
    return null
  }
}

/**
 * Clear all data from the database
 * WARNING: This will delete all profiles and associated data
 *
 * @throws DatabaseError if clear operation fails
 */
export async function clearAllData(): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction(
      ['profiles', 'competitors', 'rounds', 'submissions', 'votes'],
      'readwrite'
    )

    await Promise.all([
      tx.objectStore('profiles').clear(),
      tx.objectStore('competitors').clear(),
      tx.objectStore('rounds').clear(),
      tx.objectStore('submissions').clear(),
      tx.objectStore('votes').clear(),
    ])

    await tx.done
  } catch (error) {
    throw new DatabaseError('Failed to clear all data', error)
  }
}

/**
 * Delete the entire database
 * WARNING: This is irreversible
 */
export async function deleteDatabase(): Promise<void> {
  try {
    closeDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        reject(new Error('Database deletion blocked'))
      }
    })
  } catch (error) {
    throw new DatabaseError('Failed to delete database', error)
  }
}
