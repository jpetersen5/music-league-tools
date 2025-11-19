import { RankBadge } from './RankBadge'
import { SortableHeader } from './SortableHeader'
import type { LeaderboardEntry, SortableColumn, SortDirection } from '@/types/leaderboard'
import {
  formatPoints,
  formatPercentage,
  formatPosition,
  formatConsistency,
} from '@/utils/musicLeague/leaderboard/calculations'
import './LeaderboardTable.scss'

export interface LeaderboardTableProps {
  rankings: LeaderboardEntry[]
  sortColumn: SortableColumn
  sortDirection: SortDirection
  onSortChange: (column: SortableColumn) => void
}

export function LeaderboardTable({
  rankings,
  sortColumn,
  sortDirection,
  onSortChange,
}: LeaderboardTableProps) {
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
              <SortableHeader
                column="rank"
                label="Rank"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--rank"
              />
              <SortableHeader
                column="competitorName"
                label="Competitor"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--name"
              />
              <SortableHeader
                column="totalPoints"
                label="Points"
                tooltip="Total points earned from votes on submissions"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="winRate"
                label="Win Rate"
                tooltip="Percentage of rounds won (1st place)"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="podiumRate"
                label="Podium %"
                tooltip="Percentage of rounds finishing in top 3"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="averagePosition"
                label="Avg Pos"
                tooltip="Average finishing position across all rounds"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="consistencyScore"
                label="Consistency"
                tooltip="Standard deviation of positions (lower = more consistent performance)"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="votesReceived"
                label="Votes Rcvd"
                tooltip="Total number of votes received on this competitor's submissions"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="avgVoteCast"
                label="Avg Vote"
                tooltip="Average points per vote cast by this competitor"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
              <SortableHeader
                column="roundsParticipated"
                label="Rounds"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSortChange}
                className="leaderboard-table__header leaderboard-table__header--number"
              />
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
