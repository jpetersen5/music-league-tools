/**
 * Music League Database - IndexedDB Initialization
 *
 * Manages the IndexedDB database schema for storing Music League data.
 * Uses the 'idb' library for better TypeScript support and cleaner API.
 *
 * @module database/db
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb'

import type {
  Profile,
  Competitor,
  Round,
  Submission,
  Vote,
  RoundStats,
  LeagueStats,
  RoundId,
} from '@/types/musicLeague'
import {
  calculateStandardDeviation,
  calculateAvgPointsSpread,
  calculateUniqueArtists,
} from '@/utils/musicLeague/leaderboard/calculations'

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
const DB_VERSION = 6

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

        // Version 5: Pre-calculate Round and League stats
        if (oldVersion < 5) {
          if (
            db.objectStoreNames.contains('rounds') &&
            db.objectStoreNames.contains('profiles') &&
            db.objectStoreNames.contains('submissions') &&
            db.objectStoreNames.contains('votes') &&
            db.objectStoreNames.contains('competitors')
          ) {
            const tx = transaction
            const roundStore = tx.objectStore('rounds')
            const profileStore = tx.objectStore('profiles')
            const submissionStore = tx.objectStore('submissions')
            const voteStore = tx.objectStore('votes')
            const competitorStore = tx.objectStore('competitors')

            const allRounds = await roundStore.getAll()
            const allProfiles = await profileStore.getAll()
            const allSubmissions = await submissionStore.getAll()
            const allVotes = await voteStore.getAll()
            const allCompetitors = await competitorStore.getAll()

            // Map data for O(1) access
            const submissionsByRound = new Map<string, Submission[]>()
            const votesByRound = new Map<string, Vote[]>()
            const submissionsByProfile = new Map<string, Submission[]>()
            const votesByProfile = new Map<string, Vote[]>()
            const roundsByProfile = new Map<string, Round[]>()
            const competitorsByProfile = new Map<string, Competitor[]>()

            for (const sub of allSubmissions) {
              // By Round
              const rKey = sub.roundId
              if (!submissionsByRound.has(rKey)) submissionsByRound.set(rKey, [])
              submissionsByRound.get(rKey)!.push(sub)

              // By Profile
              const pKey = sub.profileId
              if (!submissionsByProfile.has(pKey)) submissionsByProfile.set(pKey, [])
              submissionsByProfile.get(pKey)!.push(sub)
            }

            for (const vote of allVotes) {
              const rKey = vote.roundId
              if (!votesByRound.has(rKey)) votesByRound.set(rKey, [])
              votesByRound.get(rKey)!.push(vote)

              const pKey = vote.profileId
              if (!votesByProfile.has(pKey)) votesByProfile.set(pKey, [])
              votesByProfile.get(pKey)!.push(vote)
            }

            for (const round of allRounds) {
              const pKey = round.profileId
              if (!roundsByProfile.has(pKey)) roundsByProfile.set(pKey, [])
              roundsByProfile.get(pKey)!.push(round)
            }

            for (const comp of allCompetitors) {
              const pKey = comp.profileId
              if (!competitorsByProfile.has(pKey)) competitorsByProfile.set(pKey, [])
              competitorsByProfile.get(pKey)!.push(comp)
            }

            // 1. Update Rounds with Stats
            for (const round of allRounds) {
              const roundSubmissions = submissionsByRound.get(round.id) || []
              const roundVotes = votesByRound.get(round.id) || []

              // Basic counts
              const competitorCount = new Set(roundSubmissions.map(s => s.submitterId)).size
              const submissionCount = roundSubmissions.length
              const voteCount = roundVotes.length
              const comments = roundVotes.filter(v => v.comment && v.comment.trim().length > 0)
              const commentCount = comments.length

              // Dates
              const dates = [
                ...roundSubmissions.map(s => s.createdAt),
                ...roundVotes.map(v => v.createdAt),
              ].sort((a, b) => a.getTime() - b.getTime())

              const startDate = dates.length > 0 ? dates[0] : null
              const endDate = dates.length > 0 ? dates[dates.length - 1] : null

              // Points & Winner
              let maxPoints = -Infinity
              let minPoints = Infinity
              let winningSubmission: RoundStats['winningSubmission'] = null

              if (roundSubmissions.length > 0) {
                const scores = roundSubmissions.map(s => s.totalPoints || 0)
                maxPoints = scores.length > 0 ? Math.max(...scores) : 0
                minPoints = scores.length > 0 ? Math.min(...scores) : 0

                const winners = roundSubmissions.filter(s => (s.totalPoints || 0) === maxPoints)
                if (winners.length > 0) {
                  const winner = winners[0]
                  winningSubmission = {
                    title: winner!.title,
                    artist: winner!.artists[0] || 'Unknown',
                    submitterId: winner!.submitterId,
                    spotifyUri: winner!.spotifyUri,
                    points: maxPoints,
                  }
                }
              } else {
                maxPoints = 0
                minPoints = 0
              }

              // Sentiment
              let avgSentiment = 0
              const sentimentCounts = {
                positive: 0,
                neutral: 0,
                negative: 0,
                polarization: 0,
              }

              if (commentCount > 0) {
                const scores = comments.map(v => v.sentimentScore || 0)
                const totalScore = scores.reduce((sum, s) => sum + s, 0)
                avgSentiment = totalScore / commentCount

                sentimentCounts.positive = scores.filter(s => s > 0.05).length
                sentimentCounts.neutral = scores.filter(s => s >= -0.05 && s <= 0.05).length
                sentimentCounts.negative = scores.filter(s => s < -0.05).length
                sentimentCounts.polarization = calculateStandardDeviation(scores)
              }

              const stats: RoundStats = {
                competitorCount,
                submissionCount,
                voteCount,
                commentCount,
                startDate: startDate ?? null,
                endDate: endDate ?? null,
                winningSubmission,
                maxPoints,
                minPoints,
                avgSentiment,
                sentiment: sentimentCounts,
              }

              // @ts-expect-error: Migration logic
              round.stats = stats
              await roundStore.put(round)
            }

            // 2. Update Profiles with Stats
            for (const profile of allProfiles) {
              const pRounds = roundsByProfile.get(profile.id) || []
              const pSubmissions = submissionsByProfile.get(profile.id) || []
              const pVotes = votesByProfile.get(profile.id) || []
              const pCompetitors = competitorsByProfile.get(profile.id) || []

              const lengthInDays =
                profile.roundDateRange?.earliest && profile.roundDateRange?.latest
                  ? Math.ceil(
                      (profile.roundDateRange.latest.getTime() -
                        profile.roundDateRange.earliest.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0

              // Participation
              const roundParticipation: number[] = []
              const performancesByRound = new Map<RoundId, { pointsReceived: number }[]>()

              for (const round of pRounds) {
                const rSubs = pSubmissions.filter(s => s.roundId === round.id)
                if (rSubs.length === 0) continue
                roundParticipation.push(rSubs.length / (pCompetitors.length || 1))

                const perfs = rSubs.map(s => ({ pointsReceived: s.totalPoints || 0 }))
                performancesByRound.set(round.id, perfs)
              }

              const avgParticipation =
                roundParticipation.length > 0
                  ? roundParticipation.reduce((a, b) => a + b, 0) / roundParticipation.length
                  : 0

              const avgPointSpread = calculateAvgPointsSpread(performancesByRound)

              // Unique Winners calculation
              const uniqueWinners = new Set<string>()
              for (const round of pRounds) {
                const updatedRound = allRounds.find(r => r.id === round.id)
                if (updatedRound && updatedRound.stats?.winningSubmission) {
                  uniqueWinners.add(updatedRound.stats.winningSubmission.submitterId)
                }
              }

              // Comments
              const totalComments = pVotes.filter(
                v => v.comment && v.comment.trim().length > 0
              ).length
              const totalDownvotes = pVotes.filter(v => v.pointsAssigned < 0).length
              const commentRate = pVotes.length > 0 ? totalComments / pVotes.length : 0

              // Sentiment
              const comments = pVotes.filter(v => v.comment && v.comment.trim().length > 0)
              const sentScores = comments.map(c => c.sentimentScore || 0)
              let avgSent = 0
              let pol = 0
              let posPct = 0
              let neuPct = 0
              let negPct = 0

              if (comments.length > 0) {
                avgSent = sentScores.reduce((a, b) => a + b, 0) / comments.length
                pol = calculateStandardDeviation(sentScores)
                posPct = sentScores.filter(s => s > 0.05).length / comments.length
                neuPct = sentScores.filter(s => s >= -0.05 && s <= 0.05).length / comments.length
                negPct = sentScores.filter(s => s < -0.05).length / comments.length
              }

              const stats: LeagueStats = {
                totalRounds: pRounds.length,
                totalCompetitors: pCompetitors.length,
                totalSubmissions: pSubmissions.length,
                totalVotes: pVotes.length,
                totalComments,
                totalDownvotes,
                uniqueWinners: uniqueWinners.size,
                uniqueArtists: calculateUniqueArtists(pSubmissions),
                startDate: profile.roundDateRange?.earliest ?? null,
                endDate: profile.roundDateRange?.latest ?? null,
                lengthInDays,
                avgParticipation,
                avgPointSpread,
                commentRate,
                sentiment: {
                  average: avgSent,
                  polarization: pol,
                  positivePercent: posPct,
                  neutralPercent: neuPct,
                  negativePercent: negPct,
                },
              }

              // @ts-expect-error: Migration logic
              profile.stats = stats
              await profileStore.put(profile)
            }
          }
        }

        // Version 6: Fix sentiment calculation (exclude null/undefined scores from average)
        if (oldVersion < 6) {
          if (
            db.objectStoreNames.contains('rounds') &&
            db.objectStoreNames.contains('profiles') &&
            db.objectStoreNames.contains('votes')
          ) {
            const tx = transaction
            const roundStore = tx.objectStore('rounds')
            const profileStore = tx.objectStore('profiles')
            const voteStore = tx.objectStore('votes')

            const allRounds = await roundStore.getAll()
            const allProfiles = await profileStore.getAll()
            const allVotes = await voteStore.getAll()

            const votesByRound = new Map<string, Vote[]>()
            const votesByProfile = new Map<string, Vote[]>()

            for (const vote of allVotes) {
              const rKey = vote.roundId
              if (!votesByRound.has(rKey)) votesByRound.set(rKey, [])
              votesByRound.get(rKey)!.push(vote)

              const pKey = vote.profileId
              if (!votesByProfile.has(pKey)) votesByProfile.set(pKey, [])
              votesByProfile.get(pKey)!.push(vote)
            }

            // 1. Update Rounds
            for (const round of allRounds) {
              if (!round.stats) continue

              const roundVotes = votesByRound.get(round.id) || []
              const comments = roundVotes.filter(v => v.comment && v.comment.trim().length > 0)

              let avgSentiment: number | null = null
              let polarization = 0
              let positive = 0
              let neutral = 0
              let negative = 0

              if (comments.length > 0) {
                // Only consider comments that actually have a sentiment score
                const scores = comments
                  .map(v => v.sentimentScore)
                  .filter((s): s is number => s !== undefined && s !== null)

                if (scores.length > 0) {
                  const totalScore = scores.reduce((sum, s) => sum + s, 0)
                  avgSentiment = totalScore / scores.length
                  polarization = calculateStandardDeviation(scores)

                  positive = scores.filter(s => s > 0.05).length
                  neutral = scores.filter(s => s >= -0.05 && s <= 0.05).length
                  negative = scores.filter(s => s < -0.05).length
                }
              }

              // Update stats
              // @ts-expect-error: Migration logic
              round.stats.avgSentiment = avgSentiment
              // @ts-expect-error: Migration logic
              round.stats.sentiment = {
                positive,
                neutral,
                negative,
                polarization,
              }

              await roundStore.put(round)
            }

            // 2. Update Profiles
            for (const profile of allProfiles) {
              if (!profile.stats) continue

              const pVotes = votesByProfile.get(profile.id) || []
              const comments = pVotes.filter(v => v.comment && v.comment.trim().length > 0)

              let avgSent: number | null = null
              let pol = 0
              let posPct = 0
              let neuPct = 0
              let negPct = 0

              if (comments.length > 0) {
                const scores = comments
                  .map(v => v.sentimentScore)
                  .filter((s): s is number => s !== undefined && s !== null)

                if (scores.length > 0) {
                  avgSent = scores.reduce((a, b) => a + b, 0) / scores.length
                  pol = calculateStandardDeviation(scores)

                  posPct = scores.filter(s => s > 0.05).length / comments.length
                  neuPct = scores.filter(s => s >= -0.05 && s <= 0.05).length / comments.length
                  negPct = scores.filter(s => s < -0.05).length / comments.length
                }
              }

              // Update stats
              // @ts-expect-error: Migration logic
              profile.stats.sentiment = {
                average: avgSent,
                polarization: pol,
                positivePercent: posPct,
                neutralPercent: neuPct,
                negativePercent: negPct,
              }

              await profileStore.put(profile)
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
