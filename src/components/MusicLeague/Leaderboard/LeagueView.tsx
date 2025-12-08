import { useMemo, useState, useEffect } from 'react'
import { DataTable, Column, SortConfig } from '@/components/common/DataTable'
import { getAllProfiles } from '@/services/database/profiles'
import { Profile } from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import { formatDuration } from '@/utils/musicLeague/leaderboard'
import { getSentimentClass } from '@/utils/musicLeague/sentimentAnalysis'
import './LeagueView.scss'

export interface LeagueViewProps {
  searchQuery?: string
}

export function LeagueView({ searchQuery = '' }: LeagueViewProps) {
  const { activeProfileId, setActiveProfile } = useProfileContext()
  const [data, setData] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'updatedAt',
    direction: 'desc',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const profiles = await getAllProfiles(true)
        setData(profiles)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leagues')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    const lowerQuery = searchQuery.toLowerCase()
    return data.filter(item => item.name.toLowerCase().includes(lowerQuery))
  }, [data, searchQuery])

  const columns: Column<Profile>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'League Name',
        accessor: row => (
          <span className="league-view__name">
            <a
              href="#"
              className="league-view__name-link"
              onClick={e => {
                e.preventDefault()
                setActiveProfile(row.id)
              }}
            >
              <span className="league-view__name">{row.name}</span>
            </a>
          </span>
        ),
        sortable: true,
        className: 'league-view__col-name',
      },
      {
        id: 'id',
        header: 'ID',
        accessor: row => <span className="league-view__name-id">{row.id}</span>,
        sortable: true,
        className: 'league-view__col-id',
        defaultHidden: true,
      },
      {
        id: 'totalRounds',
        header: 'Rounds',
        accessor: row => row.stats?.totalRounds ?? row.roundCount,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'totalCompetitors',
        header: 'Competitors',
        accessor: row => row.stats?.totalCompetitors ?? row.competitors.total,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'uniqueWinners',
        header: 'Winners',
        accessor: row => row.stats?.uniqueWinners ?? '-',
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Number of unique winners',
        defaultHidden: true,
      },
      {
        id: 'avgParticipation',
        header: 'Avg Partic.',
        accessor: row =>
          row.stats?.avgParticipation ? (row.stats.avgParticipation * 100).toFixed(1) + '%' : '-',
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Average submissions per round',
        defaultHidden: true,
      },
      {
        id: 'startDate',
        header: 'Started',
        accessor: row => (row.stats?.startDate ? row.stats.startDate.toLocaleDateString() : '-'),
        sortable: true,
        className: 'league-view__col-date',
      },
      {
        id: 'endDate',
        header: 'Ended',
        accessor: row => (row.stats?.endDate ? row.stats.endDate.toLocaleDateString() : '-'),
        sortable: true,
        className: 'league-view__col-date',
        defaultHidden: true,
      },
      {
        id: 'lengthInDays',
        header: 'Length',
        accessor: row =>
          row.stats?.startDate && row.stats?.endDate
            ? formatDuration({ earliest: row.stats.startDate, latest: row.stats.endDate })
            : '-',
        sortable: true,
        className: 'league-view__col-duration',
      },
      {
        id: 'totalSubmissions',
        header: 'Submissions',
        accessor: row => row.stats?.totalSubmissions ?? row.submissionCount,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'totalVotes',
        header: 'Votes',
        accessor: row => row.stats?.totalVotes ?? row.voteCount,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'totalComments',
        header: 'Comments',
        accessor: row => row.stats?.totalComments ?? '-',
        sortable: true,
        className: 'league-view__number',
        defaultHidden: true,
      },
      {
        id: 'commentRate',
        header: 'Cmnt Rate',
        accessor: row =>
          row.stats?.commentRate ? `${(row.stats.commentRate * 100).toFixed(1)}%` : '-',
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Comment rate',
      },
      {
        id: 'totalDownvotes',
        header: 'Downvotes',
        accessor: row => row.stats?.totalDownvotes ?? '-',
        sortable: true,
        className: 'league-view__number',
        defaultHidden: true,
      },
      {
        id: 'avgSentiment',
        header: 'Avg Sent.',
        accessor: row => (
          <span
            className={`league-view__metric league-view__metric--${getSentimentClass(
              row.stats?.sentiment?.average ?? 0
            )}`}
          >
            {row.stats?.sentiment?.average?.toFixed(2) ?? '-'}
          </span>
        ),
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Average sentiment',
      },
      {
        id: 'actions',
        header: '',
        accessor: row => (
          <button
            onClick={e => {
              e.stopPropagation()
              setActiveProfile(row.id)
            }}
            disabled={row.id === activeProfileId}
            className={`league-view__action-btn ${
              row.id === activeProfileId ? 'league-view__action-btn--active' : ''
            }`}
          >
            {row.id === activeProfileId ? 'Active' : 'Select'}
          </button>
        ),
        className: 'league-view__col-actions',
      },
    ],
    [activeProfileId, setActiveProfile]
  )

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      // Helper to safely get value from row or stats
      const getValue = (item: Profile, key: string) => {
        if (key in item) return item[key as keyof Profile]
        if (item.stats && key in item.stats) return item.stats[key as keyof typeof item.stats]
        return undefined
      }

      let aValue = getValue(a, sortConfig.key) as string | number | Date | null | undefined
      let bValue = getValue(b, sortConfig.key) as string | number | Date | null | undefined

      // Handle special sort cases
      if (sortConfig.key === 'startDate') {
        aValue = a.stats?.startDate
        bValue = b.stats?.startDate
      } else if (sortConfig.key === 'endDate') {
        aValue = a.stats?.endDate
        bValue = b.stats?.endDate
      } else if (sortConfig.key === 'lengthInDays') {
        aValue = a.stats?.lengthInDays
        bValue = b.stats?.lengthInDays
      }

      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  if (error) {
    return <div className="p-8 text-center text-error">Error: {error}</div>
  }

  return (
    <div className="league-view leaderboard-tab-view">
      <DataTable
        data={sortedData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        rowKey={row => row.id}
        emptyMessage="No leagues found."
        loading={loading}
        className="flex-1"
      />
    </div>
  )
}
