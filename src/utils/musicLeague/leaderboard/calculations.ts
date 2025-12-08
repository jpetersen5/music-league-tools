import type {
  RoundPerformance,
  LeaderboardEntry,
  SongStat,
  CompetitorStat,
  ArtistStat,
  RoundStat,
} from '@/types/leaderboard'
import type { Vote, RoundId, Submission, Competitor, CompetitorId } from '@/types/musicLeague'

const PODIUM_THRESHOLD = 3

// ============================================================================
// Core Business Logic
// ============================================================================

/**
 * Determines if a vote should be counted towards points/ranking.
 *
 * BUSINESS RULE: 0-point votes are excluded from counts and average calculations
 * because they represent votes that were only recorded due to having a comment,
 * not actual point allocation.
 *
 * @param vote - The vote to check
 * @returns True if the vote has effectively allocated points (positive)
 */
export function isPositiveVote(vote: Vote): boolean {
  return vote.pointsAssigned > 0
}

/**
 * Calculates total points for a submission based on votes received.
 *
 * BUSINESS RULE: If the submitter did NOT vote in the round, they are penalized
 * by only receiving negative points (if any). Positive points are forfeited.
 *
 * @param votes - All votes for the round
 * @param submission - The submission to calculate points for
 * @param votersInRound - Set of competitor IDs who voted in this round
 * @returns Total calculated points
 */
export function calculateSubmissionPoints(
  votes: Vote[],
  submission: Submission,
  votersInRound: Set<CompetitorId>
): number {
  const submitterVoted = votersInRound.has(submission.submitterId)
  let totalPoints = 0

  for (const vote of votes) {
    if (vote.spotifyUri !== submission.spotifyUri) continue

    if (submitterVoted) {
      // Normal case: everything counts
      totalPoints += vote.pointsAssigned
    } else {
      // Penalty case: only negative points count
      if (vote.pointsAssigned < 0) {
        totalPoints += vote.pointsAssigned
      }
    }
  }

  return totalPoints
}

/**
 * Calculates the standard deviation of a set of numbers.
 * Returns 0 if there are fewer than 2 values.
 *
 * @param values - Array of numbers
 * @returns Standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length

  return Math.sqrt(variance)
}

export function calculateTotalPoints(performances: RoundPerformance[]): number {
  return performances.reduce((sum, perf) => sum + perf.pointsReceived, 0)
}

export function calculateWinRate(performances: RoundPerformance[]): number {
  if (performances.length === 0) return 0
  const wins = performances.filter(perf => perf.position === 1).length
  return (wins / performances.length) * 100
}

export function calculatePodiumRate(performances: RoundPerformance[]): number {
  if (performances.length === 0) return 0
  const podiumFinishes = performances.filter(perf => perf.position <= PODIUM_THRESHOLD).length
  return (podiumFinishes / performances.length) * 100
}

export function calculateAveragePosition(performances: RoundPerformance[]): number {
  if (performances.length === 0) return 0
  const totalPosition = performances.reduce((sum, perf) => sum + perf.position, 0)
  return totalPosition / performances.length
}

/**
 * Lower score = more consistent performance.
 * Returns 0 if < 2 performances (need multiple data points for std dev).
 */
export function calculateConsistency(performances: RoundPerformance[]): number {
  const positions = performances.map(perf => perf.position)
  return calculateStandardDeviation(positions)
}

/**
 * Handles ties by assigning the same rank and skipping subsequent ranks.
 * Example: If two competitors tie for 2nd, both get rank 2, next gets rank 4.
 */
export function assignRanks<T extends Record<string, unknown>>(
  entries: T[],
  metricGetter: (entry: T) => number,
  ascending = false
): (T & { rank: number })[] {
  if (entries.length === 0) return []

  const sorted = [...entries].sort((a, b) => {
    const aValue = metricGetter(a)
    const bValue = metricGetter(b)
    return ascending ? aValue - bValue : bValue - aValue
  })

  let currentRank = 1
  const ranked = sorted.map((entry, index) => {
    if (index > 0) {
      const prevValue = metricGetter(sorted[index - 1]!)
      const currValue = metricGetter(entry)

      if (prevValue !== currValue) {
        currentRank = index + 1
      }
    }

    return {
      ...entry,
      rank: currentRank,
    }
  })

  return ranked
}

/**
 * Counts the number of unique competitors who have won at least one round.
 * A win is defined as position === 1 in a RoundPerformance.
 *
 * @param entries - Array of leaderboard entries with performance data
 * @returns Number of distinct competitors who have achieved first place
 */
export function calculateUniqueWinners(
  entries: (Omit<LeaderboardEntry, 'rank'> | LeaderboardEntry)[]
): number {
  const winnerIds = new Set<string>()

  for (const entry of entries) {
    const hasWon = entry.performances.some(perf => perf.position === 1)
    if (hasWon) {
      winnerIds.add(entry.competitorId)
    }
  }

  return winnerIds.size
}

/**
 * Calculates the average points spread across all rounds.
 * Spread is defined as the difference between max and min points in each round.
 *
 * @param performancesByRound - Map of round IDs to arrays of performances in that round
 * @returns Average points spread across all rounds, or 0 if no rounds
 */
export function calculateAvgPointsSpread(
  performancesByRound: Map<RoundId, { pointsReceived: number }[]>
): number {
  if (performancesByRound.size === 0) return 0

  const spreads: number[] = []

  for (const performances of performancesByRound.values()) {
    if (performances.length === 0) continue

    const points = performances.map(perf => perf.pointsReceived)
    const max = points.reduce((a, b) => Math.max(a, b), -Infinity)
    const min = points.reduce((a, b) => Math.min(a, b), Infinity)
    const spread = max - min

    spreads.push(spread)
  }

  if (spreads.length === 0) return 0

  return spreads.reduce((sum, val) => sum + val, 0) / spreads.length
}

/**
 * Analyzes sentiment data from votes with comments.
 * Calculates average sentiment score, classifies it, and provides distribution breakdown.
 *
 * Sentiment classification thresholds:
 * - positive: > 0.05
 * - negative: < -0.05
 * - neutral: between -0.05 and 0.05
 *
 * @param votes - Array of votes, may include sentiment scores
 * @returns Sentiment analysis results including average, label, and distribution breakdown
 */
export function analyzeSentiment(votes: Vote[]): {
  avgSentiment: number | null
  avgLabel: 'positive' | 'neutral' | 'negative' | null
  breakdown: { positive: number; neutral: number; negative: number }
} {
  const votesWithSentiment = votes.filter(
    v => v.sentimentScore !== undefined && v.sentimentScore !== null
  )

  const breakdown = { positive: 0, neutral: 0, negative: 0 }

  if (votesWithSentiment.length === 0) {
    return {
      avgSentiment: null,
      avgLabel: null,
      breakdown,
    }
  }

  // Calculate average sentiment
  const totalSentiment = votesWithSentiment.reduce((sum, v) => sum + v.sentimentScore!, 0)
  const avgSentiment = totalSentiment / votesWithSentiment.length

  // Classify average
  let avgLabel: 'positive' | 'neutral' | 'negative'
  if (avgSentiment > 0.05) {
    avgLabel = 'positive'
  } else if (avgSentiment < -0.05) {
    avgLabel = 'negative'
  } else {
    avgLabel = 'neutral'
  }

  // Count label distribution
  let positiveCount = 0
  let neutralCount = 0
  let negativeCount = 0

  for (const vote of votesWithSentiment) {
    const label = vote.sentimentLabel
    if (label === 'positive') positiveCount++
    else if (label === 'negative') negativeCount++
    else if (label === 'neutral') neutralCount++
  }

  const total = votesWithSentiment.length
  breakdown.positive = total > 0 ? (positiveCount / total) * 100 : 0
  breakdown.neutral = total > 0 ? (neutralCount / total) * 100 : 0
  breakdown.negative = total > 0 ? (negativeCount / total) * 100 : 0

  return {
    avgSentiment,
    avgLabel,
    breakdown,
  }
}

/**
 * Calculates comment-related statistics from votes.
 *
 * @param votes - Array of votes
 * @returns Object containing total comments, downvotes, and comment rate percentage
 */
export function calculateCommentStats(votes: Vote[]): {
  totalComments: number
  totalDownvotes: number
  commentRate: number
} {
  if (votes.length === 0) {
    return {
      totalComments: 0,
      totalDownvotes: 0,
      commentRate: 0,
    }
  }

  const totalComments = votes.filter(v => v.comment !== '').length
  const totalDownvotes = votes.filter(v => v.pointsAssigned < 0).length
  const commentRate = (totalComments / votes.length) * 100

  return {
    totalComments,
    totalDownvotes,
    commentRate,
  }
}

/**
 * Formats a date range into a human-readable duration string.
 *
 * Examples:
 * - "45 days"
 * - "3 months, 12 days"
 * - "2 years, 5 months"
 * - "N/A" (if null)
 *
 * @param dateRange - Object with earliest and latest dates, or null
 * @returns Human-readable duration string
 */
export function formatDuration(dateRange: { earliest: Date; latest: Date } | null): string {
  if (!dateRange) return 'N/A'

  const { earliest, latest } = dateRange
  const diffMs = latest.getTime() - earliest.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 60) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`
  }

  const diffMonths = Math.floor(diffDays / 30)
  const remainingDays = diffDays % 30

  if (diffMonths < 24) {
    if (remainingDays > 0) {
      return `${diffMonths} month${diffMonths === 1 ? '' : 's'}, ${remainingDays} day${remainingDays === 1 ? '' : 's'}`
    }
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'}`
  }

  const diffYears = Math.floor(diffMonths / 12)
  const remainingMonths = diffMonths % 12

  if (remainingMonths > 0) {
    return `${diffYears} year${diffYears === 1 ? '' : 's'}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
  }
  return `${diffYears} year${diffYears === 1 ? '' : 's'}`
}

/**
 * Finds the round with the closest competition (lowest standard deviation of points).
 *
 * @param performancesByRound - Map of round IDs to arrays of performances in that round
 * @returns Round name and closeness score, or null if no rounds
 */
export function findClosestRound(
  performancesByRound: Map<RoundId, RoundPerformance[]>
): RoundStat | null {
  if (performancesByRound.size === 0) return null

  let closestRound: RoundStat | null = null
  let minStdDev = Infinity

  for (const performances of performancesByRound.values()) {
    const points = performances.map(perf => perf.pointsReceived)
    const stddev = calculateStandardDeviation(points)

    if (stddev > 0 && stddev < minStdDev && performances[0]) {
      minStdDev = stddev
      closestRound = {
        name: performances[0].roundName,
        value: stddev,
      }
    }
  }

  return closestRound
}

/**
 * Calculates the number of unique artists across all submissions.
 *
 * @param submissions - Array of all submissions
 * @returns Count of unique artists
 */
export function calculateUniqueArtists(submissions: Submission[]): number {
  const artistSet = new Set<string>()

  for (const submission of submissions) {
    for (const artist of submission.artists) {
      artistSet.add(artist.toLowerCase().trim())
    }
  }

  return artistSet.size
}

/**
 * Finds the song with the highest sum of comment sentiment scores.
 *
 * @param votes - Array of all votes
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @param rounds - Map of round IDs to round data
 * @returns Song with highest sentiment sum, or null if no votes with sentiment
 */
export function findMostPositiveSong(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>,
  rounds: Map<RoundId, { name: string }>
): SongStat | null {
  const sentimentByUri = new Map<string, number>()

  for (const vote of votes) {
    if (vote.sentimentScore !== undefined && vote.sentimentScore !== null) {
      const current = sentimentByUri.get(vote.spotifyUri) || 0
      sentimentByUri.set(vote.spotifyUri, current + vote.sentimentScore)
    }
  }

  if (sentimentByUri.size === 0) return null

  let maxSentiment = -Infinity
  let bestUri = ''

  for (const [uri, sentiment] of sentimentByUri) {
    if (sentiment > maxSentiment) {
      maxSentiment = sentiment
      bestUri = uri
    }
  }

  const submission = submissions.find(s => s.spotifyUri === bestUri)
  if (!submission) return null

  const submitter = competitors.get(submission.submitterId)
  const round = rounds.get(submission.roundId)

  return {
    title: submission.title,
    artists: submission.artists.join(', '),
    submitter: submitter?.name || 'Unknown',
    roundName: round?.name || 'Unknown',
    value: maxSentiment,
  }
}

/**
 * Finds the song with the lowest sum of comment sentiment scores (if negative).
 *
 * @param votes - Array of all votes
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @param rounds - Map of round IDs to round data
 * @returns Song with lowest sentiment sum if negative, or null
 */
export function findMostNegativeSong(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>,
  rounds: Map<RoundId, { name: string }>
): SongStat | null {
  const sentimentByUri = new Map<string, number>()

  for (const vote of votes) {
    if (vote.sentimentScore !== undefined && vote.sentimentScore !== null) {
      const current = sentimentByUri.get(vote.spotifyUri) || 0
      sentimentByUri.set(vote.spotifyUri, current + vote.sentimentScore)
    }
  }

  if (sentimentByUri.size === 0) return null

  let minSentiment = Infinity
  let worstUri = ''

  for (const [uri, sentiment] of sentimentByUri) {
    if (sentiment < minSentiment) {
      minSentiment = sentiment
      worstUri = uri
    }
  }

  // Only return if sentiment is negative
  if (minSentiment >= 0) return null

  const submission = submissions.find(s => s.spotifyUri === worstUri)
  if (!submission) return null

  const submitter = competitors.get(submission.submitterId)
  const round = rounds.get(submission.roundId)

  return {
    title: submission.title,
    artists: submission.artists.join(', '),
    submitter: submitter?.name || 'Unknown',
    roundName: round?.name || 'Unknown',
    value: minSentiment,
  }
}

/**
 * Finds the song with the highest total points received.
 *
 * @param votes - Array of all votes
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @param rounds - Map of round IDs to round data
 * @returns Song with highest score, or null if no votes
 */
export function findHighestScoredSong(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>,
  rounds: Map<RoundId, { name: string }>
): SongStat | null {
  const pointsByUri = new Map<string, number>()

  for (const vote of votes) {
    const current = pointsByUri.get(vote.spotifyUri) || 0
    pointsByUri.set(vote.spotifyUri, current + vote.pointsAssigned)
  }

  if (pointsByUri.size === 0) return null

  let maxPoints = -Infinity
  let bestUri = ''

  for (const [uri, points] of pointsByUri) {
    if (points > maxPoints) {
      maxPoints = points
      bestUri = uri
    }
  }

  const submission = submissions.find(s => s.spotifyUri === bestUri)
  if (!submission) return null

  const submitter = competitors.get(submission.submitterId)
  const round = rounds.get(submission.roundId)

  return {
    title: submission.title,
    artists: submission.artists.join(', '),
    submitter: submitter?.name || 'Unknown',
    roundName: round?.name || 'Unknown',
    value: maxPoints,
  }
}

/**
 * Finds the song with the lowest total points received.
 *
 * @param votes - Array of all votes
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @param rounds - Map of round IDs to round data
 * @returns Song with lowest score, or null if no votes
 */
export function findLowestScoredSong(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>,
  rounds: Map<RoundId, { name: string }>
): SongStat | null {
  const pointsByUri = new Map<string, number>()

  for (const vote of votes) {
    const current = pointsByUri.get(vote.spotifyUri) || 0
    pointsByUri.set(vote.spotifyUri, current + vote.pointsAssigned)
  }

  if (pointsByUri.size === 0) return null

  let minPoints = Infinity
  let worstUri = ''

  for (const [uri, points] of pointsByUri) {
    if (points < minPoints) {
      minPoints = points
      worstUri = uri
    }
  }

  const submission = submissions.find(s => s.spotifyUri === worstUri)
  if (!submission) return null

  const submitter = competitors.get(submission.submitterId)
  const round = rounds.get(submission.roundId)

  return {
    title: submission.title,
    artists: submission.artists.join(', '),
    submitter: submitter?.name || 'Unknown',
    roundName: round?.name || 'Unknown',
    value: minPoints,
  }
}

/**
 * Finds the song with the most unique voters.
 *
 * @param votes - Array of all votes (should exclude zero-point votes)
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @param rounds - Map of round IDs to round data
 * @returns Song with most unique voters, or null if no votes
 */
export function findMostUniqueVotersSong(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>,
  rounds: Map<RoundId, { name: string }>
): SongStat | null {
  const votersByUri = new Map<string, Set<string>>()

  for (const vote of votes) {
    if (!votersByUri.has(vote.spotifyUri)) {
      votersByUri.set(vote.spotifyUri, new Set())
    }
    votersByUri.get(vote.spotifyUri)!.add(vote.voterId)
  }

  if (votersByUri.size === 0) return null

  let maxVoters = 0
  let bestUri = ''

  for (const [uri, voters] of votersByUri) {
    if (voters.size > maxVoters) {
      maxVoters = voters.size
      bestUri = uri
    }
  }

  const submission = submissions.find(s => s.spotifyUri === bestUri)
  if (!submission) return null

  const submitter = competitors.get(submission.submitterId)
  const round = rounds.get(submission.roundId)

  return {
    title: submission.title,
    artists: submission.artists.join(', '),
    submitter: submitter?.name || 'Unknown',
    roundName: round?.name || 'Unknown',
    value: maxVoters,
  }
}

/**
 * Finds the artist that has been submitted the most times.
 *
 * @param submissions - Array of all submissions
 * @returns Artist with most submissions, or null if no submissions
 */
export function findMostSubmittedArtist(submissions: Submission[]): ArtistStat | null {
  if (submissions.length === 0) return null

  const countByArtist = new Map<string, number>()

  for (const submission of submissions) {
    for (const artist of submission.artists) {
      const normalized = artist.toLowerCase().trim()
      const current = countByArtist.get(normalized) || 0
      countByArtist.set(normalized, current + 1)
    }
  }

  if (countByArtist.size === 0) return null

  let maxCount = 0
  let topArtist = ''

  for (const [artist, count] of countByArtist) {
    if (count > maxCount) {
      maxCount = count
      topArtist = artist
    }
  }

  // Find the original casing from submissions
  const originalArtist =
    submissions.flatMap(s => s.artists).find(a => a.toLowerCase().trim() === topArtist) || topArtist

  return {
    name: originalArtist,
    count: maxCount,
  }
}

/**
 * Finds the competitor who leaves the most positive comments on average.
 *
 * @param votes - Array of all votes
 * @param competitors - Map of competitor IDs to competitor data
 * @returns Competitor with highest average sentiment, or null if no sentiment data
 */
export function findMostPositiveCommenter(
  votes: Vote[],
  competitors: Map<string, Competitor>
): CompetitorStat | null {
  const sentimentByVoter = new Map<string, { sum: number; count: number }>()

  for (const vote of votes) {
    if (vote.sentimentScore !== undefined && vote.sentimentScore !== null) {
      const current = sentimentByVoter.get(vote.voterId) || { sum: 0, count: 0 }
      current.sum += vote.sentimentScore
      current.count += 1
      sentimentByVoter.set(vote.voterId, current)
    }
  }

  if (sentimentByVoter.size === 0) return null

  let maxAvg = -Infinity
  let topVoterId = ''

  for (const [voterId, { sum, count }] of sentimentByVoter) {
    const avg = sum / count
    if (avg > maxAvg) {
      maxAvg = avg
      topVoterId = voterId
    }
  }

  const competitor = competitors.get(topVoterId)

  return {
    name: competitor?.name || 'Unknown',
    value: maxAvg,
  }
}

/**
 * Finds the competitor who leaves the most negative comments on average.
 *
 * @param votes - Array of all votes
 * @param competitors - Map of competitor IDs to competitor data
 * @returns Competitor with lowest average sentiment, or null if no sentiment data
 */
export function findMostNegativeCommenter(
  votes: Vote[],
  competitors: Map<string, Competitor>
): CompetitorStat | null {
  const sentimentByVoter = new Map<string, { sum: number; count: number }>()

  for (const vote of votes) {
    if (vote.sentimentScore !== undefined && vote.sentimentScore !== null) {
      const current = sentimentByVoter.get(vote.voterId) || { sum: 0, count: 0 }
      current.sum += vote.sentimentScore
      current.count += 1
      sentimentByVoter.set(vote.voterId, current)
    }
  }

  if (sentimentByVoter.size === 0) return null

  let minAvg = Infinity
  let bottomVoterId = ''

  for (const [voterId, { sum, count }] of sentimentByVoter) {
    const avg = sum / count
    if (avg < minAvg) {
      minAvg = avg
      bottomVoterId = voterId
    }
  }

  const competitor = competitors.get(bottomVoterId)

  return {
    name: competitor?.name || 'Unknown',
    value: minAvg,
  }
}

/**
 * Finds the submitter whose tracks received the highest total sentiment from comments.
 *
 * @param votes - Array of all votes
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @returns Submitter with highest sentiment sum, or null if no sentiment data
 */
export function findMostLovedSubmitter(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>
): CompetitorStat | null {
  const sentimentBySubmitter = new Map<string, number>()

  for (const vote of votes) {
    if (vote.sentimentScore !== undefined && vote.sentimentScore !== null) {
      const submission = submissions.find(s => s.spotifyUri === vote.spotifyUri)
      if (submission) {
        const current = sentimentBySubmitter.get(submission.submitterId) || 0
        sentimentBySubmitter.set(submission.submitterId, current + vote.sentimentScore)
      }
    }
  }

  if (sentimentBySubmitter.size === 0) return null

  let maxSentiment = -Infinity
  let topSubmitterId = ''

  for (const [submitterId, sentiment] of sentimentBySubmitter) {
    if (sentiment > maxSentiment) {
      maxSentiment = sentiment
      topSubmitterId = submitterId
    }
  }

  const competitor = competitors.get(topSubmitterId)

  return {
    name: competitor?.name || 'Unknown',
    value: maxSentiment,
  }
}

/**
 * Finds the submitter whose tracks received the lowest total sentiment from comments (if negative).
 *
 * @param votes - Array of all votes
 * @param submissions - Array of all submissions
 * @param competitors - Map of competitor IDs to competitor data
 * @returns Submitter with lowest sentiment sum if negative, or null
 */
export function findMostHatedSubmitter(
  votes: Vote[],
  submissions: Submission[],
  competitors: Map<string, Competitor>
): CompetitorStat | null {
  const sentimentBySubmitter = new Map<string, number>()

  for (const vote of votes) {
    if (vote.sentimentScore !== undefined && vote.sentimentScore !== null) {
      const submission = submissions.find(s => s.spotifyUri === vote.spotifyUri)
      if (submission) {
        const current = sentimentBySubmitter.get(submission.submitterId) || 0
        sentimentBySubmitter.set(submission.submitterId, current + vote.sentimentScore)
      }
    }
  }

  if (sentimentBySubmitter.size === 0) return null

  let minSentiment = Infinity
  let bottomSubmitterId = ''

  for (const [submitterId, sentiment] of sentimentBySubmitter) {
    if (sentiment < minSentiment) {
      minSentiment = sentiment
      bottomSubmitterId = submitterId
    }
  }

  // Only return if sentiment is negative
  if (minSentiment >= 0) return null

  const competitor = competitors.get(bottomSubmitterId)

  return {
    name: competitor?.name || 'Unknown',
    value: minSentiment,
  }
}
