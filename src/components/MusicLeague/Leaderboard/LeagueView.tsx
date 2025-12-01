import { useMemo, useState, useEffect } from 'react'
import { DataTable, Column, SortConfig } from '@/components/common/DataTable'
import { getAllProfiles } from '@/services/database/profiles'
import { getLeagueStatistics, LeagueStatistics } from '@/services/database/analytics'
import { Profile } from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import { formatDuration } from '@/utils/musicLeague/leaderboard'
import { getSentimentClass } from '@/utils/musicLeague/sentimentAnalysis'
import './LeagueView.scss'

type LeagueData = Profile &
  LeagueStatistics & {
    dateRange: { earliest: Date; latest: Date } | null
  }

export interface LeagueViewProps {
  searchQuery?: string
}

export function LeagueView({ searchQuery = '' }: LeagueViewProps) {
  const { activeProfileId, setActiveProfile } = useProfileContext()
  const [data, setData] = useState<LeagueData[]>([])
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

        const enrichedProfiles = await Promise.all(
          profiles.map(async profile => {
            try {
              const stats = await getLeagueStatistics(profile.id)
              return {
                ...profile,
                ...stats,
                dateRange:
                  stats.startDate && stats.endDate
                    ? {
                        earliest: stats.startDate,
                        latest: stats.endDate,
                      }
                    : null,
              }
            } catch (e) {
              console.error(`Failed to load stats for profile ${profile.id}`, e)
              return {
                ...profile,
                totalRounds: 0,
                totalCompetitors: 0,
                totalSubmissions: 0,
                totalVotes: 0,
                totalComments: 0,
                totalDownvotes: 0,
                uniqueWinners: 0,
                uniqueArtists: 0,
                avgParticipation: 0,
                avgPointSpread: 0,
                commentRate: 0,
                sentiment: {
                  average: 0,
                  polarization: 0,
                  positivePercent: 0,
                  neutralPercent: 0,
                  negativePercent: 0,
                },
                startDate: null,
                endDate: null,
                lengthInDays: 0,
                dateRange: null,
              } as LeagueData
            }
          })
        )

        setData(enrichedProfiles)
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

  const columns: Column<LeagueData>[] = useMemo(
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
        accessor: row => row.totalRounds,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'totalCompetitors',
        header: 'Competitors',
        accessor: row => row.totalCompetitors,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'uniqueWinners',
        header: 'Winners',
        accessor: row => row.uniqueWinners,
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Number of unique winners',
        defaultHidden: true,
      },
      {
        id: 'avgParticipation',
        header: 'Avg Partic.',
        accessor: row =>
          row.totalRounds > 0 ? (row.totalSubmissions / row.totalRounds).toFixed(1) : '0.0',
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Average submissions per round',
        defaultHidden: true,
      },
      {
        id: 'startDate',
        header: 'Started',
        accessor: row => (row.dateRange ? row.dateRange.earliest.toLocaleDateString() : '-'),
        sortable: true,
        className: 'league-view__col-date',
      },
      {
        id: 'endDate',
        header: 'Ended',
        accessor: row => (row.dateRange ? row.dateRange.latest.toLocaleDateString() : '-'),
        sortable: true,
        className: 'league-view__col-date',
        defaultHidden: true,
      },
      {
        id: 'lengthInDays',
        header: 'Length',
        accessor: row => formatDuration(row.dateRange),
        sortable: true,
        className: 'league-view__col-duration',
      },
      {
        id: 'totalSubmissions',
        header: 'Submissions',
        accessor: row => row.totalSubmissions,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'totalVotes',
        header: 'Votes',
        accessor: row => row.totalVotes,
        sortable: true,
        className: 'league-view__number',
      },
      {
        id: 'totalComments',
        header: 'Comments',
        accessor: row => row.totalComments,
        sortable: true,
        className: 'league-view__number',
        defaultHidden: true,
      },
      {
        id: 'commentRate',
        header: 'Cmnt Rate',
        accessor: row => `${(row.commentRate * 100).toFixed(1)}%`,
        sortable: true,
        className: 'league-view__number',
        tooltip: 'Comment rate',
      },
      {
        id: 'totalDownvotes',
        header: 'Downvotes',
        accessor: row => row.totalDownvotes,
        sortable: true,
        className: 'league-view__number',
        defaultHidden: true,
      },
      {
        id: 'avgSentiment',
        header: 'Avg Sent.',
        accessor: row => (
          <span
            className={`league-view__metric league-view__metric--${getSentimentClass(row.sentiment.average)}`}
          >
            {row.sentiment.average.toFixed(2)}
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
      type ComparableValue = string | number | Date | null | undefined

      let aValue: ComparableValue = a[sortConfig.key as keyof LeagueData] as ComparableValue
      let bValue: ComparableValue = b[sortConfig.key as keyof LeagueData] as ComparableValue

      // Handle special sort cases
      if (sortConfig.key === 'startDate') {
        aValue = a.dateRange?.earliest
        bValue = b.dateRange?.earliest
      } else if (sortConfig.key === 'endDate') {
        aValue = a.dateRange?.latest
        bValue = b.dateRange?.latest
      } else if (sortConfig.key === 'lengthInDays') {
        aValue = a.lengthInDays
        bValue = b.lengthInDays
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
