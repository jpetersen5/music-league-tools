/**
 * Music League Profile Upload Hook
 *
 * Comprehensive React hook for managing the complete profile upload flow including:
 * - File selection (ZIP or individual CSVs)
 * - CSV parsing and validation
 * - Orphaned competitor detection
 * - NLP sentiment analysis for comments
 * - Database insertion with transaction support
 * - ProfileContext integration
 *
 * @module hooks/useMusicLeague/useProfileUpload
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ProfileId,
  ValidationError,
  Profile,
  Competitor,
  Round,
  Submission,
  Vote,
  SentimentScore,
  UploadStats,
} from '@/types/musicLeague'
import {
  createProfileId,
  createCompetitorId,
  createRoundId,
  createSpotifyUri,
  CsvFileType,
  ValidationSeverity,
} from '@/types/musicLeague'
import { useProfileContext } from '@/contexts/ProfileContext'
import {
  parseCompetitorsCSV,
  parseRoundsCSV,
  parseSubmissionsCSV,
  parseVotesCSV,
} from '@/utils/musicLeague/csvParser'
import {
  validateColumnStructure,
  validateRows,
  createColumnValidationErrors,
  type ValidationResult,
} from '@/utils/musicLeague/validation'
import { detectFileTypeHybrid } from '@/utils/musicLeague/fileDetection'
import {
  detectOrphanedCompetitors,
  mergeCompetitors,
  type OrphanDetectionResult,
} from '@/utils/musicLeague/orphanDetection'
import {
  batchAnalyzeSentiment,
  getSentimentLabelFromScore,
} from '@/utils/musicLeague/sentimentAnalysis'
import {
  extractProfileZip,
  isZipFile,
  validateZipContents,
} from '@/utils/musicLeague/profileImportExport'
import { getDatabase } from '@/services/database/db'

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Helper type to make all properties writable
 * Used internally for building objects with readonly properties
 */
type Writable<T> = {
  -readonly [P in keyof T]: T[P]
}

// ============================================================================
// Types
// ============================================================================

/**
 * Upload phase progression enum
 * Defines the sequential stages of the upload process
 */
export enum UploadPhase {
  /** Initial state - no upload in progress */
  Idle = 'Idle',
  /** User is selecting files */
  SelectingFiles = 'SelectingFiles',
  /** Parsing CSV files */
  Parsing = 'Parsing',
  /** Validating CSV structure and data */
  Validating = 'Validating',
  /** Detecting orphaned competitor IDs */
  DetectingOrphans = 'DetectingOrphans',
  /** Running sentiment analysis on comments */
  Analyzing = 'Analyzing',
  /** Inserting data into database */
  Inserting = 'Inserting',
  /** Upload completed successfully */
  Complete = 'Complete',
  /** Upload failed with errors */
  Failed = 'Failed',
}

/**
 * State for the upload process
 * Tracks all aspects of the current upload
 */
export interface UploadState {
  /** Current phase of the upload */
  readonly phase: UploadPhase
  /** Progress percentage (0-100) */
  readonly progress: number
  /** User-facing status message */
  readonly message: string
  /** Critical errors that prevent upload */
  readonly errors: readonly ValidationError[]
  /** Non-critical warnings */
  readonly warnings: readonly ValidationError[]
  /** Selected files for upload */
  readonly filesSelected: {
    readonly competitors?: File
    readonly rounds?: File
    readonly submissions?: File
    readonly votes?: File
  }
  /** Whether upload is from a ZIP file */
  readonly isZipUpload: boolean
  /** Upload result (available when phase is Complete) */
  readonly result?: UploadResult
}

/**
 * Result of upload operation
 */
export interface UploadResult {
  /** Whether upload succeeded */
  readonly success: boolean
  /** ID of created profile (if successful) */
  readonly profileId?: ProfileId
  /** Name of the profile (if successful) */
  readonly profileName?: string
  /** Errors encountered during upload */
  readonly errors?: readonly ValidationError[]
  /** Upload statistics */
  readonly stats: UploadStats
}

/**
 * Extended Submission type with sentiment analysis
 * Uses writable properties for construction
 */
type SubmissionWithSentiment = Writable<Submission> & {
  sentiment?: SentimentScore
}

/**
 * Extended Vote type with sentiment analysis
 * Uses writable properties for construction
 */
type VoteWithSentiment = Writable<Vote> & {
  sentiment?: SentimentScore
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Progress ranges for each upload phase
 * Defines start and end percentage for each phase
 */
const PHASE_PROGRESS = {
  [UploadPhase.Idle]: { start: 0, end: 0 },
  [UploadPhase.SelectingFiles]: { start: 0, end: 0 },
  [UploadPhase.Parsing]: { start: 0, end: 15 },
  [UploadPhase.Validating]: { start: 15, end: 30 },
  [UploadPhase.DetectingOrphans]: { start: 30, end: 40 },
  [UploadPhase.Analyzing]: { start: 40, end: 70 },
  [UploadPhase.Inserting]: { start: 70, end: 95 },
  [UploadPhase.Complete]: { start: 95, end: 100 },
  [UploadPhase.Failed]: { start: 0, end: 0 },
} as const

/**
 * Batch size for sentiment analysis processing
 *
 * Process comments in chunks to avoid UI blocking. Batching allows progress
 * updates between chunks and enables cancellation checks.
 *
 */
const SENTIMENT_BATCH_SIZE = 50

/**
 * Initial upload state
 */
const INITIAL_STATE: UploadState = Object.freeze({
  phase: UploadPhase.Idle,
  progress: 0,
  message: '',
  errors: Object.freeze([]),
  warnings: Object.freeze([]),
  filesSelected: Object.freeze({}),
  isZipUpload: false,
  result: undefined,
})

/**
 * Initial upload stats
 */
const INITIAL_STATS: UploadStats = Object.freeze({
  competitorsAdded: 0,
  roundsAdded: 0,
  submissionsAdded: 0,
  votesAdded: 0,
  orphansDetected: 0,
  commentsAnalyzed: 0,
})

/**
 * Delay between upload phases in milliseconds
 *
 * Adds an artificial pause between phases to improve perceived responsiveness
 * and give users time to see progress updates. Without delays, phases complete
 * too quickly on small datasets, making the UI feel jarring.
 *
 */
const PHASE_TRANSITION_DELAY_MS = 800

/**
 * Utility function to add artificial delay for UX
 *
 * @param ms - Base delay in milliseconds
 * @returns Promise that resolves after the randomized delay
 *
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms * (Math.random() + 0.2)))

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for managing Music League profile upload flow
 *
 * Provides comprehensive upload management including file selection,
 * parsing, validation, orphan detection, sentiment analysis, and database insertion.
 *
 * @returns Upload state and control functions
 *
 * @example
 * ```tsx
 * function UploadComponent() {
 *   const { uploadState, selectFiles, startUpload, reset, canUpload } = useProfileUpload();
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     if (e.target.files) {
 *       await selectFiles(Array.from(e.target.files));
 *     }
 *   };
 *
 *   const handleUpload = async () => {
 *     const result = await startUpload('My League 2024');
 *     if (result.success) {
 *       console.log('Upload successful!', result.stats);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" multiple onChange={handleFileChange} />
 *       <button onClick={handleUpload} disabled={!canUpload}>Upload</button>
 *       <ProgressBar value={uploadState.progress} />
 *       <p>{uploadState.message}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useProfileUpload() {
  // ============================================================================
  // State Management
  // ============================================================================

  const [uploadState, setUploadState] = useState<UploadState>(INITIAL_STATE)
  const { setActiveProfile, refreshProfiles } = useProfileContext()

  // Use ref to track if component is mounted (for cleanup)
  const isMountedRef = useRef<boolean>(true)

  // Use ref to allow cancellation of ongoing uploads
  const abortControllerRef = useRef<AbortController | null>(null)

  // ============================================================================
  // Lifecycle
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Cancel any ongoing upload
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ============================================================================
  // State Update Helpers
  // ============================================================================

  /**
   * Update upload state (only if component is still mounted)
   */
  const updateState = useCallback((updates: Partial<UploadState>) => {
    if (isMountedRef.current) {
      setUploadState(prev => {
        return { ...prev, ...updates }
      })
    }
  }, [])

  /**
   * Set upload phase and update progress
   */
  const setPhase = useCallback(
    (phase: UploadPhase, message: string) => {
      const progressRange = PHASE_PROGRESS[phase]
      const progress = progressRange ? progressRange.start : 0
      updateState({ phase, message, progress })
    },
    [updateState]
  )

  /**
   * Update progress within current phase
   */
  const updateProgress = useCallback(
    (phase: UploadPhase, percentage: number, message?: string) => {
      const range = PHASE_PROGRESS[phase]
      if (!range) return

      const progress = range.start + ((range.end - range.start) * percentage) / 100
      const updates: Writable<Partial<UploadState>> = { progress }
      if (message) updates.message = message
      updateState(updates)
    },
    [updateState]
  )

  // ============================================================================
  // File Selection
  // ============================================================================

  /**
   * Select files for upload
   *
   * Handles both ZIP files (single file) and individual CSVs (4 files).
   * Automatically detects file types and validates selection.
   *
   * @param files - File or array of files to upload
   * @returns The selected files object, or null if selection failed
   */
  const selectFiles = useCallback(
    async (files: File[] | File): Promise<UploadState['filesSelected'] | null> => {
      const fileArray = Array.isArray(files) ? files : [files]

      if (fileArray.length === 0) {
        updateState({
          phase: UploadPhase.Idle,
          errors: [
            {
              severity: ValidationSeverity.Error,
              fileType: CsvFileType.Competitors,
              lineNumber: null,
              column: null,
              message: 'No files selected',
            },
          ],
        })
        return null
      }

      setPhase(UploadPhase.SelectingFiles, 'Processing selected files...')

      try {
        // Check if single ZIP file
        if (fileArray.length === 1 && isZipFile(fileArray[0]!)) {
          const zipResult = await extractProfileZip(fileArray[0]!)

          if (!validateZipContents(zipResult)) {
            updateState({
              phase: UploadPhase.Failed,
              errors: zipResult.errors.map(msg => ({
                severity: ValidationSeverity.Error,
                fileType: CsvFileType.Competitors,
                lineNumber: null,
                column: null,
                message: msg,
              })),
              message: 'Invalid ZIP file',
            })
            return null
          }

          const selectedFiles = zipResult.files
          updateState({
            phase: UploadPhase.SelectingFiles,
            filesSelected: selectedFiles,
            isZipUpload: true,
            message: 'ZIP file extracted successfully',
            errors: [],
            warnings: [],
          })
          return selectedFiles
        }

        // Handle individual CSV files
        const detectedFiles: Writable<UploadState['filesSelected']> = {}
        const detectionErrors: ValidationError[] = []

        for (const file of fileArray) {
          try {
            // Parse first few rows to detect type
            const parseResult = await parseCompetitorsCSV(file)
            const columns = parseResult.meta.fields
            const fileType = detectFileTypeHybrid(file.name, columns)

            if (!fileType) {
              detectionErrors.push({
                severity: ValidationSeverity.Error,
                fileType: CsvFileType.Competitors,
                lineNumber: null,
                column: null,
                message: `Cannot determine file type for: ${file.name}`,
              })
              continue
            }

            // Assign file to appropriate slot
            if (fileType === CsvFileType.Competitors) {
              detectedFiles.competitors = file
            } else if (fileType === CsvFileType.Rounds) {
              detectedFiles.rounds = file
            } else if (fileType === CsvFileType.Submissions) {
              detectedFiles.submissions = file
            } else if (fileType === CsvFileType.Votes) {
              detectedFiles.votes = file
            }
          } catch (error) {
            detectionErrors.push({
              severity: ValidationSeverity.Error,
              fileType: CsvFileType.Competitors,
              lineNumber: null,
              column: null,
              message: `Failed to process file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })
          }
        }

        // Validate all required files are present
        const requiredFiles: Array<{
          key: keyof typeof detectedFiles
          type: CsvFileType
          name: string
        }> = [
          { key: 'competitors', type: CsvFileType.Competitors, name: 'competitors.csv' },
          { key: 'rounds', type: CsvFileType.Rounds, name: 'rounds.csv' },
          { key: 'submissions', type: CsvFileType.Submissions, name: 'submissions.csv' },
          { key: 'votes', type: CsvFileType.Votes, name: 'votes.csv' },
        ]

        for (const { key, type, name } of requiredFiles) {
          if (!detectedFiles[key]) {
            detectionErrors.push({
              severity: ValidationSeverity.Error,
              fileType: type,
              lineNumber: null,
              column: null,
              message: `Missing required file: ${name}`,
            })
          }
        }

        if (detectionErrors.length > 0) {
          updateState({
            phase: UploadPhase.Failed,
            errors: detectionErrors,
            message: 'File selection validation failed',
          })
          return null
        }

        updateState({
          phase: UploadPhase.SelectingFiles,
          filesSelected: detectedFiles,
          isZipUpload: false,
          message: 'Files selected successfully',
          errors: [],
          warnings: [],
        })
        return detectedFiles
      } catch (error) {
        // Preserve specific error context for better debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const isZipError = errorMessage.includes('ZIP') || errorMessage.includes('zip')
        const isCsvError = errorMessage.includes('CSV') || errorMessage.includes('parse')

        let userMessage = 'File selection failed'
        if (isZipError) {
          userMessage = 'ZIP file processing failed'
        } else if (isCsvError) {
          userMessage = 'CSV file processing failed'
        }

        updateState({
          phase: UploadPhase.Failed,
          errors: [
            {
              severity: ValidationSeverity.Error,
              fileType: CsvFileType.Competitors,
              lineNumber: null,
              column: null,
              message: `${userMessage}: ${errorMessage}`,
            },
          ],
          message: userMessage,
        })
        return null
      }
    },
    [setPhase, updateState]
  )

  // ============================================================================
  // Upload Process
  // ============================================================================

  /**
   * Start the upload process
   *
   * Executes the complete upload flow from parsing through database insertion.
   * Handles all phases with comprehensive error handling and progress tracking.
   *
   * @param profileName - Name for the new profile
   * @param files - Optional files to upload. If not provided, uses files from state.
   *                Recommended to always pass files to avoid race conditions.
   * @returns Upload result with success status and statistics
   */
  const startUpload = useCallback(
    async (profileName: string, files?: UploadState['filesSelected']): Promise<UploadResult> => {
      const stats: Writable<UploadStats> = { ...INITIAL_STATS }
      const allErrors: ValidationError[] = []
      const allWarnings: ValidationError[] = []

      // Clean up any existing abort controller before creating new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create abort controller for this upload
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      try {
        // Use passed files OR fall back to state (for backwards compatibility)
        const filesToUpload = files || uploadState.filesSelected
        const { competitors, rounds, submissions, votes } = filesToUpload
        if (!competitors || !rounds || !submissions || !votes) {
          throw new Error('Not all required files are selected')
        }

        // Check if cancelled before starting
        if (signal.aborted) throw new Error('Upload cancelled by user')

        // ========================================================================
        // PHASE: PARSING (0-15%)
        // ========================================================================

        setPhase(UploadPhase.Parsing, 'Parsing CSV files...')

        const [competitorsResult, roundsResult, submissionsResult, votesResult] = await Promise.all(
          [
            parseCompetitorsCSV(competitors),
            parseRoundsCSV(rounds),
            parseSubmissionsCSV(submissions),
            parseVotesCSV(votes),
          ]
        )

        // Check for parse errors
        const parseErrors = [
          ...competitorsResult.errors,
          ...roundsResult.errors,
          ...submissionsResult.errors,
          ...votesResult.errors,
        ]

        if (parseErrors.length > 0) {
          allErrors.push(
            ...parseErrors.map(err => ({
              severity: ValidationSeverity.Error,
              fileType: CsvFileType.Competitors,
              lineNumber: err.row ?? null,
              column: null,
              message: err.message,
            }))
          )
        }

        updateProgress(UploadPhase.Parsing, 100, 'CSV files parsed successfully')
        await sleep(PHASE_TRANSITION_DELAY_MS)

        // Check if cancelled after parsing
        if (signal.aborted) throw new Error('Upload cancelled by user')

        // ========================================================================
        // PHASE: VALIDATING (15-30%)
        // ========================================================================

        setPhase(UploadPhase.Validating, 'Validating data structure...')

        // Validate column structure
        const columnValidations = [
          {
            type: CsvFileType.Competitors,
            result: validateColumnStructure(CsvFileType.Competitors, competitorsResult.meta.fields),
          },
          {
            type: CsvFileType.Rounds,
            result: validateColumnStructure(CsvFileType.Rounds, roundsResult.meta.fields),
          },
          {
            type: CsvFileType.Submissions,
            result: validateColumnStructure(CsvFileType.Submissions, submissionsResult.meta.fields),
          },
          {
            type: CsvFileType.Votes,
            result: validateColumnStructure(CsvFileType.Votes, votesResult.meta.fields),
          },
        ]

        for (const { type, result } of columnValidations) {
          const errors = createColumnValidationErrors(result, type)
          allErrors.push(...errors.filter(e => e.severity === ValidationSeverity.Error))
          allWarnings.push(...errors.filter(e => e.severity === ValidationSeverity.Warning))
        }

        updateProgress(UploadPhase.Validating, 50, 'Validating row data...')

        // Validate row data
        const rowValidations: ValidationResult[] = [
          validateRows(
            CsvFileType.Competitors,
            competitorsResult.data as unknown as Record<string, unknown>[],
            100
          ),
          validateRows(
            CsvFileType.Rounds,
            roundsResult.data as unknown as Record<string, unknown>[],
            100
          ),
          validateRows(
            CsvFileType.Submissions,
            submissionsResult.data as unknown as Record<string, unknown>[],
            100
          ),
          validateRows(
            CsvFileType.Votes,
            votesResult.data as unknown as Record<string, unknown>[],
            100
          ),
        ]

        for (const validation of rowValidations) {
          allErrors.push(...validation.errors)
          allWarnings.push(...validation.warnings)
        }

        // Check for critical errors
        if (allErrors.length > 0) {
          updateState({
            phase: UploadPhase.Failed,
            errors: allErrors,
            warnings: allWarnings,
            message: `Validation failed with ${allErrors.length} error(s)`,
          })
          return {
            success: false,
            errors: allErrors,
            stats,
          }
        }

        updateProgress(UploadPhase.Validating, 100, 'Validation completed successfully')
        updateState({ warnings: allWarnings })
        await sleep(PHASE_TRANSITION_DELAY_MS)

        // Check if cancelled after validation
        if (signal.aborted) throw new Error('Upload cancelled by user')

        // ========================================================================
        // PHASE: DETECTING ORPHANS (30-40%)
        // ========================================================================

        setPhase(UploadPhase.DetectingOrphans, 'Detecting orphaned competitors...')

        // Generate temporary profile ID for orphan detection
        const tempProfileId = createProfileId(crypto.randomUUID())

        const orphanResult: OrphanDetectionResult = detectOrphanedCompetitors(
          competitorsResult.data,
          submissionsResult.data,
          votesResult.data,
          tempProfileId
        )

        stats.orphansDetected = orphanResult.stats.totalOrphans

        updateProgress(
          UploadPhase.DetectingOrphans,
          100,
          `Detected ${stats.orphansDetected} orphaned competitor(s)`
        )
        await sleep(PHASE_TRANSITION_DELAY_MS)

        // Check if cancelled after orphan detection
        if (signal.aborted) throw new Error('Upload cancelled by user')

        // ========================================================================
        // PHASE: ANALYZING (40-70%)
        // ========================================================================

        setPhase(UploadPhase.Analyzing, 'Analyzing comment sentiment...')

        // Collect all comments from submissions and votes
        const submissionComments = submissionsResult.data
          .filter(s => s.Comment && s.Comment.trim().length > 0)
          .map(s => s.Comment)

        const voteComments = votesResult.data
          .filter(v => v.Comment && v.Comment.trim().length > 0)
          .map(v => v.Comment)

        const allComments = [...submissionComments, ...voteComments]
        const totalComments = allComments.length
        stats.commentsAnalyzed = totalComments

        // Process comments in batches
        const sentimentScores: SentimentScore[] = []
        let processedComments = 0

        for (let i = 0; i < allComments.length; i += SENTIMENT_BATCH_SIZE) {
          // Check if cancelled during batch processing
          if (signal.aborted) throw new Error('Upload cancelled by user')

          const batch = allComments.slice(i, i + SENTIMENT_BATCH_SIZE)
          const batchScores = batchAnalyzeSentiment(batch)
          sentimentScores.push(...batchScores)

          processedComments += batch.length
          const percentage = Math.round((processedComments / totalComments) * 100)
          updateProgress(
            UploadPhase.Analyzing,
            percentage,
            `Analyzing sentiment: ${processedComments} of ${totalComments} comments`
          )

          // Allow UI to update between batches
          await new Promise(resolve => setTimeout(resolve, 0))
        }

        updateProgress(
          UploadPhase.Analyzing,
          100,
          `Sentiment analysis complete for ${totalComments} comments`
        )
        await sleep(PHASE_TRANSITION_DELAY_MS)

        // Check if cancelled after sentiment analysis
        if (signal.aborted) throw new Error('Upload cancelled by user')

        // ========================================================================
        // PHASE: INSERTING (70-95%)
        // ========================================================================

        setPhase(UploadPhase.Inserting, 'Creating profile...')

        // Generate final profile ID
        const profileId = createProfileId(crypto.randomUUID())

        // Convert CSV rows to database entities
        updateProgress(UploadPhase.Inserting, 10, 'Converting competitors...')

        const regularCompetitors: Competitor[] = competitorsResult.data.map(row => ({
          id: createCompetitorId(row.ID),
          name: row.Name,
          profileId,
          isOrphaned: false,
        }))

        // Update orphaned competitors with final profile ID
        const orphanedCompetitors: Competitor[] = orphanResult.orphanedCompetitors.map(comp => ({
          ...comp,
          profileId,
        }))

        const allCompetitors = mergeCompetitors(regularCompetitors, orphanedCompetitors)
        stats.competitorsAdded = allCompetitors.length

        updateProgress(UploadPhase.Inserting, 20, 'Converting rounds...')

        const dbRounds: Round[] = roundsResult.data.map(row => ({
          id: createRoundId(row.ID),
          name: row.Name,
          description: row.Description,
          playlistUrl: row['Playlist URL'],
          createdAt: new Date(row.Created),
          profileId,
        }))
        stats.roundsAdded = dbRounds.length

        updateProgress(UploadPhase.Inserting, 30, 'Converting submissions with sentiment...')

        let sentimentIndex = 0
        updateProgress(UploadPhase.Inserting, 30, 'Converting submissions...')

        const roundSubmissionsMap = new Map<string, { uri: string; points: number }[]>()
        const submissionPointsMap = new Map<string, number>()

        submissionsResult.data.forEach(subRow => {
          const uri = createSpotifyUri(subRow['Spotify URI'])
          const roundId = createRoundId(subRow['Round ID'])

          const subVotes = votesResult.data.filter(v => v['Spotify URI'] === uri)
          const points = subVotes.reduce((sum, v) => sum + parseInt(v['Points Assigned'], 10), 0)

          submissionPointsMap.set(uri, points)

          if (!roundSubmissionsMap.has(roundId)) {
            roundSubmissionsMap.set(roundId, [])
          }
          roundSubmissionsMap.get(roundId)!.push({ uri, points })
        })

        const submissionRankMap = new Map<string, number>()
        roundSubmissionsMap.forEach(subs => {
          subs.sort((a, b) => b.points - a.points)

          subs.forEach((sub, index) => {
            submissionRankMap.set(sub.uri, index + 1)
          })
        })

        const dbSubmissions: SubmissionWithSentiment[] = submissionsResult.data.map(row => {
          const uri = createSpotifyUri(row['Spotify URI'])
          const submission: SubmissionWithSentiment = {
            spotifyUri: uri,
            title: row.Title,
            album: row.Album,
            artists: row['Artist(s)'].split(',').map(a => a.trim()),
            submitterId: createCompetitorId(row['Submitter ID']),
            createdAt: new Date(row.Created),
            comment: row.Comment,
            roundId: createRoundId(row['Round ID']),
            visibleToVoters: row['Visible To Voters'] === 'Yes',
            profileId,
            rankInRound: submissionRankMap.get(uri),
          }

          // Attach sentiment if comment exists
          if (row.Comment && row.Comment.trim().length > 0) {
            if (sentimentIndex < sentimentScores.length) {
              submission.sentiment = sentimentScores[sentimentIndex++]
            } else {
              console.warn('Sentiment index out of bounds for submission - comment count mismatch')
            }
          }

          return submission
        })
        stats.submissionsAdded = dbSubmissions.length

        updateProgress(UploadPhase.Inserting, 40, 'Converting votes with sentiment...')

        const dbVotes: VoteWithSentiment[] = votesResult.data.map(row => {
          const vote: VoteWithSentiment = {
            spotifyUri: createSpotifyUri(row['Spotify URI']),
            voterId: createCompetitorId(row['Voter ID']),
            createdAt: new Date(row.Created),
            pointsAssigned: parseInt(row['Points Assigned'], 10),
            comment: row.Comment,
            roundId: createRoundId(row['Round ID']),
            profileId,
          }

          // Attach sentiment if comment exists
          if (row.Comment && row.Comment.trim().length > 0) {
            if (sentimentIndex < sentimentScores.length) {
              vote.sentiment = sentimentScores[sentimentIndex++]
            } else {
              console.warn('Sentiment index out of bounds for vote - comment count mismatch')
            }
          }

          return vote
        })
        stats.votesAdded = dbVotes.length

        // Calculate date ranges
        const roundDates = dbRounds.map(r => r.createdAt)
        const submissionDates = dbSubmissions.map(s => s.createdAt)
        const voteDates = dbVotes.map(v => v.createdAt)

        const roundDateRange =
          roundDates.length > 0
            ? {
                earliest: new Date(Math.min(...roundDates.map(d => d.getTime()))),
                latest: new Date(Math.max(...roundDates.map(d => d.getTime()))),
              }
            : null

        const submissionDateRange =
          submissionDates.length > 0
            ? {
                earliest: new Date(Math.min(...submissionDates.map(d => d.getTime()))),
                latest: new Date(Math.max(...submissionDates.map(d => d.getTime()))),
              }
            : null

        const voteDateRange =
          voteDates.length > 0
            ? {
                earliest: new Date(Math.min(...voteDates.map(d => d.getTime()))),
                latest: new Date(Math.max(...voteDates.map(d => d.getTime()))),
              }
            : null

        // Create profile object
        const now = new Date()
        const profile: Profile = {
          id: profileId,
          name: profileName,
          createdAt: now,
          updatedAt: now,
          competitors: {
            total: allCompetitors.length,
            active: regularCompetitors.length,
            orphaned: orphanedCompetitors.length,
          },
          roundCount: dbRounds.length,
          submissionCount: dbSubmissions.length,
          voteCount: dbVotes.length,
          roundDateRange,
          submissionDateRange,
          voteDateRange,
          notes: '',
        }

        updateProgress(UploadPhase.Inserting, 50, 'Inserting data into database...')

        // Insert all data in a transaction for atomicity
        const db = await getDatabase()
        const tx = db.transaction(
          ['profiles', 'competitors', 'rounds', 'submissions', 'votes'],
          'readwrite'
        )

        try {
          // Insert profile
          await tx.objectStore('profiles').add(profile)
          updateProgress(UploadPhase.Inserting, 60, 'Profile created')

          // Check for cancellation after profile insert
          if (signal.aborted) {
            tx.abort()
            throw new Error('Upload cancelled by user')
          }

          // Insert competitors
          const competitorStore = tx.objectStore('competitors')
          await Promise.all(allCompetitors.map(competitor => competitorStore.add(competitor)))
          updateProgress(UploadPhase.Inserting, 70, `Inserted ${allCompetitors.length} competitors`)

          // Check for cancellation after competitors insert
          if (signal.aborted) {
            tx.abort()
            throw new Error('Upload cancelled by user')
          }

          // Insert rounds
          const roundStore = tx.objectStore('rounds')
          await Promise.all(dbRounds.map(round => roundStore.add(round)))
          updateProgress(UploadPhase.Inserting, 80, `Inserted ${dbRounds.length} rounds`)

          // Check for cancellation after rounds insert
          if (signal.aborted) {
            tx.abort()
            throw new Error('Upload cancelled by user')
          }

          // Insert submissions with sentiment data
          const submissionStore = tx.objectStore('submissions')
          await Promise.all(
            dbSubmissions.map(submission => {
              // Include sentiment data if available
              const submissionToStore = {
                ...submission,
                sentimentScore: submission.sentiment?.comparative,
                sentimentLabel: submission.sentiment
                  ? getSentimentLabelFromScore(submission.sentiment)
                  : undefined,
              }

              // Remove the temporary sentiment object (we've extracted the data we need)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { sentiment, ...submissionData } = submissionToStore
              return submissionStore.add(submissionData)
            })
          )
          updateProgress(UploadPhase.Inserting, 85, `Inserted ${dbSubmissions.length} submissions`)

          // Check for cancellation after submissions insert
          if (signal.aborted) {
            tx.abort()
            throw new Error('Upload cancelled by user')
          }

          // Insert votes with sentiment data
          const voteStore = tx.objectStore('votes')
          await Promise.all(
            dbVotes.map(vote => {
              // Include sentiment data if available
              const voteToStore = {
                ...vote,
                sentimentScore: vote.sentiment?.comparative,
                sentimentLabel: vote.sentiment
                  ? getSentimentLabelFromScore(vote.sentiment)
                  : undefined,
              }

              // Remove the temporary sentiment object
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { sentiment, ...voteData } = voteToStore
              return voteStore.add(voteData)
            })
          )
          updateProgress(UploadPhase.Inserting, 90, `Inserted ${dbVotes.length} votes`)

          // Check for cancellation after votes insert
          if (signal.aborted) {
            tx.abort()
            throw new Error('Upload cancelled by user')
          }

          // Commit transaction
          await tx.done
          updateProgress(UploadPhase.Inserting, 100, 'Database insertion complete')
        } catch (error) {
          // Explicitly abort transaction to guarantee rollback
          tx.abort()
          throw new Error(
            `Database insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }

        // ========================================================================
        // PHASE: COMPLETE (95-100%)
        // ========================================================================

        setPhase(UploadPhase.Complete, 'Upload completed successfully')

        // Update ProfileContext
        await refreshProfiles()
        await setActiveProfile(profileId)

        updateProgress(UploadPhase.Complete, 100, 'Profile activated')

        // Store result in state for UI components
        updateState({
          result: {
            success: true,
            profileId,
            profileName,
            stats,
          },
        })

        return {
          success: true,
          profileId,
          profileName,
          stats,
        }
      } catch (error) {
        // Handle any unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        const wasCancelled = errorMessage === 'Upload cancelled by user'

        if (wasCancelled) {
          // User cancelled - reset to idle state without showing error
          updateState({
            phase: UploadPhase.Idle,
            errors: [],
            warnings: [],
            message: '',
          })
        } else {
          // Actual error - show failed state
          updateState({
            phase: UploadPhase.Failed,
            errors: [
              ...allErrors,
              {
                severity: ValidationSeverity.Error,
                fileType: CsvFileType.Competitors,
                lineNumber: null,
                column: null,
                message: errorMessage,
              },
            ],
            warnings: allWarnings,
            message: `Upload failed: ${errorMessage}`,
          })
        }

        return {
          success: false,
          errors: wasCancelled ? [] : allErrors,
          stats,
        }
      } finally {
        abortControllerRef.current = null
      }
    },

    // Intentionally exclude uploadState.filesSelected - files are passed as parameter to avoid stale closures
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setPhase, updateProgress, updateState, refreshProfiles, setActiveProfile]
  )

  // ============================================================================
  // Reset
  // ============================================================================

  /**
   * Reset upload state to initial values
   * Cancels any ongoing upload
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setUploadState(INITIAL_STATE)
  }, [])

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Whether upload can be started
   * Requires all files to be selected and not currently uploading
   */
  const canUpload =
    uploadState.phase === UploadPhase.SelectingFiles &&
    !!uploadState.filesSelected.competitors &&
    !!uploadState.filesSelected.rounds &&
    !!uploadState.filesSelected.submissions &&
    !!uploadState.filesSelected.votes

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    uploadState,
    selectFiles,
    startUpload,
    reset,
    canUpload,
  }
}
