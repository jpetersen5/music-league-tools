import type { SongStat, CompetitorStat, ArtistStat } from '@/types/leaderboard'

/**
 * Formats a song stat for display.
 * Returns "N/A" if stat is null.
 */
export function formatSongStat(stat: SongStat | null): string {
  if (!stat) return 'N/A'
  return `${stat.title} - ${stat.artists}`
}

/**
 * Creates a tooltip string for a song stat.
 * Returns undefined if stat is null.
 */
export function createSongTooltip(stat: SongStat | null, label: string): string | undefined {
  if (!stat) return undefined
  return `${label}: ${stat.value.toFixed(2)}\nRound: ${stat.roundName}\nSubmitted by: ${stat.submitter}`
}

/**
 * Creates a tooltip string for a competitor stat.
 * Returns undefined if stat is null.
 */
export function createCompetitorTooltip(
  stat: CompetitorStat | null,
  label: string
): string | undefined {
  if (!stat) return undefined
  return `${label}: ${stat.value.toFixed(2)}`
}

/**
 * Creates a tooltip string for an artist stat.
 * Returns undefined if stat is null.
 */
export function createArtistTooltip(stat: ArtistStat | null): string | undefined {
  if (!stat) return undefined
  return `Submitted ${stat.count} time${stat.count === 1 ? '' : 's'}`
}

/**
 * Formats sentiment breakdown percentages for display.
 * Returns "N/A" if breakdown is null.
 */
export function formatSentimentBreakdown(
  breakdown: {
    positive: number
    neutral: number
    negative: number
  } | null
): string {
  if (!breakdown) return 'N/A'
  return `${breakdown.positive.toFixed(0)}% + / ${breakdown.neutral.toFixed(0)}% ~ / ${breakdown.negative.toFixed(0)}% -`
}
