import {
  Round,
  RoundStats,
  LeagueStats,
  Submission,
  Vote,
  Competitor,
  RoundId,
} from '@/types/musicLeague'
import {
  calculateStandardDeviation,
  calculateUniqueArtists,
  calculateAvgPointsSpread,
} from '@/utils/musicLeague/leaderboard/calculations'

/**
 * Calculate statistics for a single round
 *
 * @param submissions - All submissions in this round
 * @param votes - All votes in this round
 */
export function calculateRoundStats(submissions: Submission[], votes: Vote[]): RoundStats {
  const competitorCount = new Set(submissions.map(s => s.submitterId)).size
  const submissionCount = submissions.length
  const voteCount = votes.length

  const comments = votes.filter(v => v.comment && v.comment.trim().length > 0)
  const commentCount = comments.length

  // Date Logic: Earliest submission to latest vote
  const dates = [...submissions.map(s => s.createdAt), ...votes.map(v => v.createdAt)].sort(
    (a, b) => a.getTime() - b.getTime()
  )

  const startDate = dates.length > 0 ? dates[0] : null
  const endDate = dates.length > 0 ? dates[dates.length - 1] : null

  // Points & Winner
  let maxPoints = -Infinity
  let minPoints = Infinity
  let winningSubmission: RoundStats['winningSubmission'] = null

  if (submissions.length > 0) {
    const scores = submissions.map(s => s.totalPoints || 0)
    maxPoints = scores.length > 0 ? Math.max(...scores) : 0
    minPoints = scores.length > 0 ? Math.min(...scores) : 0

    const winners = submissions.filter(s => (s.totalPoints || 0) === maxPoints)
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
    const scores = comments.map(v => {
      if ('sentimentScore' in v && typeof v.sentimentScore === 'number') {
        return v.sentimentScore
      }
      if (
        'sentiment' in v &&
        v.sentiment &&
        typeof v.sentiment === 'object' &&
        'comparative' in v.sentiment
      ) {
        return (v.sentiment as { comparative: number }).comparative
      }
      return 0
    })

    const totalScore = scores.reduce((sum, s) => sum + s, 0)
    avgSentiment = totalScore / commentCount

    sentimentCounts.positive = scores.filter(s => s > 0.05).length
    sentimentCounts.neutral = scores.filter(s => s >= -0.05 && s <= 0.05).length
    sentimentCounts.negative = scores.filter(s => s < -0.05).length
    sentimentCounts.polarization = calculateStandardDeviation(scores)
  }

  return {
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
}

/**
 * Calculate statistics for a league (profile)
 *
 * @param rounds - All rounds in the league (should have stats already calculated)
 * @param submissions - All submissions in the league
 * @param votes - All votes in the league
 * @param competitors - All competitors in the league
 */
export function calculateLeagueStats(
  rounds: Round[],
  submissions: Submission[],
  votes: Vote[],
  competitors: Competitor[]
): LeagueStats {
  const totalRounds = rounds.length
  const totalCompetitors = competitors.length
  const totalSubmissions = submissions.length
  const totalVotes = votes.length

  const comments = votes.filter(v => v.comment && v.comment.trim().length > 0)
  const totalComments = comments.length
  const totalDownvotes = votes.filter(v => v.pointsAssigned < 0).length
  const commentRate = votes.length > 0 ? totalComments / votes.length : 0

  // Date Range
  // Use dates from Round Stats if available, otherwise fallback to created dates
  const startDates = rounds.map(r => r.stats?.startDate || r.createdAt)
  const endDates = rounds.map(r => r.stats?.endDate || r.createdAt)

  // Also consider loose submissions/votes if round stats missing?
  // Safest to just rely on what we have.
  const allDates = [...startDates, ...endDates].sort((a, b) => a.getTime() - b.getTime())

  const startDate = allDates.length > 0 ? allDates[0] : null
  const endDate = allDates.length > 0 ? allDates[allDates.length - 1] : null

  const lengthInDays =
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

  // Participation
  const roundParticipation: number[] = []
  const performancesByRound = new Map<RoundId, { pointsReceived: number }[]>()

  for (const round of rounds) {
    const rSubs = submissions.filter(s => s.roundId === round.id)
    if (rSubs.length === 0) continue

    roundParticipation.push(rSubs.length / (totalCompetitors || 1))

    const perfs = rSubs.map(s => ({ pointsReceived: s.totalPoints || 0 }))
    performancesByRound.set(round.id, perfs)
  }

  const avgParticipation =
    roundParticipation.length > 0
      ? roundParticipation.reduce((a, b) => a + b, 0) / roundParticipation.length
      : 0

  const avgPointSpread = calculateAvgPointsSpread(performancesByRound)

  // Unique Winners
  const uniqueWinners = new Set<string>()
  for (const round of rounds) {
    if (round.stats?.winningSubmission) {
      uniqueWinners.add(round.stats.winningSubmission.submitterId)
    }
  }

  // Sentiment
  const sentScores = comments.map(v => {
    if ('sentimentScore' in v && typeof v.sentimentScore === 'number') {
      return v.sentimentScore
    }
    if (
      'sentiment' in v &&
      v.sentiment &&
      typeof v.sentiment === 'object' &&
      'comparative' in v.sentiment
    ) {
      return (v.sentiment as { comparative: number }).comparative
    }
    return 0
  })
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

  return {
    totalRounds,
    totalCompetitors,
    totalSubmissions,
    totalVotes,
    totalComments,
    totalDownvotes,
    uniqueWinners: uniqueWinners.size,
    uniqueArtists: calculateUniqueArtists(submissions),
    startDate: startDate ?? null,
    endDate: endDate ?? null,
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
}
