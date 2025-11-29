import { ReactNode, useState, useRef, useEffect } from 'react'
import { usePopoverPosition } from '@/hooks/usePopoverPosition'
import columnsIcon from '/columns.svg'
import './DataTable.scss'

export interface Column<T> {
  id: string
  header: string
  accessor: (row: T) => ReactNode
  sortable?: boolean
  className?: string
  hide?: boolean
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
}

export function DataTable<T>({
  data,
  columns,
  sortConfig,
  onSort,
  className = '',
  rowKey,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  // Initialize hidden columns from props
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(() => {
    const hidden = new Set<string>()
    columns.forEach(col => {
      if (col.hide) hidden.add(col.id)
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

  return (
    <div className={`data-table-wrapper ${className}`}>
      <div className="data-table-toolbar">
        <button
          ref={menuButtonRef}
          className={`data-table-toolbar__button ${isColumnMenuOpen ? 'data-table-toolbar__button--active' : ''}`}
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
              position: 'fixed', // Use fixed positioning for the popover
            }}
          >
            <div className="data-table-menu__header">Show/Hide Columns</div>
            <div className="data-table-menu__list">
              {columns.map(column => (
                <label key={column.id} className="data-table-menu__item">
                  <input
                    type="checkbox"
                    checked={!hiddenColumnIds.has(column.id)}
                    onChange={() => toggleColumn(column.id)}
                  />
                  <span className="data-table-menu__item-label">{column.header}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {visibleColumns.map(column => (
                <th
                  key={column.id}
                  className={`data-table__header ${column.className || ''} ${
                    column.sortable ? 'data-table__header--sortable' : ''
                  } ${sortConfig?.key === column.id ? `data-table__header--${sortConfig.direction}` : ''}`}
                  onClick={() => handleHeaderClick(column)}
                  role={column.sortable ? 'button' : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                >
                  <div className="data-table__header-content">
                    {column.header}
                    {column.sortable && sortConfig?.key === column.id && (
                      <span className="data-table__sort-indicator">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
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
