import { useMemo, useState, useEffect, useCallback } from 'react'
import { DataTable, Column, SortConfig } from '@/components/common/DataTable'
import { useSubmissions } from '@/hooks/useMusicLeague/useSubmissions'
import { useCompetitors } from '@/hooks/useMusicLeague/useCompetitors'
import { useRounds } from '@/hooks/useMusicLeague/useRounds'
import { getSubmissionStatistics, SubmissionStatistics } from '@/services/database/analytics'
import { Submission } from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import { Tooltip } from '@/components/common/Tooltip'
import './SubmissionsView.scss'

type SubmissionData = Submission &
  SubmissionStatistics & {
    submitterName: string
    roundName: string
  }

export interface SubmissionsViewProps {
  searchQuery?: string
}

export function SubmissionsView({ searchQuery = '' }: SubmissionsViewProps) {
  const { activeProfileId } = useProfileContext()
  const [data, setData] = useState<SubmissionData[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'createdAt',
    direction: 'desc',
  })

  const { submissions, loading: submissionsLoading, error: submissionsError } = useSubmissions({})
  const { competitors } = useCompetitors()
  const { rounds } = useRounds()

  useEffect(() => {
    const loadStats = async () => {
      if (!submissions || !activeProfileId) return

      try {
        setStatsLoading(true)

        // Create maps for quick lookups
        const competitorMap = new Map(competitors.map(c => [c.id, c.name]))
        const roundMap = new Map(rounds.map(r => [r.id, r.name]))

        const enrichedSubmissions = await Promise.all(
          submissions.map(async submission => {
            const stats = await getSubmissionStatistics(activeProfileId, submission.spotifyUri)
            return {
              ...submission,
              ...stats,
              submitterName: competitorMap.get(submission.submitterId) || 'Unknown',
              roundName: roundMap.get(submission.roundId) || 'Unknown',
            }
          })
        )
        setData(enrichedSubmissions)
      } catch (err) {
        console.error('Failed to load submission stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [submissions, activeProfileId, competitors, rounds])

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    const lowerQuery = searchQuery.toLowerCase()

    return data.filter(item => {
      return (
        item.title.toLowerCase().includes(lowerQuery) ||
        item.artists.some(a => a.toLowerCase().includes(lowerQuery)) ||
        item.submitterName.toLowerCase().includes(lowerQuery) ||
        item.roundName.toLowerCase().includes(lowerQuery) ||
        (item.comment && item.comment.toLowerCase().includes(lowerQuery))
      )
    })
  }, [data, searchQuery])

  const columns = useMemo<Column<SubmissionData>[]>(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        accessor: row => (
          <span className="submissions-view__rank">
            {row.rankInRound ? `#${row.rankInRound}` : '-'}
          </span>
        ),
        sortable: true,
        className: 'submissions-view__col-rank',
        defaultHidden: false,
      },
      {
        id: 'track',
        header: 'Track',
        accessor: row => (
          <div className="submissions-view__track" title={row.title}>
            <a
              href={`https://open.spotify.com/track/${row.spotifyUri.split(':')[2]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="submissions-view__track-title hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {row.title}
            </a>
            <span className="submissions-view__track-artist">{row.artists.join(', ')}</span>
          </div>
        ),
        sortable: true,
        className: 'submissions-view__col-track',
      },
      {
        id: 'round',
        header: 'Round',
        accessor: row => (
          <div className="submissions-view__round" title={row.roundName}>
            {row.roundName}
          </div>
        ),
        sortable: true,
        className: 'submissions-view__col-round',
      },
      {
        id: 'submitter',
        header: 'Submitter',
        accessor: row => <span className="submissions-view__submitter">{row.submitterName}</span>,
        sortable: true,
        className: 'submissions-view__col-submitter',
      },
      {
        id: 'points',
        header: 'Points',
        accessor: row => (
          <span className="submissions-view__points-total">
            {row.totalPoints} (
            <span className="submissions-view__points-val--pos">+{row.positivePoints}</span>,{' '}
            <span className="submissions-view__points-val--neg">{row.negativePoints}</span>)
          </span>
        ),
        sortable: true,
        className: 'submissions-view__col-points',
      },
      {
        id: 'avgVote',
        header: 'Avg Vote',
        accessor: row =>
          row.uniqueVoters > 0 ? (row.totalPoints / row.uniqueVoters).toFixed(1) : '-',
        sortable: true,
        className: 'submissions-view__col-avg-vote',
        tooltip: 'Average points per vote',
      },
      {
        id: 'avgSentiment',
        header: 'Avg Sentiment',
        accessor: row => (row.sentiment.average ? row.sentiment.average.toFixed(2) : '-'),
        sortable: true,
        className: 'submissions-view__col-sentiment',
        tooltip: 'Average sentiment score (-1 to +1)',
      },
      {
        id: 'comment',
        header: 'Comment',
        accessor: row =>
          row.comment ? (
            <Tooltip content={row.comment}>
              <div className="submissions-view__comment">{row.comment}</div>
            </Tooltip>
          ) : null,
        sortable: true,
        className: 'submissions-view__col-comment',
      },
      {
        id: 'createdAt',
        header: 'Date',
        accessor: row => (
          <span className="submissions-view__date">{row.createdAt.toLocaleDateString()}</span>
        ),
        sortable: true,
        className: 'submissions-view__col-date',
        defaultHidden: true,
      },
    ],
    []
  )

  const handleSort = useCallback((key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      // Handle special sort cases
      if (sortConfig.key === 'avgVote') {
        const aAvg = a.uniqueVoters > 0 ? a.totalPoints / a.uniqueVoters : 0
        const bAvg = b.uniqueVoters > 0 ? b.totalPoints / b.uniqueVoters : 0
        return sortConfig.direction === 'asc' ? aAvg - bAvg : bAvg - aAvg
      }

      if (sortConfig.key === 'avgSentiment') {
        const aSent = a.sentiment.average || 0
        const bSent = b.sentiment.average || 0
        return sortConfig.direction === 'asc' ? aSent - bSent : bSent - aSent
      }

      // Default sort
      const aValue = a[sortConfig.key as keyof SubmissionData]
      const bValue = b[sortConfig.key as keyof SubmissionData]

      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  if (submissionsError) {
    return <div className="p-8 text-center text-error">Error: {submissionsError}</div>
  }

  if (!activeProfileId) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Please select a profile to view submissions.
      </div>
    )
  }

  return (
    <div className="submissions-view leaderboard-tab-view">
      <DataTable
        data={sortedData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        rowKey={row => `${row.roundId}-${row.submitterId}-${row.spotifyUri}`}
        emptyMessage="No submissions found."
        loading={submissionsLoading || statsLoading}
        className="flex-1"
      />
    </div>
  )
}
