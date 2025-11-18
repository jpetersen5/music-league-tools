import { useEffect } from 'react'
import { LeaderboardTable } from '@/components/MusicLeague/Leaderboard/LeaderboardTable'
import { MetricCard } from '@/components/MusicLeague/Leaderboard/MetricCard'
import { CollapsibleMetrics } from '@/components/MusicLeague/Leaderboard/CollapsibleMetrics'
import { useLeaderboard } from '@/hooks/useMusicLeague/useLeaderboard'
import { usePageHeader } from '@/hooks/usePageHeader'
import { DEFAULT_LEADERBOARD_FILTERS } from '@/types/leaderboard'
import './Leaderboard.scss'

export const Leaderboard = () => {
  const filters = DEFAULT_LEADERBOARD_FILTERS
  const { rankings, statistics, isLoading, error } = useLeaderboard(filters)
  const { setPageTitle } = usePageHeader()

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
            <LeaderboardTable rankings={rankings} />
          </div>
        </>
      )}
    </div>
  )
}
