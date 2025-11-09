/**
 * Music League Data Management System - Type Definitions
 *
 * This module provides comprehensive TypeScript types for managing Music League
 * data exported from CSV files and stored in IndexedDB.
 *
 * @module musicLeague
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Branded type for competitor IDs to prevent mixing with other string IDs
 */
export type CompetitorId = string & { readonly __brand: 'CompetitorId' }

/**
 * Branded type for round IDs to prevent mixing with other string IDs
 */
export type RoundId = string & { readonly __brand: 'RoundId' }

/**
 * Branded type for Spotify track URIs
 */
export type SpotifyUri = string & { readonly __brand: 'SpotifyUri' }

/**
 * Branded type for profile IDs (unique identifier for each CSV dataset import)
 */
export type ProfileId = string & { readonly __brand: 'ProfileId' }

/**
 * Helper function to create a branded CompetitorId
 */
export function createCompetitorId(id: string): CompetitorId {
  return id as CompetitorId
}

/**
 * Helper function to create a branded RoundId
 */
export function createRoundId(id: string): RoundId {
  return id as RoundId
}

/**
 * Helper function to create a branded SpotifyUri
 */
export function createSpotifyUri(uri: string): SpotifyUri {
  return uri as SpotifyUri
}

/**
 * Helper function to create a branded ProfileId
 */
export function createProfileId(id: string): ProfileId {
  return id as ProfileId
}

// ============================================================================
// CSV Row Types (Exact CSV Structure for Parsing)
// ============================================================================

/**
 * Raw competitor data as parsed from competitors.csv
 * Maps directly to CSV columns
 */
export interface CompetitorCsvRow {
  /** Unique identifier for the competitor (hex string) */
  readonly ID: string
  /** Display name of the competitor */
  readonly Name: string
}

/**
 * Raw round data as parsed from rounds.csv
 * Maps directly to CSV columns
 */
export interface RoundCsvRow {
  /** Unique identifier for the round (hex string) */
  readonly ID: string
  /** ISO 8601 timestamp when round was created */
  readonly Created: string
  /** Display name of the round */
  readonly Name: string
  /** Theme or description of the round */
  readonly Description: string
  /** Spotify playlist URL for the round */
  readonly 'Playlist URL': string
}

/**
 * Raw submission data as parsed from submissions.csv
 * Maps directly to CSV columns
 */
export interface SubmissionCsvRow {
  /** Spotify track URI (format: spotify:track:xxxxx) */
  readonly 'Spotify URI': string
  /** Track title */
  readonly Title: string
  /** Album name */
  readonly Album: string
  /** Comma-separated list of artist names */
  readonly 'Artist(s)': string
  /** ID of the competitor who submitted this track */
  readonly 'Submitter ID': string
  /** ISO 8601 timestamp when submission was created */
  readonly Created: string
  /** Optional comment from the submitter */
  readonly Comment: string
  /** ID of the round this submission belongs to */
  readonly 'Round ID': string
  /** Whether voters could see this submission (Yes/No) */
  readonly 'Visible To Voters': string
}

/**
 * Raw vote data as parsed from votes.csv
 * Maps directly to CSV columns
 */
export interface VoteCsvRow {
  /** Spotify track URI that was voted on */
  readonly 'Spotify URI': string
  /** ID of the competitor who cast this vote */
  readonly 'Voter ID': string
  /** ISO 8601 timestamp when vote was cast */
  readonly Created: string
  /** Number of points assigned (typically 1-6) */
  readonly 'Points Assigned': string
  /** Optional comment from the voter */
  readonly Comment: string
  /** ID of the round this vote belongs to */
  readonly 'Round ID': string
}

/**
 * Union type of all CSV row types for generic processing
 */
export type AnyCsvRow = CompetitorCsvRow | RoundCsvRow | SubmissionCsvRow | VoteCsvRow

// ============================================================================
// Database Entity Types (For IndexedDB Storage)
// ============================================================================

/**
 * Competitor entity stored in IndexedDB
 * Includes profileId for multi-dataset support
 */
export interface Competitor {
  /** Unique identifier for the competitor */
  readonly id: CompetitorId
  /** Display name of the competitor */
  readonly name: string
  /** Profile this competitor belongs to */
  readonly profileId: ProfileId
  /** Whether this competitor has left the league (orphaned) */
  readonly isOrphaned: boolean
}

/**
 * Round entity stored in IndexedDB
 * Includes profileId for multi-dataset support
 */
export interface Round {
  /** Unique identifier for the round */
  readonly id: RoundId
  /** Display name of the round */
  readonly name: string
  /** Theme or description of the round */
  readonly description: string
  /** Spotify playlist URL for the round */
  readonly playlistUrl: string
  /** When the round was created */
  readonly createdAt: Date
  /** Profile this round belongs to */
  readonly profileId: ProfileId
}

/**
 * Submission entity stored in IndexedDB
 * Includes profileId for multi-dataset support
 */
export interface Submission {
  /** Spotify track URI (composite key component) */
  readonly spotifyUri: SpotifyUri
  /** Track title */
  readonly title: string
  /** Album name */
  readonly album: string
  /** Array of artist names */
  readonly artists: readonly string[]
  /** ID of the competitor who submitted this track */
  readonly submitterId: CompetitorId
  /** When the submission was created */
  readonly createdAt: Date
  /** Optional comment from the submitter */
  readonly comment: string
  /** ID of the round this submission belongs to */
  readonly roundId: RoundId
  /** Whether voters could see this submission */
  readonly visibleToVoters: boolean
  /** Profile this submission belongs to (composite key component) */
  readonly profileId: ProfileId
  /** Sentiment analysis score for the comment (if present) */
  readonly sentimentScore?: number
  /** Sentiment label derived from score (if present) */
  readonly sentimentLabel?: SentimentLabel
}

/**
 * Vote entity stored in IndexedDB
 * Includes profileId for multi-dataset support
 */
export interface Vote {
  /** Spotify track URI that was voted on */
  readonly spotifyUri: SpotifyUri
  /** ID of the competitor who cast this vote */
  readonly voterId: CompetitorId
  /** When the vote was cast */
  readonly createdAt: Date
  /** Number of points assigned */
  readonly pointsAssigned: number
  /** Optional comment from the voter */
  readonly comment: string
  /** ID of the round this vote belongs to */
  readonly roundId: RoundId
  /** Profile this vote belongs to */
  readonly profileId: ProfileId
  /** Sentiment analysis score for the comment (if present) */
  readonly sentimentScore?: number
  /** Sentiment label derived from score (if present) */
  readonly sentimentLabel?: SentimentLabel
}

/**
 * Union type of all database entity types
 */
export type AnyEntity = Competitor | Round | Submission | Vote

// ============================================================================
// Profile Type (Metadata for Each Dataset)
// ============================================================================

/**
 * Statistics about competitors in a profile
 */
export interface CompetitorStats {
  /** Total number of competitors */
  readonly total: number
  /** Number of active competitors */
  readonly active: number
  /** Number of orphaned competitors */
  readonly orphaned: number
}

/**
 * Date range information for temporal data
 */
export interface DateRange {
  /** Earliest date in the dataset */
  readonly earliest: Date
  /** Latest date in the dataset */
  readonly latest: Date
}

/**
 * Profile metadata for a Music League dataset import
 * Stores aggregate information about the imported data
 */
export interface Profile {
  /** Unique identifier for this profile */
  readonly id: ProfileId
  /** User-friendly name for this dataset */
  readonly name: string
  /** When this profile was created/imported */
  readonly createdAt: Date
  /** When this profile was last modified */
  readonly updatedAt: Date
  /** Competitor statistics */
  readonly competitors: CompetitorStats
  /** Total number of rounds */
  readonly roundCount: number
  /** Total number of submissions */
  readonly submissionCount: number
  /** Total number of votes */
  readonly voteCount: number
  /** Date range of rounds */
  readonly roundDateRange: DateRange | null
  /** Date range of submissions */
  readonly submissionDateRange: DateRange | null
  /** Date range of votes */
  readonly voteDateRange: DateRange | null
  /** Optional notes about this dataset */
  readonly notes: string
}

// ============================================================================
// Upload Types (File Upload and Validation)
// ============================================================================

/**
 * Types of CSV files that can be uploaded
 */
export enum CsvFileType {
  Competitors = 'competitors',
  Rounds = 'rounds',
  Submissions = 'submissions',
  Votes = 'votes',
}

/**
 * Validation error severity levels
 */
export enum ValidationSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/**
 * Validation error for CSV data
 */
export interface ValidationError {
  /** Severity of the validation error */
  readonly severity: ValidationSeverity
  /** Type of CSV file where error occurred */
  readonly fileType: CsvFileType
  /** Line number in CSV file (1-indexed, null for file-level errors) */
  readonly lineNumber: number | null
  /** Column name where error occurred (null for row-level errors) */
  readonly column: string | null
  /** Human-readable error message */
  readonly message: string
  /** Raw value that caused the error */
  readonly value?: unknown
}

/**
 * State of a single CSV file upload
 */
export interface CsvFileState {
  /** Type of CSV file */
  readonly type: CsvFileType
  /** File object being uploaded */
  readonly file: File | null
  /** Whether file has been selected */
  readonly isSelected: boolean
  /** Whether file is currently being parsed */
  readonly isParsing: boolean
  /** Whether file has been successfully parsed */
  readonly isParsed: boolean
  /** Number of rows parsed from the file */
  readonly rowCount: number
  /** Validation errors for this file */
  readonly errors: readonly ValidationError[]
}

/**
 * Overall upload progress state
 */
export enum UploadPhase {
  /** Initial state - no files selected */
  Idle = 'idle',
  /** Files selected but not yet validated */
  FilesSelected = 'filesSelected',
  /** Validating CSV structure and content */
  Validating = 'validating',
  /** Ready to import into database */
  ReadyToImport = 'readyToImport',
  /** Currently importing data */
  Importing = 'importing',
  /** Import completed successfully */
  Complete = 'complete',
  /** Import failed with errors */
  Failed = 'failed',
}

/**
 * Complete upload state for all CSV files
 */
export interface UploadState {
  /** Current phase of the upload process */
  readonly phase: UploadPhase
  /** State for each CSV file type */
  readonly files: Readonly<Record<CsvFileType, CsvFileState>>
  /** All validation errors across all files */
  readonly allErrors: readonly ValidationError[]
  /** Import progress (0-100) */
  readonly progress: number
  /** Name for the profile being created */
  readonly profileName: string
  /** Optional notes for the profile */
  readonly profileNotes: string
}

// ============================================================================
// Query Types (Filtering and Searching)
// ============================================================================

/**
 * Sort direction for query results
 */
export enum SortDirection {
  Ascending = 'asc',
  Descending = 'desc',
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  /** Start date (inclusive) */
  readonly from: Date | null
  /** End date (inclusive) */
  readonly to: Date | null
}

/**
 * Filter options for competitor queries
 */
export interface CompetitorFilter {
  /** Profile to filter by */
  readonly profileId: ProfileId | null
  /** Filter by competitor name (partial match, case-insensitive) */
  readonly nameSearch: string | null
  /** Include only orphaned competitors */
  readonly orphanedOnly: boolean
  /** Specific competitor IDs to include */
  readonly ids: readonly CompetitorId[] | null
}

/**
 * Sort options for competitor queries
 */
export interface CompetitorSort {
  /** Field to sort by */
  readonly field: 'name' | 'id'
  /** Sort direction */
  readonly direction: SortDirection
}

/**
 * Filter options for round queries
 */
export interface RoundFilter {
  /** Profile to filter by */
  readonly profileId: ProfileId | null
  /** Filter by round name (partial match, case-insensitive) */
  readonly nameSearch: string | null
  /** Filter by description (partial match, case-insensitive) */
  readonly descriptionSearch: string | null
  /** Filter by creation date range */
  readonly dateRange: DateRangeFilter | null
  /** Specific round IDs to include */
  readonly ids: readonly RoundId[] | null
}

/**
 * Sort options for round queries
 */
export interface RoundSort {
  /** Field to sort by */
  readonly field: 'name' | 'createdAt' | 'id'
  /** Sort direction */
  readonly direction: SortDirection
}

/**
 * Filter options for submission queries
 */
export interface SubmissionFilter {
  /** Profile to filter by */
  readonly profileId: ProfileId | null
  /** Filter by specific round */
  readonly roundId: RoundId | null
  /** Filter by submitter */
  readonly submitterId: CompetitorId | null
  /** Filter by track title (partial match, case-insensitive) */
  readonly titleSearch: string | null
  /** Filter by artist name (partial match, case-insensitive) */
  readonly artistSearch: string | null
  /** Filter by album name (partial match, case-insensitive) */
  readonly albumSearch: string | null
  /** Filter by submission date range */
  readonly dateRange: DateRangeFilter | null
  /** Filter by visibility to voters */
  readonly visibleToVoters: boolean | null
  /** Specific Spotify URIs to include */
  readonly spotifyUris: readonly SpotifyUri[] | null
}

/**
 * Sort options for submission queries
 */
export interface SubmissionSort {
  /** Field to sort by */
  readonly field: 'title' | 'createdAt' | 'album' | 'spotifyUri'
  /** Sort direction */
  readonly direction: SortDirection
}

/**
 * Filter options for vote queries
 */
export interface VoteFilter {
  /** Profile to filter by */
  readonly profileId: ProfileId | null
  /** Filter by specific round */
  readonly roundId: RoundId | null
  /** Filter by voter */
  readonly voterId: CompetitorId | null
  /** Filter by voted-on track */
  readonly spotifyUri: SpotifyUri | null
  /** Filter by minimum points assigned */
  readonly minPoints: number | null
  /** Filter by maximum points assigned */
  readonly maxPoints: number | null
  /** Filter by vote date range */
  readonly dateRange: DateRangeFilter | null
  /** Only include votes with comments */
  readonly withCommentsOnly: boolean
}

/**
 * Sort options for vote queries
 */
export interface VoteSort {
  /** Field to sort by */
  readonly field: 'createdAt' | 'pointsAssigned' | 'spotifyUri'
  /** Sort direction */
  readonly direction: SortDirection
}

/**
 * Pagination options for query results
 */
export interface PaginationOptions {
  /** Number of items to return (null for all) */
  readonly limit: number | null
  /** Number of items to skip */
  readonly offset: number
}

/**
 * Complete query options for competitors
 */
export interface CompetitorQuery {
  readonly filter: Partial<CompetitorFilter>
  readonly sort: CompetitorSort | null
  readonly pagination: PaginationOptions | null
}

/**
 * Complete query options for rounds
 */
export interface RoundQuery {
  readonly filter: Partial<RoundFilter>
  readonly sort: RoundSort | null
  readonly pagination: PaginationOptions | null
}

/**
 * Complete query options for submissions
 */
export interface SubmissionQuery {
  readonly filter: Partial<SubmissionFilter>
  readonly sort: SubmissionSort | null
  readonly pagination: PaginationOptions | null
}

/**
 * Complete query options for votes
 */
export interface VoteQuery {
  readonly filter: Partial<VoteFilter>
  readonly sort: VoteSort | null
  readonly pagination: PaginationOptions | null
}

/**
 * Result set with pagination metadata
 */
export interface QueryResult<T> {
  /** Array of results */
  readonly items: readonly T[]
  /** Total number of items matching filter (before pagination) */
  readonly total: number
  /** Number of items returned */
  readonly count: number
  /** Offset used for this query */
  readonly offset: number
  /** Whether there are more results available */
  readonly hasMore: boolean
}

// ============================================================================
// Type Guards (Runtime Validation)
// ============================================================================

/**
 * Type guard to check if a string is a valid Spotify URI
 */
export function isSpotifyUri(value: unknown): value is SpotifyUri {
  return typeof value === 'string' && /^spotify:track:[a-zA-Z0-9]+$/.test(value)
}

/**
 * Type guard to check if a string is a valid ISO 8601 date
 */
export function isIso8601Date(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime()) && value === date.toISOString()
}

/**
 * Type guard to check if a value is a valid Date object
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}

/**
 * Type guard to check if an object is a CompetitorCsvRow
 */
export function isCompetitorCsvRow(obj: unknown): obj is CompetitorCsvRow {
  if (typeof obj !== 'object' || obj === null) return false
  const row = obj as Record<string, unknown>
  return (
    typeof row.ID === 'string' &&
    row.ID.length > 0 &&
    typeof row.Name === 'string' &&
    row.Name.length > 0
  )
}

/**
 * Type guard to check if an object is a RoundCsvRow
 */
export function isRoundCsvRow(obj: unknown): obj is RoundCsvRow {
  if (typeof obj !== 'object' || obj === null) return false
  const row = obj as Record<string, unknown>
  return (
    typeof row.ID === 'string' &&
    row.ID.length > 0 &&
    typeof row.Created === 'string' &&
    isIso8601Date(row.Created) &&
    typeof row.Name === 'string' &&
    row.Name.length > 0 &&
    typeof row.Description === 'string' &&
    typeof row['Playlist URL'] === 'string'
  )
}

/**
 * Type guard to check if an object is a SubmissionCsvRow
 */
export function isSubmissionCsvRow(obj: unknown): obj is SubmissionCsvRow {
  if (typeof obj !== 'object' || obj === null) return false
  const row = obj as Record<string, unknown>
  return (
    typeof row['Spotify URI'] === 'string' &&
    isSpotifyUri(row['Spotify URI']) &&
    typeof row.Title === 'string' &&
    row.Title.length > 0 &&
    typeof row.Album === 'string' &&
    typeof row['Artist(s)'] === 'string' &&
    row['Artist(s)'].length > 0 &&
    typeof row['Submitter ID'] === 'string' &&
    row['Submitter ID'].length > 0 &&
    typeof row.Created === 'string' &&
    isIso8601Date(row.Created) &&
    typeof row.Comment === 'string' &&
    typeof row['Round ID'] === 'string' &&
    row['Round ID'].length > 0 &&
    typeof row['Visible To Voters'] === 'string' &&
    (row['Visible To Voters'] === 'Yes' || row['Visible To Voters'] === 'No')
  )
}

/**
 * Type guard to check if an object is a VoteCsvRow
 */
export function isVoteCsvRow(obj: unknown): obj is VoteCsvRow {
  if (typeof obj !== 'object' || obj === null) return false
  const row = obj as Record<string, unknown>
  return (
    typeof row['Spotify URI'] === 'string' &&
    isSpotifyUri(row['Spotify URI']) &&
    typeof row['Voter ID'] === 'string' &&
    row['Voter ID'].length > 0 &&
    typeof row.Created === 'string' &&
    isIso8601Date(row.Created) &&
    typeof row['Points Assigned'] === 'string' &&
    /^\d+$/.test(row['Points Assigned']) &&
    typeof row.Comment === 'string' &&
    typeof row['Round ID'] === 'string' &&
    row['Round ID'].length > 0
  )
}

/**
 * Type guard to check if an object is a Competitor
 */
export function isCompetitor(obj: unknown): obj is Competitor {
  if (typeof obj !== 'object' || obj === null) return false
  const entity = obj as Record<string, unknown>
  return (
    typeof entity.id === 'string' &&
    entity.id.length > 0 &&
    typeof entity.name === 'string' &&
    entity.name.length > 0 &&
    typeof entity.profileId === 'string' &&
    entity.profileId.length > 0 &&
    typeof entity.isOrphaned === 'boolean'
  )
}

/**
 * Type guard to check if an object is a Round
 */
export function isRound(obj: unknown): obj is Round {
  if (typeof obj !== 'object' || obj === null) return false
  const entity = obj as Record<string, unknown>
  return (
    typeof entity.id === 'string' &&
    entity.id.length > 0 &&
    typeof entity.name === 'string' &&
    entity.name.length > 0 &&
    typeof entity.description === 'string' &&
    typeof entity.playlistUrl === 'string' &&
    isValidDate(entity.createdAt) &&
    typeof entity.profileId === 'string' &&
    entity.profileId.length > 0
  )
}

/**
 * Type guard to check if an object is a Submission
 */
export function isSubmission(obj: unknown): obj is Submission {
  if (typeof obj !== 'object' || obj === null) return false
  const entity = obj as Record<string, unknown>
  return (
    isSpotifyUri(entity.spotifyUri) &&
    typeof entity.title === 'string' &&
    entity.title.length > 0 &&
    typeof entity.album === 'string' &&
    Array.isArray(entity.artists) &&
    entity.artists.every(a => typeof a === 'string') &&
    typeof entity.submitterId === 'string' &&
    entity.submitterId.length > 0 &&
    isValidDate(entity.createdAt) &&
    typeof entity.comment === 'string' &&
    typeof entity.roundId === 'string' &&
    entity.roundId.length > 0 &&
    typeof entity.visibleToVoters === 'boolean' &&
    typeof entity.profileId === 'string' &&
    entity.profileId.length > 0
  )
}

/**
 * Type guard to check if an object is a Vote
 */
export function isVote(obj: unknown): obj is Vote {
  if (typeof obj !== 'object' || obj === null) return false
  const entity = obj as Record<string, unknown>
  return (
    isSpotifyUri(entity.spotifyUri) &&
    typeof entity.voterId === 'string' &&
    entity.voterId.length > 0 &&
    isValidDate(entity.createdAt) &&
    typeof entity.pointsAssigned === 'number' &&
    entity.pointsAssigned >= 0 &&
    Number.isInteger(entity.pointsAssigned) &&
    typeof entity.comment === 'string' &&
    typeof entity.roundId === 'string' &&
    entity.roundId.length > 0 &&
    typeof entity.profileId === 'string' &&
    entity.profileId.length > 0
  )
}

/**
 * Type guard to check if an object is a Profile
 */
export function isProfile(obj: unknown): obj is Profile {
  if (typeof obj !== 'object' || obj === null) return false
  const profile = obj as Record<string, unknown>

  const hasValidCompetitorStats =
    typeof profile.competitors === 'object' &&
    profile.competitors !== null &&
    typeof (profile.competitors as Record<string, unknown>).total === 'number' &&
    typeof (profile.competitors as Record<string, unknown>).active === 'number' &&
    typeof (profile.competitors as Record<string, unknown>).orphaned === 'number'

  const hasValidDateRange = (range: unknown): boolean => {
    if (range === null) return true
    if (typeof range !== 'object' || range === null) return false
    const dr = range as Record<string, unknown>
    return isValidDate(dr.earliest) && isValidDate(dr.latest)
  }

  return (
    typeof profile.id === 'string' &&
    profile.id.length > 0 &&
    typeof profile.name === 'string' &&
    profile.name.length > 0 &&
    isValidDate(profile.createdAt) &&
    isValidDate(profile.updatedAt) &&
    hasValidCompetitorStats &&
    typeof profile.roundCount === 'number' &&
    typeof profile.submissionCount === 'number' &&
    typeof profile.voteCount === 'number' &&
    hasValidDateRange(profile.roundDateRange) &&
    hasValidDateRange(profile.submissionDateRange) &&
    hasValidDateRange(profile.voteDateRange) &&
    typeof profile.notes === 'string'
  )
}

/**
 * Type guard to check if an object is a ValidationError
 */
export function isValidationError(obj: unknown): obj is ValidationError {
  if (typeof obj !== 'object' || obj === null) return false
  const error = obj as Record<string, unknown>
  return (
    Object.values(ValidationSeverity).includes(error.severity as ValidationSeverity) &&
    Object.values(CsvFileType).includes(error.fileType as CsvFileType) &&
    (typeof error.lineNumber === 'number' || error.lineNumber === null) &&
    (typeof error.column === 'string' || error.column === null) &&
    typeof error.message === 'string' &&
    error.message.length > 0
  )
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties of T mutable (opposite of Readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Deep partial type - makes all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Extract keys from T that have values of type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]

/**
 * Create a type with only the properties of T that have values of type V
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>

/**
 * Create a type with all properties of T except those with values of type V
 */
export type OmitByType<T, V> = Omit<T, KeysOfType<T, V>>

/**
 * Entity type without the profileId property (for internal processing)
 */
export type WithoutProfileId<T extends AnyEntity> = Omit<T, 'profileId'>

/**
 * Entity type with profileId as optional (for partial updates)
 */
export type PartialProfileId<T extends AnyEntity> = Omit<T, 'profileId'> & {
  readonly profileId?: ProfileId
}

/**
 * CSV row type mapped to its corresponding entity type
 */
export type CsvRowToEntity<T extends AnyCsvRow> = T extends CompetitorCsvRow
  ? Competitor
  : T extends RoundCsvRow
    ? Round
    : T extends SubmissionCsvRow
      ? Submission
      : T extends VoteCsvRow
        ? Vote
        : never

/**
 * Entity type mapped to its corresponding CSV row type
 */
export type EntityToCsvRow<T extends AnyEntity> = T extends Competitor
  ? CompetitorCsvRow
  : T extends Round
    ? RoundCsvRow
    : T extends Submission
      ? SubmissionCsvRow
      : T extends Vote
        ? VoteCsvRow
        : never

/**
 * Filter type for a given entity type
 */
export type FilterForEntity<T extends AnyEntity> = T extends Competitor
  ? CompetitorFilter
  : T extends Round
    ? RoundFilter
    : T extends Submission
      ? SubmissionFilter
      : T extends Vote
        ? VoteFilter
        : never

/**
 * Sort type for a given entity type
 */
export type SortForEntity<T extends AnyEntity> = T extends Competitor
  ? CompetitorSort
  : T extends Round
    ? RoundSort
    : T extends Submission
      ? SubmissionSort
      : T extends Vote
        ? VoteSort
        : never

/**
 * Query type for a given entity type
 */
export type QueryForEntity<T extends AnyEntity> = T extends Competitor
  ? CompetitorQuery
  : T extends Round
    ? RoundQuery
    : T extends Submission
      ? SubmissionQuery
      : T extends Vote
        ? VoteQuery
        : never

/**
 * Aggregate statistics that can be computed from entities
 */
export interface AggregateStats<T extends AnyEntity> {
  /** Total count of entities */
  readonly count: number
  /** Entities grouped by a specific field */
  readonly groupedBy?: ReadonlyMap<string, readonly T[]>
}

/**
 * Statistics specific to submissions
 */
export interface SubmissionStats extends AggregateStats<Submission> {
  /** Total number of unique tracks */
  readonly uniqueTracks: number
  /** Submissions by submitter */
  readonly bySubmitter: ReadonlyMap<CompetitorId, readonly Submission[]>
  /** Submissions by round */
  readonly byRound: ReadonlyMap<RoundId, readonly Submission[]>
}

/**
 * Statistics specific to votes
 */
export interface VoteStats extends AggregateStats<Vote> {
  /** Total points assigned */
  readonly totalPoints: number
  /** Average points per vote */
  readonly averagePoints: number
  /** Votes by voter */
  readonly byVoter: ReadonlyMap<CompetitorId, readonly Vote[]>
  /** Votes by round */
  readonly byRound: ReadonlyMap<RoundId, readonly Vote[]>
  /** Votes by track */
  readonly byTrack: ReadonlyMap<SpotifyUri, readonly Vote[]>
}

/**
 * Leaderboard entry for a competitor in a specific round
 */
export interface LeaderboardEntry {
  /** Competitor ID */
  readonly competitorId: CompetitorId
  /** Competitor name */
  readonly competitorName: string
  /** Total points received */
  readonly pointsReceived: number
  /** Total points given */
  readonly pointsGiven: number
  /** Number of votes received */
  readonly votesReceived: number
  /** Number of votes given */
  readonly votesGiven: number
  /** Rank in the leaderboard (1-indexed) */
  readonly rank: number
}

/**
 * Options for generating a leaderboard
 */
export interface LeaderboardOptions {
  /** Profile to generate leaderboard for */
  readonly profileId: ProfileId
  /** Optional round to limit leaderboard to */
  readonly roundId?: RoundId
  /** Sort by points received or given */
  readonly sortBy: 'pointsReceived' | 'pointsGiven'
  /** Include only active competitors */
  readonly activeOnly: boolean
}

/**
 * Result of a bulk import operation
 */
export interface ImportResult {
  /** Profile that was created */
  readonly profile: Profile
  /** Number of competitors imported */
  readonly competitorsImported: number
  /** Number of rounds imported */
  readonly roundsImported: number
  /** Number of submissions imported */
  readonly submissionsImported: number
  /** Number of votes imported */
  readonly votesImported: number
  /** Validation warnings encountered during import */
  readonly warnings: readonly ValidationError[]
  /** Time taken to import (milliseconds) */
  readonly durationMs: number
}

/**
 * Options for exporting data
 */
export interface ExportOptions {
  /** Profile to export */
  readonly profileId: ProfileId
  /** Include orphaned competitors */
  readonly includeOrphaned: boolean
  /** Specific rounds to export (null for all) */
  readonly roundIds?: readonly RoundId[]
  /** Format for export */
  readonly format: 'csv' | 'json'
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** Exported data as Blob for download */
  readonly data: Blob
  /** Filename for the export */
  readonly filename: string
  /** MIME type of the exported data */
  readonly mimeType: string
}

// ============================================================================
// Sentiment Analysis Types
// ============================================================================

/**
 * Sentiment analysis result for a piece of text
 * Provides detailed scoring and word classification
 */
export interface SentimentScore {
  /** Raw sentiment score (sum of positive and negative word values) */
  readonly score: number
  /** Normalized comparative score (-1 to 1, score divided by token count) */
  readonly comparative: number
  /** Array of positive words found in the text */
  readonly positive: readonly string[]
  /** Array of negative words found in the text */
  readonly negative: readonly string[]
  /** Total number of tokens analyzed */
  readonly tokenCount: number
}

/**
 * Sentiment label classification based on comparative score
 */
export type SentimentLabel = 'positive' | 'neutral' | 'negative'

/**
 * Type guard to check if an object is a valid SentimentScore
 */
export function isSentimentScore(obj: unknown): obj is SentimentScore {
  if (typeof obj !== 'object' || obj === null) return false
  const score = obj as Record<string, unknown>
  return (
    typeof score.score === 'number' &&
    typeof score.comparative === 'number' &&
    Array.isArray(score.positive) &&
    score.positive.every(w => typeof w === 'string') &&
    Array.isArray(score.negative) &&
    score.negative.every(w => typeof w === 'string') &&
    typeof score.tokenCount === 'number' &&
    Number.isInteger(score.tokenCount) &&
    score.tokenCount >= 0
  )
}

// ============================================================================
// Profile Upload Flow Types (Phase 7)
// ============================================================================

/**
 * Upload mode selection
 *
 * Determines whether user uploads a single ZIP file or individual CSV files
 */
export enum UploadMode {
  /** Single ZIP file containing all 4 CSVs */
  Zip = 'zip',
  /** Individual CSV files (competitors, rounds, submissions, votes) */
  IndividualCsvs = 'individual',
}

/**
 * File validation state
 *
 * Tracks validation status for uploaded files before processing
 */
export interface FileValidationState {
  /** Whether file passes validation checks */
  readonly isValid: boolean
  /** File size in bytes */
  readonly size: number
  /** MIME type of the file */
  readonly type: string
  /** Validation error messages (empty if valid) */
  readonly errors: readonly string[]
}

/**
 * Upload statistics
 *
 * Statistics from a completed profile upload operation
 */
export interface UploadStats {
  /** Number of competitors added */
  readonly competitorsAdded: number
  /** Number of rounds added */
  readonly roundsAdded: number
  /** Number of submissions added */
  readonly submissionsAdded: number
  /** Number of votes added */
  readonly votesAdded: number
  /** Number of orphaned competitors detected */
  readonly orphansDetected: number
  /** Number of comments analyzed for sentiment */
  readonly commentsAnalyzed: number
}

/**
 * Upload success result
 *
 * Data returned when profile upload completes successfully
 */
export interface UploadSuccessResult {
  /** ID of the newly created profile */
  readonly profileId: ProfileId
  /** Upload statistics (row counts, processing time, etc.) */
  readonly stats: UploadStats
  /** Non-blocking warnings encountered during upload */
  readonly warnings: readonly ValidationError[]
}
