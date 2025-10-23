import type { Participant } from '@/types'

/**
 * Information about duplicate participant names
 */
export interface DuplicateInfo {
  value: string
  indices: number[]
  isExact: boolean
}

/**
 * Detect duplicate and near-duplicate participant names
 * Checks for exact duplicates and case-insensitive matches
 *
 * @param participants - Array of participant names to check
 * @returns Array of duplicate information objects
 */
export const detectDuplicates = (participants: Participant[]): DuplicateInfo[] => {
  const duplicates: Map<string, DuplicateInfo> = new Map()

  // Check for exact duplicates
  participants.forEach((p, i) => {
    const existing = duplicates.get(p)
    if (existing) {
      existing.indices.push(i)
    } else {
      const count = participants.filter(x => x === p).length
      if (count > 1) {
        duplicates.set(p, {
          value: p,
          indices: [i],
          isExact: true,
        })
      }
    }
  })

  // Check for near duplicates (case-insensitive, e.g. "Alice" vs "alice")
  const lowerMap: Map<string, { original: string; indices: number[] }> = new Map()
  participants.forEach((p, i) => {
    const lower = p.toLowerCase()
    const existing = lowerMap.get(lower)
    if (existing && existing.original !== p) {
      // Found case mismatch - only report if not already flagged as exact duplicate
      if (!duplicates.has(p) && !duplicates.has(existing.original)) {
        duplicates.set(lower, {
          value: `${existing.original} / ${p}`,
          indices: [...existing.indices, i],
          isExact: false,
        })
      }
    } else if (!existing) {
      lowerMap.set(lower, { original: p, indices: [i] })
    } else {
      existing.indices.push(i)
    }
  })

  return Array.from(duplicates.values())
}
