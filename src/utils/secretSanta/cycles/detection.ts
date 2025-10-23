import type { Pairing, Participant } from '@/types'

/**
 * Detect cycles in pairings graph
 * Each cycle represents a chain of gift-giving (A→B→C→A)
 *
 * Uses simple graph traversal: follow edges until revisiting a node.
 * Time complexity: O(n) where n is number of participants.
 *
 * @param pairings - Array of pairings forming a directed graph
 * @param participants - List of all participants
 * @returns Array of cycles, where each cycle is an array of participant indices
 */
export const detectCycles = (pairings: Pairing[], participants: Participant[]): number[][] => {
  const graph = new Map<Participant, Participant>()
  pairings.forEach(p => graph.set(p.from, p.to))

  const cycles: number[][] = []
  const visited = new Set<Participant>()
  const participantIndex = new Map(participants.map((p, i) => [p, i]))

  // Follow each participant's chain until returning to start or hitting visited node
  participants.forEach(start => {
    if (visited.has(start)) return

    const cycle: number[] = []
    let current: Participant | undefined = start

    while (current && !visited.has(current)) {
      visited.add(current)
      const idx = participantIndex.get(current)
      if (idx !== undefined) cycle.push(idx)
      current = graph.get(current)
    }

    if (cycle.length > 0) {
      cycles.push(cycle)
    }
  })

  return cycles
}
