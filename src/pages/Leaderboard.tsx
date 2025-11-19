import { useEffect, useState, useMemo, useCallback } from 'react'
import { LeaderboardTable } from '@/components/MusicLeague/Leaderboard/LeaderboardTable'
import { MetricCard } from '@/components/MusicLeague/Leaderboard/MetricCard'
import { CollapsibleMetrics } from '@/components/MusicLeague/Leaderboard/CollapsibleMetrics'
import { useLeaderboard } from '@/hooks/useMusicLeague/useLeaderboard'
import { usePageHeader } from '@/hooks/usePageHeader'
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

  const dateRangeText = statistics.dateRange
    ? `${statistics.dateRange.earliest.toLocaleDateString()} - ${statistics.dateRange.latest.toLocaleDateString()}`
    : 'No data'

  return (
    <div className="leaderboard">
      {error && (
        <div className="leaderboard__error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading ? (
        <div className="leaderboard__loading">
          <p>Loading leaderboard data...</p>
        </div>
      ) : (
        <>
          <CollapsibleMetrics storageKey="leaderboard-metrics-collapsed">
            <MetricCard label="Total Rounds" value={statistics.totalRounds} />
            <MetricCard label="Total Competitors" value={statistics.totalCompetitors} />
            <MetricCard label="Date Range" value={dateRangeText} />
            <MetricCard label="Total Votes" value={statistics.totalVotes} />
          </CollapsibleMetrics>

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
