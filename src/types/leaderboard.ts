import type { CompetitorId, RoundId } from './musicLeague'

export enum RankingMetric {
  TotalPoints = 'totalPoints',
  WinRate = 'winRate',
  PodiumRate = 'podiumRate',
  AveragePosition = 'averagePosition',
  Consistency = 'consistency',
}

export const RANKING_METRIC_LABELS: Record<RankingMetric, string> = {
  [RankingMetric.TotalPoints]: 'Total Points',
  [RankingMetric.WinRate]: 'Win Rate',
  [RankingMetric.PodiumRate]: 'Podium Rate',
  [RankingMetric.AveragePosition]: 'Average Position',
  [RankingMetric.Consistency]: 'Consistency',
}

export interface TimeFilter {
  /** null = no limit */
  from: Date | null
  /** null = no limit */
  to: Date | null
  /** null = all rounds in date range */
  roundIds: RoundId[] | null
}

export interface CompetitorFilter {
  excludeIds: CompetitorId[]
  minParticipation: number
}

export type SortableColumn =
  | 'rank'
  | 'competitorName'
  | 'totalPoints'
  | 'winRate'
  | 'podiumRate'
  | 'averagePosition'
  | 'consistencyScore'
  | 'votesReceived'
  | 'avgVoteCast'
  | 'roundsParticipated'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: SortableColumn
  direction: SortDirection
}

export interface LeaderboardFilters {
  metric: RankingMetric
  time: TimeFilter
  competitors: CompetitorFilter
  sort: SortConfig
}

export const DEFAULT_LEADERBOARD_FILTERS: LeaderboardFilters = {
  metric: RankingMetric.TotalPoints,
  time: {
    from: null,
    to: null,
    roundIds: null,
  },
  competitors: {
    excludeIds: [],
    minParticipation: 1,
  },
  sort: {
    column: 'rank',
    direction: 'asc',
  },
}

export interface RoundPerformance {
  roundId: RoundId
  roundName: string
  roundDate: Date
  pointsReceived: number
  /** 1 = 1st place */
  position: number
  totalCompetitors: number
}

export interface LeaderboardEntry {
  competitorId: CompetitorId
  competitorName: string
  rank: number
  totalPoints: number
  winRate: number
  podiumRate: number
  averagePosition: number
  /** Lower = more consistent */
  consistencyScore: number
  roundsParticipated: number
  votesReceived: number
  avgVoteCast: number
  performances: RoundPerformance[]
}

// Helper types for statistics
export interface SongStat {
  title: string
  artists: string
  submitter: string
  roundName: string
  value: number // Generic value (points, sentiment sum, voter count, etc.)
}

export interface CompetitorStat {
  name: string
  value: number // Generic value (sentiment, count, etc.)
}

export interface ArtistStat {
  name: string
  count: number
}

export interface RoundStat {
  name: string
  value: number // Closeness score
}

export interface LeaderboardStatistics {
  // Primary Metrics (4 cards)
  totalRounds: number
  totalCompetitors: number
  dateRange: {
    earliest: Date
    latest: Date
  } | null
  totalVotes: number

  // Secondary Metrics
  uniqueWinners: number
  closestRound: RoundStat | null
  avgPointsSpread: number
  uniqueArtists: number

  totalComments: number
  avgCommentSentiment: number | null
  avgCommentSentimentLabel: 'positive' | 'neutral' | 'negative' | null
  totalDownvotes: number
  avgCompetitorsPerRound: number

  totalTracks: number
  avgPolarization: number
  mostPolarizingTrack: { title: string; artists: string; score: number } | null

  commentRate: number
  sentimentBreakdown: { positive: number; neutral: number; negative: number }

  // "Most Y X" Metrics
  mostPositiveSong: SongStat | null
  mostNegativeSong: SongStat | null
  highestScoredSong: SongStat | null
  lowestScoredSong: SongStat | null
  mostUniqueVotersSong: SongStat | null
  mostSubmittedArtist: ArtistStat | null
  mostPositiveCommenter: CompetitorStat | null
  mostNegativeCommenter: CompetitorStat | null
  mostLovedSubmitter: CompetitorStat | null
  mostHatedSubmitter: CompetitorStat | null
}

export interface UseLeaderboardResult {
  rankings: LeaderboardEntry[]
  statistics: LeaderboardStatistics
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}
