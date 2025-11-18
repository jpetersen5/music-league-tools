import type { RoundPerformance } from '@/types/leaderboard'

const PODIUM_THRESHOLD = 3

export function calculateTotalPoints(performances: RoundPerformance[]): number {
  return performances.reduce((sum, perf) => sum + perf.pointsReceived, 0)
}

export function calculateWinRate(performances: RoundPerformance[]): number {
  if (performances.length === 0) return 0
  const wins = performances.filter(perf => perf.position === 1).length
  return (wins / performances.length) * 100
}

export function calculatePodiumRate(performances: RoundPerformance[]): number {
  if (performances.length === 0) return 0
  const podiumFinishes = performances.filter(perf => perf.position <= PODIUM_THRESHOLD).length
  return (podiumFinishes / performances.length) * 100
}

export function calculateAveragePosition(performances: RoundPerformance[]): number {
  if (performances.length === 0) return 0
  const totalPosition = performances.reduce((sum, perf) => sum + perf.position, 0)
  return totalPosition / performances.length
}

/**
 * Lower score = more consistent performance.
 * Returns 0 if < 2 performances (need multiple data points for std dev).
 */
export function calculateConsistency(performances: RoundPerformance[]): number {
  if (performances.length < 2) return 0

  const positions = performances.map(perf => perf.position)
  const mean = calculateAveragePosition(performances)

  const squaredDifferences = positions.map(pos => Math.pow(pos - mean, 2))
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / positions.length

  return Math.sqrt(variance)
}

/**
 * Handles ties by assigning the same rank and skipping subsequent ranks.
 * Example: If two competitors tie for 2nd, both get rank 2, next gets rank 4.
 */
export function assignRanks<T extends Record<string, unknown>>(
  entries: T[],
  metricGetter: (entry: T) => number,
  ascending = false
): (T & { rank: number })[] {
  if (entries.length === 0) return []

  const sorted = [...entries].sort((a, b) => {
    const aValue = metricGetter(a)
    const bValue = metricGetter(b)
    return ascending ? aValue - bValue : bValue - aValue
  })

  let currentRank = 1
  const ranked = sorted.map((entry, index) => {
    if (index > 0) {
      const prevValue = metricGetter(sorted[index - 1]!)
      const currValue = metricGetter(entry)

      if (prevValue !== currValue) {
        currentRank = index + 1
      }
    }

    return {
      ...entry,
      rank: currentRank,
    }
  })

  return ranked
}

export function calculateAvgPointsPerRound(allPerformances: RoundPerformance[]): number {
  if (allPerformances.length === 0) return 0

  const roundTotals = new Map<string, number>()

  for (const perf of allPerformances) {
    const current = roundTotals.get(perf.roundId) || 0
    roundTotals.set(perf.roundId, current + perf.pointsReceived)
  }

  const totalPoints = Array.from(roundTotals.values()).reduce((sum, points) => sum + points, 0)
  const numRounds = roundTotals.size

  return numRounds > 0 ? totalPoints / numRounds : 0
}

export function getDateRange(
  allPerformances: RoundPerformance[]
): { earliest: Date; latest: Date } | null {
  if (allPerformances.length === 0) return null

  const dates = allPerformances.map(perf => perf.roundDate.getTime())
  const earliest = new Date(Math.min(...dates))
  const latest = new Date(Math.max(...dates))

  return { earliest, latest }
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatPosition(position: number, decimals = 1): string {
  return position.toFixed(decimals)
}

/** Returns "N/A" if score is 0 (insufficient data for standard deviation) */
export function formatConsistency(score: number, decimals = 2): string {
  if (score === 0) return 'N/A'
  return score.toFixed(decimals)
}

export function formatPoints(points: number): string {
  return points.toLocaleString()
}
