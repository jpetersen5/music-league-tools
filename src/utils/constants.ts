import type { Tool } from '@/types'

export const TOOLS = [
  {
    id: 'secret-santa',
    title: 'Secret Santa-inator',
    description: 'Create unique Secret Santa pairings for a provided list of users',
    path: '/secret-santa',
  },
] as const satisfies readonly Tool[]

export const APP_NAME = 'Music League Tools' as const
