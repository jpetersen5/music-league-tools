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

export interface LeaderboardStatistics {
  totalRounds: number
  totalCompetitors: number
  dateRange: {
    earliest: Date
    latest: Date
  } | null
  totalVotes: number
}

export interface UseLeaderboardResult {
  rankings: LeaderboardEntry[]
  statistics: LeaderboardStatistics
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}
