import { useMemo, useState, useEffect } from 'react'
import { useTableSort } from '@/hooks/common/useTableSort'
import { DataTable, Column } from '@/components/common/DataTable'
import { useRounds } from '@/hooks/useMusicLeague/useRounds'
import { Round } from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import { Tooltip } from '@/components/common'
import { getSentimentClass } from '@/utils/musicLeague/sentimentAnalysis'
import './RoundsView.scss'

export interface RoundsViewProps {
  searchQuery?: string
}

export function RoundsView({ searchQuery = '' }: RoundsViewProps) {
  const { activeProfileId } = useProfileContext()
  const [data, setData] = useState<Round[]>([])

  const { rounds, loading: roundsLoading, error: roundsError } = useRounds(true)

  useEffect(() => {
    if (rounds) {
      setData(rounds)
    }
  }, [rounds])

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    const lowerQuery = searchQuery.toLowerCase()
    return data.filter(
      item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery))
    )
  }, [data, searchQuery])

  const columns: Column<Round>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Round Name',
        accessor: row => (
          <div className="rounds-view__name">
            <a
              href={row.playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounds-view__name-link"
              onClick={e => e.stopPropagation()}
            >
              {row.name}
            </a>
          </div>
        ),
        sortable: true,
        className: 'rounds-view__col-name',
      },
      {
        id: 'description',
        header: 'Description',
        accessor: row =>
          row.description && (
            <Tooltip content={row.description}>
              <div className="rounds-view__description">{row.description}</div>
            </Tooltip>
          ),
        className: 'rounds-view__col-desc',
      },
      {
        id: 'startDate',
        header: 'Started',
        accessor: row =>
          row.stats?.startDate
            ? row.stats.startDate.toLocaleDateString()
            : row.createdAt
              ? row.createdAt.toLocaleDateString()
              : '-',
        sortable: true,
        className: 'rounds-view__col-date',
      },
      {
        id: 'endDate',
        header: 'Ended',
        accessor: row => (row.stats?.endDate ? row.stats.endDate.toLocaleDateString() : '-'),
        sortable: true,
        className: 'rounds-view__col-end-date',
        defaultHidden: true,
      },
      {
        id: 'winningSubmission',
        header: 'Winner',
        accessor: row =>
          row.stats?.winningSubmission ? (
            <div
              className="rounds-view__winner"
              title={`${row.stats.winningSubmission.title} by ${row.stats.winningSubmission.artist}`}
            >
              <span className="rounds-view__winner-title">{row.stats.winningSubmission.title}</span>
              <span className="rounds-view__winner-artist">
                {row.stats.winningSubmission.artist}
              </span>
            </div>
          ) : (
            '-'
          ),
        sortable: false,
        className: 'rounds-view__col-winner',
      },
      {
        id: 'maxPoints',
        header: 'Max Pts',
        accessor: row => row.stats?.maxPoints ?? '-',
        sortable: true,
        className: 'rounds-view__number',
      },
      {
        id: 'minPoints',
        header: 'Min Pts',
        accessor: row => row.stats?.minPoints ?? '-',
        sortable: true,
        className: 'rounds-view__number',
        defaultHidden: true,
      },
      {
        id: 'commentCount',
        header: 'Comments',
        accessor: row => row.stats?.commentCount ?? '-',
        sortable: true,
        className: 'rounds-view__number',
      },
      {
        id: 'avgSentiment',
        header: 'Avg Sent.',
        accessor: row => (
          <span
            className={`rounds-view__sentiment rounds-view__sentiment--${getSentimentClass(row.stats?.avgSentiment ?? 0)}`}
          >
            {row.stats?.avgSentiment?.toFixed(2) ?? '-'}
          </span>
        ),
        sortable: true,
        className: 'rounds-view__number',
      },
      {
        id: 'competitorCount',
        header: 'Competitors',
        accessor: row => row.stats?.competitorCount ?? '-',
        sortable: true,
        className: 'rounds-view__number',
      },
    ],
    []
  )

  const { sortedData, sortConfig, handleSort } = useTableSort({
    data: filteredData,
    initialSort: { key: 'startDate', direction: 'desc' },
    getSortValue: (item, key) => {
      // Helper to safely get value from row or stats
      const getValue = (target: Round, targetKey: string) => {
        if (targetKey in target) return target[targetKey as keyof Round]
        if (target.stats && targetKey in target.stats)
          return target.stats[targetKey as keyof typeof target.stats]
        return undefined
      }

      if (key === 'avgSentiment') return item.stats?.avgSentiment

      return getValue(item, key) as string | number | Date | null | undefined
    },
  })

  if (roundsError) {
    return <div className="p-8 text-center text-error">Error: {roundsError}</div>
  }

  if (!activeProfileId) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Please select a profile to view rounds.
      </div>
    )
  }

  return (
    <div className="rounds-view leaderboard-tab-view">
      <DataTable
        data={sortedData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        rowKey={row => row.id}
        storageKey="rounds-view-columns"
        emptyMessage="No rounds found."
        loading={roundsLoading}
        className="flex-1"
      />
    </div>
  )
}
