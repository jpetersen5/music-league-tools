import { useMemo, useState, useEffect } from 'react'
import { DataTable, Column, SortConfig } from '@/components/common/DataTable'
import { useRounds } from '@/hooks/useMusicLeague/useRounds'
import { getRoundStatistics, RoundStatistics } from '@/services/database/analytics'
import { Round } from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import { Tooltip } from '@/components/common'
import { getSentimentClass } from '@/utils/musicLeague/sentimentAnalysis'
import './RoundsView.scss'

type RoundData = Round & RoundStatistics

export interface RoundsViewProps {
  searchQuery?: string
}

export function RoundsView({ searchQuery = '' }: RoundsViewProps) {
  const { activeProfileId } = useProfileContext()
  const [data, setData] = useState<RoundData[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'startDate',
    direction: 'desc',
  })

  const { rounds, loading: roundsLoading, error: roundsError } = useRounds(true)

  useEffect(() => {
    const loadStats = async () => {
      if (!rounds || !activeProfileId) return

      try {
        setStatsLoading(true)
        const enrichedRounds = await Promise.all(
          rounds.map(async round => {
            const stats = await getRoundStatistics(activeProfileId, round.id)
            return { ...round, ...stats }
          })
        )
        setData(enrichedRounds)
      } catch (err) {
        console.error('Failed to load round stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [rounds, activeProfileId])

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    const lowerQuery = searchQuery.toLowerCase()
    return data.filter(
      item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery))
    )
  }, [data, searchQuery])

  const columns: Column<RoundData>[] = useMemo(
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
        accessor: row => (row.startDate ? row.startDate.toLocaleDateString() : '-'),
        sortable: true,
        className: 'rounds-view__col-date',
      },
      {
        id: 'endDate',
        header: 'Ended',
        accessor: row => (row.endDate ? row.endDate.toLocaleDateString() : '-'),
        sortable: true,
        className: 'rounds-view__col-end-date',
        defaultHidden: true,
      },
      {
        id: 'winningSubmission',
        header: 'Winner',
        accessor: row =>
          row.winningSubmission ? (
            <div
              className="rounds-view__winner"
              title={`${row.winningSubmission.title} by ${row.winningSubmission.artist}`}
            >
              <span className="rounds-view__winner-title">{row.winningSubmission.title}</span>
              <span className="rounds-view__winner-artist">{row.winningSubmission.artist}</span>
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
        accessor: row => row.maxPoints,
        sortable: true,
        className: 'rounds-view__number',
      },
      {
        id: 'minPoints',
        header: 'Min Pts',
        accessor: row => row.minPoints,
        sortable: true,
        className: 'rounds-view__number',
        defaultHidden: true,
      },
      {
        id: 'commentCount',
        header: 'Comments',
        accessor: row => row.commentCount,
        sortable: true,
        className: 'rounds-view__number',
      },
      {
        id: 'avgSentiment',
        header: 'Avg Sent.',
        accessor: row => (
          <span
            className={`rounds-view__sentiment rounds-view__sentiment--${getSentimentClass(row.avgSentiment)}`}
          >
            {row.avgSentiment.toFixed(2)}
          </span>
        ),
        sortable: true,
        className: 'rounds-view__number',
      },
      {
        id: 'competitorCount',
        header: 'Competitors',
        accessor: row => row.competitorCount,
        sortable: true,
        className: 'rounds-view__number',
      },
    ],
    []
  )

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof RoundData]
      const bValue = b[sortConfig.key as keyof RoundData]

      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

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
        emptyMessage="No rounds found."
        loading={roundsLoading || statsLoading}
        className="flex-1"
      />
    </div>
  )
}
