import { ReactNode, useState, useRef, useEffect } from 'react'
import { usePopoverPosition } from '@/hooks/usePopoverPosition'
import { Tooltip } from '@/components/common/Tooltip'
import columnsIcon from '/columns.svg'
import sortAscIcon from '/sort-asc.svg'
import sortDescIcon from '/sort-desc.svg'
import sortNeutralIcon from '/sort-neutral.svg'
import './DataTable.scss'

export interface Column<T> {
  id: string
  header: string
  accessor: (row: T) => ReactNode
  sortable?: boolean
  className?: string
  defaultHidden?: boolean
  tooltip?: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: string
  direction: SortDirection
}

export interface DataTableProps<T> {
  data: readonly T[]
  columns: readonly Column<T>[]
  sortConfig?: SortConfig
  onSort?: (key: string) => void
  className?: string
  rowKey: (row: T) => string
  emptyMessage?: string
  loading?: boolean
}

export function DataTable<T>({
  data,
  columns,
  sortConfig,
  onSort,
  className = '',
  rowKey,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  // Initialize hidden columns from props
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(() => {
    const hidden = new Set<string>()
    columns.forEach(col => {
      if (col.defaultHidden) hidden.add(col.id)
    })
    return hidden
  })

  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuPosition = usePopoverPosition({
    isOpen: isColumnMenuOpen,
    anchorRef: menuButtonRef,
    popoverWidth: 200,
    popoverHeight: 300,
  })

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsColumnMenuOpen(false)
      }
    }

    if (isColumnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isColumnMenuOpen])

  const toggleColumn = (columnId: string) => {
    setHiddenColumnIds(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const visibleColumns = columns.filter(col => !hiddenColumnIds.has(col.id))

  const handleHeaderClick = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.id)
    }
  }

  // Skeleton loading rows
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <tr key={`skeleton-${index}`} className="data-table__row">
        {visibleColumns.map(column => (
          <td
            key={`skeleton-${index}-${column.id}`}
            className={`data-table__cell ${column.className || ''}`}
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          </td>
        ))}
      </tr>
    ))
  }

  const getSortIcon = (columnId: string) => {
    if (sortConfig?.key !== columnId) return sortNeutralIcon
    return sortConfig.direction === 'asc' ? sortAscIcon : sortDescIcon
  }

  return (
    <div className={`data-table ${className}`}>
      {/* Column toggle button positioned absolutely in the header area via CSS */}
      <button
        ref={menuButtonRef}
        className={`data-table__column-toggle ${isColumnMenuOpen ? 'data-table__column-toggle--active' : ''}`}
        onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
        aria-label="Toggle columns"
        aria-expanded={isColumnMenuOpen}
        title="Show/Hide Columns"
      >
        <img src={columnsIcon} alt="" width="16" height="16" />
      </button>

      {isColumnMenuOpen && (
        <div
          ref={menuRef}
          className="data-table-menu"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            position: 'fixed',
          }}
        >
          <div className="data-table-menu__title">Show/Hide Columns</div>
          <div className="data-table-menu__list">
            {columns.map(column => (
              <label key={column.id} className="data-table-menu__item">
                <input
                  type="checkbox"
                  checked={!hiddenColumnIds.has(column.id)}
                  onChange={() => toggleColumn(column.id)}
                />
                <span className="ml-2">{column.header}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="data-table__scroll">
        <table className="data-table__table">
          <thead className="data-table__head">
            <tr>
              {visibleColumns.map(column => {
                const isSorted = sortConfig?.key === column.id
                return (
                  <th
                    key={column.id}
                    className={`${column.className || ''}`}
                    onClick={() => handleHeaderClick(column)}
                    style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                  >
                    <div className="data-table__header-content">
                      {column.tooltip ? (
                        <Tooltip content={column.tooltip}>{column.header}</Tooltip>
                      ) : (
                        column.header
                      )}
                      {column.sortable && (
                        <img
                          src={getSortIcon(column.id)}
                          alt=""
                          className={`data-table__sort-icon ${isSorted ? 'data-table__sort-icon--active' : ''}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="data-table__body">
            {loading ? (
              renderSkeletonRows()
            ) : data.length > 0 ? (
              data.map(row => (
                <tr key={rowKey(row)} className="data-table__row">
                  {visibleColumns.map(column => (
                    <td
                      key={`${rowKey(row)}-${column.id}`}
                      className={`data-table__cell ${column.className || ''}`}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length} className="data-table__empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
