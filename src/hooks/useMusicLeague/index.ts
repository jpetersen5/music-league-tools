/**
 * Music League Hooks
 *
 * Collection of React hooks for accessing Music League data with efficient
 * ID-based caching, proper error handling, and support for "All Profiles" mode.
 *
 * @module hooks/useMusicLeague
 */

// Export hooks
export { useCompetitors, ALL_PROFILES_ID } from './useCompetitors'
export { useRounds } from './useRounds'
export { useSubmissions } from './useSubmissions'
export { useVotes } from './useVotes'
export { useProfileUpload, UploadPhase } from './useProfileUpload'

// Export types
export type { UseCompetitorsResult } from './useCompetitors'
export type { UseRoundsResult } from './useRounds'
export type { UseSubmissionsResult, SubmissionFilters } from './useSubmissions'
export type { UseVotesResult, VoteFilters, VoteStatistics, PointsRange } from './useVotes'
export type { UploadState, UploadResult } from './useProfileUpload'
export type { UploadStats } from '@/types/musicLeague'
