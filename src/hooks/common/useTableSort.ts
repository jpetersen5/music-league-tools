import { useState, useMemo, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: string
  direction: SortDirection
}

export interface UseTableSortOptions<T> {
  data: T[]
  initialSort: SortConfig
  /**
   * Optional callback to derive the value to sort by.
   * If not provided, it assumes simple property access.
   */
  getSortValue?: (item: T, key: string) => string | number | Date | null | undefined
}

export function useTableSort<T>({ data, initialSort, getSortValue }: UseTableSortOptions<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort)

  const handleSort = useCallback((key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const sortedData = useMemo(() => {
    if (!data) return []

    return [...data].sort((a, b) => {
      let aValue: string | number | Date | null | undefined
      let bValue: string | number | Date | null | undefined

      if (getSortValue) {
        aValue = getSortValue(a, sortConfig.key)
        bValue = getSortValue(b, sortConfig.key)
      } else {
        // Default behavior: simple property access
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        aValue = (a as any)[sortConfig.key]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bValue = (b as any)[sortConfig.key]
      }

      // Handle null/undefined - always at the bottom
      if (aValue === undefined || aValue === null || aValue === '') return 1
      if (bValue === undefined || bValue === null || bValue === '') return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig, getSortValue])

  return {
    sortedData,
    sortConfig,
    setSortConfig,
    handleSort,
  }
}
