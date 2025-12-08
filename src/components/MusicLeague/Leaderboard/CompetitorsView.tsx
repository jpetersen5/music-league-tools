import { useMemo, useState } from 'react'
import { useTableSort } from '@/hooks/common/useTableSort'
import { DataTable, Column } from '@/components/common/DataTable'
import { useLeaderboard } from '@/hooks/useMusicLeague/useLeaderboard'
import { LeaderboardEntry, RankingMetric } from '@/types/leaderboard'
import { useProfileContext } from '@/contexts/ProfileContext'
import { Tooltip } from '@/components/common/Tooltip'
import './CompetitorsView.scss'

export interface CompetitorsViewProps {
  searchQuery?: string
}

export function CompetitorsView({ searchQuery = '' }: CompetitorsViewProps) {
  const { activeProfileId } = useProfileContext()
  const [metric] = useState<RankingMetric>(RankingMetric.TotalPoints)

  const { rankings, isLoading, error } = useLeaderboard({
    metric,
    competitors: {
      minParticipation: 0,
      excludeIds: [],
    },
    time: {
      from: null,
      to: null,
      roundIds: null,
    },
    sort: {
      key: 'rank',
      direction: 'asc',
    },
  })

  const filteredData = useMemo(() => {
    if (!searchQuery) return rankings
    const lowerQuery = searchQuery.toLowerCase()
    return rankings.filter(item => item.competitorName.toLowerCase().includes(lowerQuery))
  }, [rankings, searchQuery])

  const columns: Column<LeaderboardEntry>[] = useMemo(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        accessor: row => (
          <span className={`competitors-view__rank competitors-view__rank--${row.rank}`}>
            #{row.rank}
          </span>
        ),
        sortable: true,
        className: 'competitors-view__col-rank',
      },
      {
        id: 'competitorName',
        header: 'Competitor',
        accessor: row => <div className="competitors-view__name">{row.competitorName}</div>,
        sortable: true,
        className: 'competitors-view__col-name',
      },
      {
        id: 'totalPoints',
        header: 'Points',
        accessor: row => (
          <span className="competitors-view__points-total">
            {row.totalPoints} (
            <span className="competitors-view__points-val--pos">+{row.positivePoints}</span>,{' '}
            <span className="competitors-view__points-val--neg">{row.negativePoints}</span>)
          </span>
        ),
        sortable: true,
        className: 'competitors-view__col-points',
      },
      {
        id: 'winRate',
        header: 'Win %',
        accessor: row => (
          <Tooltip content={`${row.firstPlaceCount} wins`}>
            <span>{row.winRate.toFixed(1)}%</span>
          </Tooltip>
        ),
        sortable: true,
        className: 'competitors-view__col-rate',
      },
      {
        id: 'podiumRate',
        header: 'Podium %',
        accessor: row => (
          <Tooltip content={`${row.podiumCount} podiums`}>
            <span>{row.podiumRate.toFixed(1)}%</span>
          </Tooltip>
        ),
        sortable: true,
        className: 'competitors-view__col-rate',
      },
      {
        id: 'averagePosition',
        header: 'Avg Pos',
        accessor: row => row.averagePosition.toFixed(1),
        sortable: true,
        className: 'competitors-view__col-stat',
      },
      {
        id: 'votesReceived',
        header: 'Votes',
        accessor: row => row.votesReceived,
        sortable: true,
        className: 'competitors-view__col-stat',
        tooltip: 'Total non-zero votes received',
      },
      {
        id: 'avgVoteCast',
        header: 'Avg Cast',
        accessor: row => row.avgVoteCast.toFixed(2),
        sortable: true,
        className: 'competitors-view__col-avg',
        tooltip: 'Average points given per vote',
      },
      {
        id: 'avgSubmissionScore',
        header: 'Avg Score',
        accessor: row =>
          row.roundsParticipated > 0
            ? (row.totalPoints / row.roundsParticipated).toFixed(2)
            : '0.00',
        sortable: true,
        className: 'competitors-view__col-avg',
        tooltip: 'Average points per submission',
      },
      {
        id: 'sentimentReceived',
        header: 'Sent. Rcv',
        accessor: row => row.sentimentReceived.average.toFixed(2),
        sortable: true,
        className: 'competitors-view__col-sentiment',
        tooltip: 'Average sentiment of comments received',
      },
      {
        id: 'sentimentGiven',
        header: 'Sent. Given',
        accessor: row => row.sentimentGiven.average.toFixed(2),
        sortable: true,
        className: 'competitors-view__col-sentiment',
        tooltip: 'Average sentiment of comments given',
      },
    ],
    []
  )

  const { sortedData, sortConfig, handleSort } = useTableSort({
    data: filteredData,
    initialSort: { key: 'rank', direction: 'asc' },
    getSortValue: (item, key) => {
      // Handle special sort cases
      if (key === 'sentimentReceived') return item.sentimentReceived.average
      if (key === 'sentimentGiven') return item.sentimentGiven.average
      if (key === 'avgSubmissionScore') {
        return item.roundsParticipated > 0 ? item.totalPoints / item.roundsParticipated : 0
      }

      return item[key as keyof LeaderboardEntry] as string | number | null | undefined
    },
  })

  if (error) {
    return <div className="p-8 text-center text-error">Error: {error}</div>
  }

  if (!activeProfileId) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Please select a profile to view competitors.
      </div>
    )
  }

  return (
    <div className="competitors-view leaderboard-tab-view">
      <DataTable
        data={sortedData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        rowKey={row => row.competitorId}
        emptyMessage="No competitors found."
        loading={isLoading}
        className="flex-1"
      />
    </div>
  )
}
