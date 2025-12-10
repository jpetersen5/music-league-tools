import { useEffect, useState } from 'react'
import {
  LeaderboardTabs,
  LeaderboardTabId,
  LeagueView,
  RoundsView,
  SubmissionsView,
  CompetitorsView,
  MetricCard,
  CollapsibleMetrics,
} from '@/components/MusicLeague/Leaderboard'
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
import { DEFAULT_LEADERBOARD_FILTERS, RankingMetric } from '@/types/leaderboard'
import './Leaderboard.scss'

export const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState<LeaderboardTabId>('league')
  const [searchQuery, setSearchQuery] = useState('')
  const { setPageTitle } = usePageHeader()

  // TODO: aggregate different metrics per tab
  const { statistics, isLoading, error } = useLeaderboard({
    ...DEFAULT_LEADERBOARD_FILTERS,
    metric: RankingMetric.TotalPoints,
  })

  useEffect(() => {
    setPageTitle('Leaderboard')
    return () => setPageTitle(null)
  }, [setPageTitle])

  const renderContent = () => {
    switch (activeTab) {
      case 'league':
        return <LeagueView searchQuery={searchQuery} />
      case 'rounds':
        return <RoundsView searchQuery={searchQuery} />
      case 'submissions':
        return <SubmissionsView searchQuery={searchQuery} />
      case 'competitors':
        return <CompetitorsView searchQuery={searchQuery} />
      default:
        return <LeagueView searchQuery={searchQuery} />
    }
  }

  return (
    <div className="leaderboard">
      {error && (
        <div className="leaderboard__error" role="alert" aria-live="assertive">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading ? (
        <div className="leaderboard__loading" role="status" aria-live="polite" aria-busy="true">
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <CollapsibleMetrics
            storageKey="leaderboard-metrics-collapsed"
            primaryMetrics={
              <>
                <MetricCard label="Total Rounds" value={statistics.totalRounds} />
                <MetricCard label="Total Competitors" value={statistics.totalCompetitors} />
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

          <LeaderboardTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSearch={setSearchQuery}
          >
            {renderContent()}
          </LeaderboardTabs>
        </>
      )}
    </div>
  )
}
