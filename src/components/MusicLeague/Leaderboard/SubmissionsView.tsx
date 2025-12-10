import { useMemo, useState, useEffect } from 'react'
import { useTableSort } from '@/hooks/common/useTableSort'
import { DataTable, Column, RankCell, SentimentCell } from '@/components/common/DataTable'
import { useSubmissions } from '@/hooks/useMusicLeague/useSubmissions'
import { useCompetitors } from '@/hooks/useMusicLeague/useCompetitors'
import { useRounds } from '@/hooks/useMusicLeague/useRounds'
import { Submission } from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import { Tooltip } from '@/components/common/Tooltip'
import './SubmissionsView.scss'

type SubmissionData = Submission & {
  submitterName: string
  roundName: string
  roundPlaylistUrl?: string
  rankInRound?: number
  sentiment: {
    average: number
    polarization: number
  }
}

export interface SubmissionsViewProps {
  searchQuery?: string
}

export function SubmissionsView({ searchQuery = '' }: SubmissionsViewProps) {
  const { activeProfileId } = useProfileContext()
  const [data, setData] = useState<SubmissionData[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

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
        const roundUrlMap = new Map(rounds.map(r => [r.id, r.playlistUrl]))

        // Calculate ranks
        const submissionsByRound = new Map<string, typeof submissions>()
        submissions.forEach(s => {
          if (!submissionsByRound.has(s.roundId)) {
            submissionsByRound.set(s.roundId, [])
          }
          submissionsByRound.get(s.roundId)!.push(s)
        })

        const rankMap = new Map<string, number>()
        submissionsByRound.forEach(roundSubs => {
          // Sort by points descending
          roundSubs.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
          roundSubs.forEach((s, index) => {
            rankMap.set(s.spotifyUri, index + 1)
          })
        })

        const enrichedSubmissions = submissions.map(submission => {
          return {
            ...submission,
            positivePoints: submission.positivePoints ?? 0,
            negativePoints: submission.negativePoints ?? 0,
            uniqueVoters: submission.uniqueVoters ?? 0,
            commentCount: submission.commentCount ?? 0,
            averageSentiment: submission.averageSentiment ?? 0,
            polarizationScore: submission.polarizationScore ?? 0,

            sentiment: {
              average: submission.averageSentiment ?? 0,
              polarization: submission.polarizationScore ?? 0,
            },

            totalPoints: submission.totalPoints ?? 0,
            rankInRound: rankMap.get(submission.spotifyUri),
            submitterName: competitorMap.get(submission.submitterId) || 'Unknown',
            roundName: roundMap.get(submission.roundId) || 'Unknown',
            roundPlaylistUrl: roundUrlMap.get(submission.roundId),
          }
        })
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
        accessor: row => <RankCell rank={row.rankInRound} />,
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
              className="submissions-view__track-title"
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
        accessor: row => {
          return (
            <div className="submissions-view__round" title={row.roundName}>
              {row.roundPlaylistUrl ? (
                <a
                  href={row.roundPlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="submissions-view__round-link"
                  onClick={e => e.stopPropagation()}
                >
                  {row.roundName}
                </a>
              ) : (
                row.roundName
              )}
            </div>
          )
        },
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
        accessor: row => {
          const uniqueVoters = row.uniqueVoters || 0
          const totalPoints = row.totalPoints || 0
          return uniqueVoters > 0 ? (totalPoints / uniqueVoters).toFixed(1) : '-'
        },
        sortable: true,
        className: 'submissions-view__col-avg-vote',
        tooltip: 'Average points per vote',
      },
      {
        id: 'avgSentiment',
        header: 'Avg Sentiment',
        accessor: row => <SentimentCell value={row.sentiment.average} />,
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

  const { sortedData, sortConfig, handleSort } = useTableSort({
    data: filteredData,
    initialSort: { key: 'createdAt', direction: 'desc' },
    getSortValue: (item, key) => {
      // Map column IDs to data properties
      switch (key) {
        case 'rank':
          return item.rankInRound
        case 'track':
          return item.title
        case 'round':
          return item.roundName
        case 'submitter':
          return item.submitterName
        case 'points':
          return item.totalPoints
        case 'avgVote': {
          const voters = item.uniqueVoters || 0
          const points = item.totalPoints || 0
          return voters > 0 ? points / voters : 0
        }
        case 'avgSentiment':
          return item.sentiment.average || 0
        default:
          return item[key as keyof SubmissionData] as string | number | Date | null | undefined
      }
    },
  })

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
        rowKey={row => `${row.roundId}-${row.spotifyUri}`}
        emptyMessage="No submissions found."
        loading={submissionsLoading || statsLoading}
        className="flex-1"
        storageKey="submissions-view-columns"
      />
    </div>
  )
}
