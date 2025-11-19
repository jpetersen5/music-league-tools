import { KeyboardEvent } from 'react'
import { Tooltip } from '@/components/common/Tooltip'
import type { SortableColumn, SortDirection } from '@/types/leaderboard'
import sortAscIcon from '/sort-asc.svg'
import sortDescIcon from '/sort-desc.svg'
import sortNeutralIcon from '/sort-neutral.svg'
import './SortableHeader.scss'

export interface SortableHeaderProps {
  column: SortableColumn
  label: string
  tooltip?: string
  currentColumn: SortableColumn
  currentDirection: SortDirection
  onSort: (column: SortableColumn) => void
  className?: string
}

export function SortableHeader({
  column,
  label,
  tooltip,
  currentColumn,
  currentDirection,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentColumn === column
  const direction = isActive ? currentDirection : null

  const handleClick = () => {
    onSort(column)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSort(column)
    }
  }

  const getSortIcon = () => {
    if (!isActive) return sortNeutralIcon
    return direction === 'asc' ? sortAscIcon : sortDescIcon
  }

  const getAriaSort = (): 'ascending' | 'descending' | 'none' => {
    if (!isActive) return 'none'
    return direction === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <th
      scope="col"
      className={`sortable-header ${className} ${isActive ? 'sortable-header--active' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
      aria-sort={getAriaSort()}
    >
      <span className="sortable-header__content">
        {tooltip ? <Tooltip content={tooltip}>{label}</Tooltip> : label}
        <img src={getSortIcon()} alt="" className="sortable-header__indicator" aria-hidden="true" />
      </span>
    </th>
  )
}
