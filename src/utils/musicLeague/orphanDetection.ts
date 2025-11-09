/**
 * Orphaned ID Detection Utility
 *
 * Detect and handle competitor IDs referenced in submissions/votes
 * but not present in the competitors list
 *
 * @module utils/musicLeague/orphanDetection
 */

import type {
  Competitor,
  CompetitorCsvRow,
  SubmissionCsvRow,
  VoteCsvRow,
  CompetitorId,
  ProfileId,
} from '@/types/musicLeague'
import { createCompetitorId } from '@/types/musicLeague'

// ============================================================================
// Types
// ============================================================================

export interface OrphanDetectionResult {
  orphanedIds: Set<CompetitorId>
  orphanedCompetitors: Competitor[]
  stats: {
    totalOrphans: number
    orphansFromSubmissions: number
    orphansFromVotes: number
  }
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Build a Set of valid competitor IDs from competitors CSV data
 *
 * @param competitors - Array of competitor CSV rows
 * @returns Set of valid competitor IDs
 */
export function buildCompetitorIdSet(competitors: CompetitorCsvRow[]): Set<CompetitorId> {
  return new Set(competitors.map(c => createCompetitorId(c.ID)))
}

/**
 * Find orphaned competitor IDs in submissions data
 *
 * @param submissions - Array of submission CSV rows
 * @param validIds - Set of valid competitor IDs
 * @returns Set of orphaned competitor IDs
 */
export function findOrphanedIdsInSubmissions(
  submissions: SubmissionCsvRow[],
  validIds: Set<CompetitorId>
): Set<CompetitorId> {
  const orphanedIds = new Set<CompetitorId>()

  for (const submission of submissions) {
    const submitterId = createCompetitorId(submission['Submitter ID'])
    if (!validIds.has(submitterId)) {
      orphanedIds.add(submitterId)
    }
  }

  return orphanedIds
}

/**
 * Find orphaned competitor IDs in votes data
 *
 * @param votes - Array of vote CSV rows
 * @param validIds - Set of valid competitor IDs
 * @returns Set of orphaned competitor IDs
 */
export function findOrphanedIdsInVotes(
  votes: VoteCsvRow[],
  validIds: Set<CompetitorId>
): Set<CompetitorId> {
  const orphanedIds = new Set<CompetitorId>()

  for (const vote of votes) {
    const voterId = createCompetitorId(vote['Voter ID'])
    if (!validIds.has(voterId)) {
      orphanedIds.add(voterId)
    }
  }

  return orphanedIds
}

/**
 * Detect all orphaned competitor IDs across submissions and votes
 *
 * @param competitors - Array of competitor CSV rows
 * @param submissions - Array of submission CSV rows
 * @param votes - Array of vote CSV rows
 * @param profileId - Profile ID to associate orphaned competitors with
 * @returns Orphan detection result with generated competitor entries
 */
export function detectOrphanedCompetitors(
  competitors: CompetitorCsvRow[],
  submissions: SubmissionCsvRow[],
  votes: VoteCsvRow[],
  profileId: ProfileId
): OrphanDetectionResult {
  // Build set of valid competitor IDs
  const validIds = buildCompetitorIdSet(competitors)

  // Find orphaned IDs in submissions and votes
  const orphansFromSubmissions = findOrphanedIdsInSubmissions(submissions, validIds)
  const orphansFromVotes = findOrphanedIdsInVotes(votes, validIds)

  // Combine all orphaned IDs
  const allOrphanedIds = new Set<CompetitorId>([...orphansFromSubmissions, ...orphansFromVotes])

  // Generate competitor entries for orphaned IDs
  const orphanedCompetitors = generateOrphanedCompetitors(allOrphanedIds, profileId)

  return {
    orphanedIds: allOrphanedIds,
    orphanedCompetitors,
    stats: {
      totalOrphans: allOrphanedIds.size,
      orphansFromSubmissions: orphansFromSubmissions.size,
      orphansFromVotes: orphansFromVotes.size,
    },
  }
}

/**
 * Generate competitor entries for orphaned IDs
 *
 * @param orphanedIds - Set of orphaned competitor IDs
 * @param profileId - Profile ID to associate with
 * @returns Array of orphaned competitor entries
 */
export function generateOrphanedCompetitors(
  orphanedIds: Set<CompetitorId>,
  profileId: ProfileId
): Competitor[] {
  const orphanedCompetitors: Competitor[] = []
  let orphanNumber = 1

  // Sort IDs for consistent numbering
  const sortedIds = Array.from(orphanedIds).sort()

  for (const orphanId of sortedIds) {
    orphanedCompetitors.push({
      profileId,
      id: orphanId,
      name: `Unknown User #${orphanNumber}`,
      isOrphaned: true,
    })
    orphanNumber++
  }

  return orphanedCompetitors
}

/**
 * Merge regular competitors with orphaned competitors
 *
 * @param regularCompetitors - Array of regular competitor entries
 * @param orphanedCompetitors - Array of orphaned competitor entries
 * @returns Combined array of all competitors
 */
export function mergeCompetitors(
  regularCompetitors: Competitor[],
  orphanedCompetitors: Competitor[]
): Competitor[] {
  return [...regularCompetitors, ...orphanedCompetitors]
}

/**
 * Check if a competitor ID is orphaned
 *
 * @param competitorId - Competitor ID to check
 * @param validIds - Set of valid competitor IDs
 * @returns True if ID is orphaned
 */
export function isOrphanedId(competitorId: CompetitorId, validIds: Set<CompetitorId>): boolean {
  return !validIds.has(competitorId)
}

/**
 * Get statistics about orphaned competitors
 *
 * @param result - Orphan detection result
 * @returns Human-readable statistics string
 */
export function formatOrphanStats(result: OrphanDetectionResult): string {
  if (result.stats.totalOrphans === 0) {
    return 'No orphaned competitors detected.'
  }

  const parts = [`Found ${result.stats.totalOrphans} orphaned competitor(s)`]

  if (result.stats.orphansFromSubmissions > 0) {
    parts.push(`${result.stats.orphansFromSubmissions} from submissions`)
  }

  if (result.stats.orphansFromVotes > 0) {
    parts.push(`${result.stats.orphansFromVotes} from votes`)
  }

  parts.push(`Generated as: ${result.orphanedCompetitors.map(c => c.name).join(', ')}`)

  return parts.join('; ')
}
