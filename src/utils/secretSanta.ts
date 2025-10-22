import type {
  Participant,
  Pairing,
  Constraint,
  GenerationSettings,
  GenerationResult,
  SeparatorType,
  CycleOperator,
} from '@/types'

export interface DuplicateInfo {
  value: string
  indices: number[]
  isExact: boolean
}

export const parseParticipants = (
  input: string,
  separatorType: SeparatorType,
  customSeparator?: string
): Participant[] => {
  if (!input.trim()) return []

  let separator: RegExp | string

  switch (separatorType) {
    case 'newline':
      separator = /\r?\n/
      break
    case 'comma':
      separator = ','
      break
    case 'custom':
      separator = customSeparator || ','
      break
  }

  return input
    .split(separator)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

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

  // Check for near duplicates (case-insensitive)
  const lowerMap: Map<string, { original: string; indices: number[] }> = new Map()
  participants.forEach((p, i) => {
    const lower = p.toLowerCase()
    const existing = lowerMap.get(lower)
    if (existing && existing.original !== p) {
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

export const validateConstraints = (
  constraints: Constraint[],
  participants: Participant[]
): Constraint[] => {
  return constraints.filter(c => participants.includes(c.from) && participants.includes(c.to))
}

export const findInvalidConstraints = (
  constraints: Constraint[],
  participants: Participant[]
): Constraint[] => {
  return constraints.filter(c => !participants.includes(c.from) || !participants.includes(c.to))
}

// shuffle with Fisher-Yates algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]!
    result[i] = result[j]!
    result[j] = temp
  }
  return result
}

// Hamiltonian cycle is a cycle that visits each participant exactly once
export const generateHamiltonianCycle = (
  participants: Participant[],
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  maxAttempts = 1000
): GenerationResult => {
  const banned = new Set(bannedPairings.map(p => `${p.from}->${p.to}`))
  const forcedNext = new Map<Participant, Participant>()
  const forcedPrev = new Map<Participant, Participant>()

  forcedPairings.forEach(fp => {
    forcedNext.set(fp.from, fp.to)
    forcedPrev.set(fp.to, fp.from)
  })

  // Build forced chains (these stay constant across attempts)
  const chains: Participant[][] = []
  const visited = new Set<Participant>()

  participants.forEach(start => {
    if (visited.has(start)) return
    if (forcedPrev.has(start) && !visited.has(forcedPrev.get(start)!)) return

    const chain: Participant[] = []
    let current: Participant | undefined = start

    while (current && !visited.has(current)) {
      chain.push(current)
      visited.add(current)
      current = forcedNext.get(current)
    }

    if (chain.length > 0) {
      chains.push(chain)
    }
  })

  let bestPairings: Pairing[] = []
  let bestBannedCount = Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffle chains to try different orderings
    const shuffledChains = shuffleArray([...chains])

    const pairings: Pairing[] = []

    // Add forced edges within chains
    shuffledChains.forEach(chain => {
      for (let i = 0; i < chain.length - 1; i++) {
        pairings.push({ from: chain[i]!, to: chain[i + 1]! })
      }
    })

    // Connect chain tails to next chain heads to complete the cycle
    for (let i = 0; i < shuffledChains.length; i++) {
      const currentChain = shuffledChains[i]!
      const nextChain = shuffledChains[(i + 1) % shuffledChains.length]!
      const from = currentChain[currentChain.length - 1]!
      const to = nextChain[0]!

      pairings.push({ from, to })
    }

    // Count banned pairings
    const bannedCount = pairings.filter(p => banned.has(`${p.from}->${p.to}`)).length

    // Check for perfect solution
    if (bannedCount === 0) {
      return {
        pairings,
        success: true,
        attempts: attempt + 1,
      }
    }

    // Track best attempt
    if (bannedCount < bestBannedCount) {
      bestBannedCount = bannedCount
      bestPairings = pairings
    }
  }

  let warning = `Could not avoid all banned pairings after ${maxAttempts} attempts. Showing best attempt.`
  if (bestBannedCount > 0) {
    warning += ` ${bestBannedCount} banned pairing(s) included.`
  }

  // Return best attempt (may include some banned pairings)
  return {
    pairings: bestPairings,
    success: false,
    attempts: maxAttempts,
    warning: warning,
  }
}

export const detectCycles = (pairings: Pairing[], participants: Participant[]): number[][] => {
  const graph = new Map<Participant, Participant>()
  pairings.forEach(p => graph.set(p.from, p.to))

  const cycles: number[][] = []
  const visited = new Set<Participant>()
  const participantIndex = new Map(participants.map((p, i) => [p, i]))

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

// Check if pairings violate cycle size constraint based on operator
export const violatesCycleConstraint = (
  pairings: Pairing[],
  participants: Participant[],
  cycleSize: number,
  operator: CycleOperator
): boolean => {
  const cycles = detectCycles(pairings, participants)

  switch (operator) {
    case 'greater':
      // Violates if any cycle is <= cycleSize
      return cycles.some(cycle => cycle.length > 1 && cycle.length <= cycleSize)
    case 'less':
      // Violates if any cycle is >= cycleSize
      return cycles.some(cycle => cycle.length >= cycleSize)
    case 'equal':
      // Violates if any cycle is not equal to cycleSize (except for overflow)
      // This is checked differently in generateEqualCycles
      return false
    default:
      return false
  }
}

// Generate pairings with cycle size constraint based on operator
export const generateWithCycleConstraint = (
  participants: Participant[],
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  cycleSize: number,
  cycleOperator: CycleOperator,
  maxAttempts = 1000
): GenerationResult => {
  const n = participants.length

  const banned = new Set(bannedPairings.map(p => `${p.from}->${p.to}`))
  const forcedMap = new Map(forcedPairings.map(p => [p.from, p.to]))

  let bestPairings: Pairing[] = []
  let bestAvgViolatingSize = Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pairings: Pairing[] = []
    const assigned = new Set<Participant>()
    const givers = shuffleArray([...participants])

    forcedPairings.forEach(fp => {
      pairings.push(fp)
      assigned.add(fp.to)
    })

    for (const from of givers) {
      if (forcedMap.has(from)) continue

      const available = participants.filter(p => p !== from && !assigned.has(p))
      const shuffledAvailable = shuffleArray(available)

      let assigned_to = false
      for (const to of shuffledAvailable) {
        const key = `${from}->${to}`
        if (!banned.has(key)) {
          pairings.push({ from, to })
          assigned.add(to)
          assigned_to = true
          break
        }
      }

      if (!assigned_to && available.length > 0) {
        // Force assignment even if banned
        pairings.push({ from, to: available[0]! })
        assigned.add(available[0]!)
      }
    }

    // Check for complete assignment
    if (pairings.length !== n) continue

    // Check cycle constraint
    if (!violatesCycleConstraint(pairings, participants, cycleSize, cycleOperator)) {
      return { pairings, success: true, attempts: attempt + 1 }
    }

    // Track best attempt by average violating cycle size
    const cycles = detectCycles(pairings, participants)
    const violatingCycles = cycles.filter(c => {
      if (cycleOperator === 'greater') return c.length <= cycleSize
      if (cycleOperator === 'less') return c.length >= cycleSize
      return false
    })

    if (violatingCycles.length > 0) {
      const avgSize = violatingCycles.reduce((sum, c) => sum + c.length, 0) / violatingCycles.length
      if (avgSize < bestAvgViolatingSize) {
        bestAvgViolatingSize = avgSize
        bestPairings = pairings
      }
    } else if (bestPairings.length === 0) {
      // Fallback if no violations found yet
      bestPairings = pairings
    }
  }

  // Could not find perfect solution
  const operatorText = cycleOperator === 'greater' ? '>' : cycleOperator === 'less' ? '<' : '='
  return {
    pairings: bestPairings,
    success: false,
    attempts: maxAttempts,
    warning: `Could not satisfy cycle constraint ${operatorText} ${cycleSize} after ${maxAttempts} attempts. Showing best attempt.`,
  }
}

// Generate pairings with all cycles equal to N (with overflow if M % N != 0)
export const generateEqualCycles = (
  participants: Participant[],
  bannedPairings: Constraint[],
  forcedPairings: Constraint[],
  cycleSize: number,
  maxAttempts = 1000
): GenerationResult => {
  const n = participants.length

  if (cycleSize <= 0) {
    return {
      pairings: [],
      success: false,
      warning: 'Cycle size must be positive.',
    }
  }

  if (cycleSize === 1) {
    // Allow self-pairings (A->A)
    return {
      pairings: participants.map(p => ({ from: p, to: p })),
      success: true,
      warning: 'N=1 creates self-pairings (A→A).',
    }
  }

  const banned = new Set(bannedPairings.map(p => `${p.from}->${p.to}`))
  const forcedNext = new Map<Participant, Participant>()
  const forcedPrev = new Map<Participant, Participant>()

  forcedPairings.forEach(fp => {
    forcedNext.set(fp.from, fp.to)
    forcedPrev.set(fp.to, fp.from)
  })

  const hasOverflow = n % cycleSize !== 0
  const overflowSize = hasOverflow ? cycleSize + (n % cycleSize) : 0

  let bestPairings: Pairing[] = []
  let bestBannedCount = Infinity
  let bestCycleSizeDeviation = Infinity

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Build forced chains
    const visited = new Set<Participant>()
    const chains: Participant[][] = []

    participants.forEach(start => {
      if (visited.has(start)) return
      if (forcedPrev.has(start) && !visited.has(forcedPrev.get(start)!)) return

      const chain: Participant[] = []
      let current: Participant | undefined = start

      while (current && !visited.has(current)) {
        chain.push(current)
        visited.add(current)
        current = forcedNext.get(current)
      }

      if (chain.length > 0) {
        chains.push(chain)
      }
    })

    // Shuffle chains to randomize grouping
    const shuffledChains = shuffleArray(chains)

    // Build groups of cycleSize (forced chains must stay together in same cycle)
    const groups: Participant[][] = []
    const availableChains = [...shuffledChains]

    while (availableChains.length > 0) {
      const group: Participant[] = []
      const chainsInGroup: Participant[][] = []

      // Calculate target size for this group
      const remainingParticipants = availableChains.reduce((sum, chain) => sum + chain.length, 0)
      const targetSize =
        remainingParticipants >= cycleSize * 2 || remainingParticipants === cycleSize
          ? cycleSize
          : remainingParticipants // Last group (overflow)

      // Try to fill group to target size with complete chains
      let currentSize = 0
      for (let i = availableChains.length - 1; i >= 0; i--) {
        const chain = availableChains[i]!
        if (currentSize + chain.length <= targetSize) {
          chainsInGroup.push(chain)
          currentSize += chain.length
          availableChains.splice(i, 1)
          if (currentSize === targetSize) break
        }
      }

      // If no chains fit, take the smallest remaining chain
      if (chainsInGroup.length === 0 && availableChains.length > 0) {
        const smallestChain = availableChains.reduce((smallest, chain) =>
          chain.length < smallest.length ? chain : smallest
        )
        chainsInGroup.push(smallestChain)
        availableChains.splice(availableChains.indexOf(smallestChain), 1)
      }

      // Add all participants from selected chains to group
      chainsInGroup.forEach(chain => group.push(...chain))

      if (group.length > 0) {
        groups.push(group)
      }
    }

    // Create cycle pairings for each group
    const pairings: Pairing[] = []

    for (const group of groups) {
      // Find which chains are in this group
      const groupChains = chains.filter(chain => chain.every(p => group.includes(p)))

      // Add forced edges within chains
      groupChains.forEach(chain => {
        for (let i = 0; i < chain.length - 1; i++) {
          pairings.push({ from: chain[i]!, to: chain[i + 1]! })
        }
      })

      // Connect chain tails to next chain heads to complete the cycle
      // Shuffle the order of chain connections to randomize
      const shuffledGroupChains = shuffleArray(groupChains)
      for (let i = 0; i < shuffledGroupChains.length; i++) {
        const currentChain = shuffledGroupChains[i]!
        const nextChain = shuffledGroupChains[(i + 1) % shuffledGroupChains.length]!
        const from = currentChain[currentChain.length - 1]!
        const to = nextChain[0]!

        pairings.push({ from, to })
      }
    }

    // Score this attempt
    const bannedCount = pairings.filter(p => banned.has(`${p.from}->${p.to}`)).length

    // Calculate average deviation from target cycle size
    const cycles = detectCycles(pairings, participants)
    const totalDeviation = cycles.reduce((sum, cycle) => {
      // Overflow cycle is expected, don't penalize it
      if (hasOverflow && cycle.length === overflowSize) return sum
      return sum + Math.abs(cycle.length - cycleSize)
    }, 0)
    const avgDeviation = cycles.length > 0 ? totalDeviation / cycles.length : 0

    // Check for perfect solution
    if (bannedCount === 0 && avgDeviation === 0) {
      const warning = hasOverflow
        ? `M=${n} is not divisible by N=${cycleSize}. Created overflow cycle of size ${overflowSize}.`
        : undefined
      return {
        pairings,
        success: true,
        warning,
        attempts: attempt + 1,
        cycles,
      }
    }

    // Track best attempt (prioritize fewer banned violations, then better cycle sizes)
    if (
      bannedCount < bestBannedCount ||
      (bannedCount === bestBannedCount && avgDeviation < bestCycleSizeDeviation)
    ) {
      bestBannedCount = bannedCount
      bestCycleSizeDeviation = avgDeviation
      bestPairings = pairings
    }
  }

  // Could not find perfect solution after all attempts
  let warning = ''
  if (hasOverflow) {
    warning = `M=${n} is not divisible by N=${cycleSize}. Created overflow cycle of size ${overflowSize}.`
  }
  if (bestBannedCount > 0) {
    warning +=
      (warning ? ' ' : '') +
      `Could not avoid all banned pairings after ${maxAttempts} attempts. ${bestBannedCount} banned pairing(s) included.`
  }
  if (bestCycleSizeDeviation > 0 && !hasOverflow) {
    warning +=
      (warning ? ' ' : '') + 'Could not achieve perfectly equal cycles. Showing best attempt.'
  }

  return {
    pairings: bestPairings,
    success: false,
    warning: warning || 'Could not find perfect solution. Showing best attempt.',
    attempts: maxAttempts,
    cycles: detectCycles(bestPairings, participants),
  }
}

export const generatePairings = (
  participants: Participant[],
  settings: GenerationSettings,
  bannedPairings: Constraint[] = [],
  forcedPairings: Constraint[] = []
): GenerationResult => {
  const validBanned = validateConstraints(bannedPairings, participants)
  const validForced = validateConstraints(forcedPairings, participants)

  const conflicts = validForced.filter(fp =>
    validBanned.some(bp => bp.from === fp.from && bp.to === fp.to)
  )
  if (conflicts.length > 0) {
    const conflict = conflicts[0]!
    return {
      pairings: [],
      success: false,
      warning: `Conflict: ${conflict.from} → ${conflict.to} is both forced and banned.`,
    }
  }

  if (settings.useHamiltonianCycle) {
    const result = generateHamiltonianCycle(participants, validBanned, validForced)

    return {
      ...result,
      cycles: detectCycles(result.pairings, participants),
    }
  } else if (settings.enableNCycleConstraint) {
    const cycleSize = settings.cycleSize ?? 3
    const cycleOperator = settings.cycleOperator ?? 'equal'

    if (cycleOperator === 'equal') {
      const result = generateEqualCycles(participants, validBanned, validForced, cycleSize)
      return {
        ...result,
        cycles: detectCycles(result.pairings, participants),
      }
    } else {
      const result = generateWithCycleConstraint(
        participants,
        validBanned,
        validForced,
        cycleSize,
        cycleOperator
      )
      return {
        ...result,
        cycles: detectCycles(result.pairings, participants),
      }
    }
  } else {
    // No cycle constraints - random assignment
    const result = generateWithCycleConstraint(
      participants,
      validBanned,
      validForced,
      participants.length, // Allow any cycle size
      'less' // No real constraint
    )
    return {
      ...result,
      cycles: detectCycles(result.pairings, participants),
    }
  }
}

// File download utility
export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Snapshot creation helper
export const createConfigSnapshot = (
  participants: Participant[],
  settings: GenerationSettings,
  bannedPairings: Constraint[],
  forcedPairings: Constraint[]
): string => {
  return JSON.stringify({
    participants,
    settings,
    bannedPairings,
    forcedPairings,
  })
}

// Pairing checking helpers
export const isPairingInList = (pairing: Pairing, constraints: Constraint[]): boolean => {
  return constraints.some(c => c.from === pairing.from && c.to === pairing.to)
}

// Validation utility
export interface CycleValidationResult {
  text?: string
  type?: 'error' | 'warning'
}

export const validateCycleSettings = (
  enableNCycle: boolean,
  useHamiltonian: boolean,
  cycleSizeInput: string,
  cycleOperator: CycleOperator,
  participantCount: number
): CycleValidationResult | null => {
  if (!enableNCycle || useHamiltonian) return null

  const cycleSize = parseInt(cycleSizeInput)

  if (cycleSizeInput === '' || isNaN(cycleSize)) {
    return { text: 'Cycle size must be a number', type: 'error' }
  }

  if (cycleSize <= 0) {
    return { text: 'N must be positive', type: 'error' }
  }

  const maxValidSize = Math.floor(participantCount / 2)
  if (cycleOperator !== 'equal' && cycleSize > maxValidSize && participantCount > 0) {
    const remainingSize = participantCount - cycleSize
    return {
      text: `${cycleSize}-cycle necessitates a (${participantCount}-${cycleSize})-cycle (${remainingSize}-cycle) which violates the rule`,
      type: 'error',
    }
  }

  if (cycleOperator === 'equal' && participantCount > 0 && participantCount % cycleSize !== 0) {
    const overflowSize = cycleSize + (participantCount % cycleSize)
    return {
      text: `M=${participantCount} is not divisible by N=${cycleSize}. Will create overflow cycle of size ${overflowSize}`,
      type: 'warning',
    }
  }

  return null
}
