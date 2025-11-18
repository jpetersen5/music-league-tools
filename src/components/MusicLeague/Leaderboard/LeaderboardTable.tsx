import { RankBadge } from './RankBadge'
import { Tooltip } from '@/components/common/Tooltip'
import type { LeaderboardEntry } from '@/types/leaderboard'
import {
  formatPoints,
  formatPercentage,
  formatPosition,
  formatConsistency,
} from '@/utils/musicLeague/leaderboard/calculations'
import './LeaderboardTable.scss'

export interface LeaderboardTableProps {
  rankings: LeaderboardEntry[]
}

export function LeaderboardTable({ rankings }: LeaderboardTableProps) {
  if (rankings.length === 0) {
    return (
      <div className="leaderboard-table">
        <div className="leaderboard-table__empty">
          <p>No competitors found matching the current filters.</p>
          <p className="leaderboard-table__empty-hint">
            Try adjusting your filters or uploading a profile to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-table">
      <div className="leaderboard-table__scroll">
        <table className="leaderboard-table__table">
          <thead className="leaderboard-table__head">
            <tr>
              <th scope="col" className="leaderboard-table__header leaderboard-table__header--rank">
                Rank
              </th>
              <th scope="col" className="leaderboard-table__header leaderboard-table__header--name">
                Competitor
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Total points earned from votes on submissions">Points</Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Percentage of rounds won (1st place)">Win Rate</Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Percentage of rounds finishing in top 3">Podium %</Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Average finishing position across all rounds">Avg Pos</Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Standard deviation of positions (lower = more consistent performance)">
                  Consistency
                </Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Total number of votes received on this competitor's submissions">
                  Votes Rcvd
                </Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                <Tooltip content="Average points per vote cast by this competitor">
                  Avg Vote
                </Tooltip>
              </th>
              <th
                scope="col"
                className="leaderboard-table__header leaderboard-table__header--number"
              >
                Rounds
              </th>
            </tr>
          </thead>
          <tbody className="leaderboard-table__body">
            {rankings.map(entry => (
              <tr key={entry.competitorId} className="leaderboard-table__row">
                <td className="leaderboard-table__cell leaderboard-table__cell--rank">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--name">
                  {entry.competitorName}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {formatPoints(entry.totalPoints)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {formatPercentage(entry.winRate)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {formatPercentage(entry.podiumRate)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {formatPosition(entry.averagePosition)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {formatConsistency(entry.consistencyScore)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {entry.votesReceived}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {entry.avgVoteCast.toFixed(1)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--number">
                  {entry.roundsParticipated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
