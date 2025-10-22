import type { Constraint, Participant } from '@/types'

export const parseConstraintsFile = (
  content: string
): { constraints: Constraint[]; errors: string[] } => {
  const errors: string[] = []
  const constraints: Constraint[] = []

  const hasNewlines = content.includes('\n')
  const lines = hasNewlines ? content.split(/\r?\n/) : content.split(',')

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    let from = ''
    let to = ''

    if (trimmed.includes('->')) {
      const parts = trimmed.split('->')
      from = parts[0]?.trim() || ''
      to = parts[1]?.trim() || ''
    } else if (trimmed.includes('→')) {
      const parts = trimmed.split('→')
      from = parts[0]?.trim() || ''
      to = parts[1]?.trim() || ''
    } else if (trimmed.includes(',') && !hasNewlines) {
      const parts = trimmed.split(',')
      from = parts[0]?.trim() || ''
      to = parts[1]?.trim() || ''
    } else {
      errors.push(`Line ${index + 1}: Could not parse "${trimmed}"`)
      return
    }

    if (from && to) {
      constraints.push({ from, to })
    } else {
      errors.push(`Line ${index + 1}: Missing from/to value`)
    }
  })

  return { constraints, errors }
}

export const findParticipant = (name: string, participants: Participant[]): Participant | null => {
  const lowerName = name.toLowerCase()
  return participants.find(p => p.toLowerCase() === lowerName) || null
}
