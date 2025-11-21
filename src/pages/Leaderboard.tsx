import { useEffect, useState, useMemo, useCallback } from 'react'
import { LeaderboardTable } from '@/components/MusicLeague/Leaderboard/LeaderboardTable'
import { MetricCard } from '@/components/MusicLeague/Leaderboard/MetricCard'
import { CollapsibleMetrics } from '@/components/MusicLeague/Leaderboard/CollapsibleMetrics'
import { useLeaderboard } from '@/hooks/useMusicLeague/useLeaderboard'
import { usePageHeader } from '@/hooks/usePageHeader'
import {
  formatDuration,
  formatSongStat,
  createSongTooltip,
  createCompetitorTooltip,
  createArtistTooltip,
  formatSentimentBreakdown,
} from '@/utils/musicLeague/leaderboard'
import {
  DEFAULT_LEADERBOARD_FILTERS,
  type LeaderboardFilters,
  type SortableColumn,
  type LeaderboardEntry,
} from '@/types/leaderboard'
import './Leaderboard.scss'

// Default sort directions per column (first click)
const DEFAULT_SORT_DIRECTIONS: Record<SortableColumn, 'asc' | 'desc'> = {
  rank: 'asc',
  competitorName: 'asc',
  totalPoints: 'desc',
  winRate: 'desc',
  podiumRate: 'desc',
  averagePosition: 'asc',
  consistencyScore: 'asc',
  votesReceived: 'desc',
  avgVoteCast: 'desc',
  roundsParticipated: 'desc',
}

export const Leaderboard = () => {
  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_LEADERBOARD_FILTERS)
  const { rankings, statistics, isLoading, error } = useLeaderboard(filters)
  const { setPageTitle } = usePageHeader()

  const handleSortChange = useCallback((column: SortableColumn) => {
    setFilters(prev => {
      const isSameColumn = prev.sort.column === column
      // Toggle direction if same column, otherwise use smart default
      const newDirection = isSameColumn
        ? prev.sort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : DEFAULT_SORT_DIRECTIONS[column]

      return {
        ...prev,
        sort: { column, direction: newDirection },
      }
    })
  }, [])

  // Sort rankings by the selected column
  const sortedRankings = useMemo(() => {
    if (!rankings.length) return rankings

    const { column, direction } = filters.sort

    return [...rankings].sort((a, b) => {
      const aValue = a[column as keyof LeaderboardEntry]
      const bValue = b[column as keyof LeaderboardEntry]

      let comparison = 0

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      }

      // Apply direction
      if (direction === 'desc') {
        comparison = -comparison
      }

      // Stable sort: use name as secondary sort
      if (comparison === 0) {
        return a.competitorName.localeCompare(b.competitorName)
      }

      return comparison
    })
  }, [rankings, filters.sort])

  useEffect(() => {
    setPageTitle('Leaderboard')
    return () => setPageTitle(null)
  }, [setPageTitle])

  return (
    <div className="leaderboard">
      {error && (
        <div className="leaderboard__error" role="alert" aria-live="assertive">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading ? (
        <div className="leaderboard__loading" role="status" aria-live="polite" aria-busy="true">
          <p>Loading leaderboard data...</p>
        </div>
      ) : (
        <>
          <CollapsibleMetrics
            storageKey="leaderboard-metrics-collapsed"
            primaryMetrics={
              <>
                <MetricCard label="Total Rounds" value={statistics.totalRounds} />
                <MetricCard label="Active Competitors" value={statistics.totalCompetitors} />
                <MetricCard label="League Duration" value={formatDuration(statistics.dateRange)} />
                <MetricCard label="Total Votes" value={statistics.totalVotes} />
              </>
            }
            secondaryMetrics={
              <>
                {/* Competition & Participation */}
                <MetricCard
                  label="Unique Winners"
                  value={statistics.uniqueWinners}
                  tooltip="Number of different competitors who have won at least one round"
                />
                <MetricCard
                  label="Closest Round"
                  value={statistics.closestRound?.name || 'N/A'}
                  tooltip={
                    statistics.closestRound
                      ? `Most competitive round (closeness score: ${statistics.closestRound.value.toFixed(2)})`
                      : undefined
                  }
                />
                <MetricCard
                  label="Avg Points Spread"
                  value={statistics.avgPointsSpread.toFixed(1)}
                  tooltip="Average difference between highest and lowest scoring songs per round"
                />
                <MetricCard
                  label="Avg Participation"
                  value={statistics.avgCompetitorsPerRound.toFixed(1)}
                  tooltip="Average number of competitors per round"
                />

                {/* Content & Engagement */}
                <MetricCard label="Total Tracks" value={statistics.totalTracks} />
                <MetricCard label="Unique Artists" value={statistics.uniqueArtists} />
                <MetricCard label="Total Comments" value={statistics.totalComments} />
                <MetricCard label="Total Downvotes" value={statistics.totalDownvotes} />
                <MetricCard
                  label="Comment Rate"
                  value={`${statistics.commentRate.toFixed(1)}%`}
                  tooltip="Percentage of votes that included a comment"
                />

                {/* Sentiment Analysis */}
                <MetricCard
                  label="Avg Sentiment"
                  value={
                    statistics.avgCommentSentiment !== null
                      ? statistics.avgCommentSentiment.toFixed(2)
                      : 'N/A'
                  }
                  tooltip="Average sentiment score of all comments (-1 to +1 scale)"
                />
                <MetricCard
                  label="Sentiment Breakdown"
                  value={formatSentimentBreakdown(statistics.sentimentBreakdown)}
                  tooltip="Distribution of comment sentiments (+ positive, ~ neutral, - negative)"
                />

                {/* Polarization */}
                <MetricCard
                  label="Avg Polarization"
                  value={statistics.avgPolarization.toFixed(2)}
                  tooltip="Average variance in points received per song (higher = more divisive)"
                />
                <MetricCard
                  label="Most Polarizing Track"
                  value={
                    statistics.mostPolarizingTrack
                      ? `${statistics.mostPolarizingTrack.title} - ${statistics.mostPolarizingTrack.artists}`
                      : 'N/A'
                  }
                  tooltip={
                    statistics.mostPolarizingTrack
                      ? `Polarization score: ${statistics.mostPolarizingTrack.score.toFixed(2)}`
                      : undefined
                  }
                />

                {/* Top Songs - Sentiment */}
                <MetricCard
                  label="Most Positive Song"
                  value={formatSongStat(statistics.mostPositiveSong)}
                  tooltip={createSongTooltip(statistics.mostPositiveSong, 'Sentiment sum')}
                />
                <MetricCard
                  label="Most Negative Song"
                  value={formatSongStat(statistics.mostNegativeSong)}
                  tooltip={createSongTooltip(statistics.mostNegativeSong, 'Sentiment sum')}
                />

                {/* Top Songs - Points */}
                <MetricCard
                  label="Highest Scored Song"
                  value={formatSongStat(statistics.highestScoredSong)}
                  tooltip={createSongTooltip(statistics.highestScoredSong, 'Total points')}
                />
                <MetricCard
                  label="Lowest Scored Song"
                  value={formatSongStat(statistics.lowestScoredSong)}
                  tooltip={createSongTooltip(statistics.lowestScoredSong, 'Total points')}
                />

                {/* Top Songs - Engagement */}
                <MetricCard
                  label="Most Voted Song"
                  value={formatSongStat(statistics.mostUniqueVotersSong)}
                  tooltip={createSongTooltip(statistics.mostUniqueVotersSong, 'Unique voters')}
                />

                {/* Top Artists & Competitors */}
                <MetricCard
                  label="Most Submitted Artist"
                  value={statistics.mostSubmittedArtist?.name || 'N/A'}
                  tooltip={createArtistTooltip(statistics.mostSubmittedArtist)}
                />
                <MetricCard
                  label="Most Positive Commenter"
                  value={statistics.mostPositiveCommenter?.name || 'N/A'}
                  tooltip={createCompetitorTooltip(
                    statistics.mostPositiveCommenter,
                    'Avg sentiment'
                  )}
                />
                <MetricCard
                  label="Most Negative Commenter"
                  value={statistics.mostNegativeCommenter?.name || 'N/A'}
                  tooltip={createCompetitorTooltip(
                    statistics.mostNegativeCommenter,
                    'Avg sentiment'
                  )}
                />
                <MetricCard
                  label="Most Loved Submitter"
                  value={statistics.mostLovedSubmitter?.name || 'N/A'}
                  tooltip={createCompetitorTooltip(
                    statistics.mostLovedSubmitter,
                    'Total sentiment on tracks'
                  )}
                />
                <MetricCard
                  label="Most Hated Submitter"
                  value={statistics.mostHatedSubmitter?.name || 'N/A'}
                  tooltip={createCompetitorTooltip(
                    statistics.mostHatedSubmitter,
                    'Total sentiment on tracks'
                  )}
                />
              </>
            }
          />

          <div className="leaderboard__table-container">
            <LeaderboardTable
              rankings={sortedRankings}
              sortColumn={filters.sort.column}
              sortDirection={filters.sort.direction}
              onSortChange={handleSortChange}
            />
          </div>
        </>
      )}
    </div>
  )
}
