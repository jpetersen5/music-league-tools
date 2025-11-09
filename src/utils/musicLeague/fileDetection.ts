/**
 * CSV File Type Detection
 *
 * Auto-detect Music League CSV file types based on column signatures
 *
 * @module utils/musicLeague/fileDetection
 */

import { CsvFileType } from '@/types/musicLeague'

// ============================================================================
// Expected Column Definitions
// ============================================================================

/**
 * Expected columns for each CSV type
 */
export const EXPECTED_COLUMNS: Record<CsvFileType, readonly string[]> = {
  [CsvFileType.Competitors]: ['ID', 'Name'],
  [CsvFileType.Rounds]: ['ID', 'Created', 'Name', 'Description', 'Playlist URL'],
  [CsvFileType.Submissions]: [
    'Spotify URI',
    'Title',
    'Album',
    'Artist(s)',
    'Submitter ID',
    'Created',
    'Comment',
    'Round ID',
    'Visible To Voters',
  ],
  [CsvFileType.Votes]: [
    'Spotify URI',
    'Voter ID',
    'Created',
    'Points Assigned',
    'Comment',
    'Round ID',
  ],
}

/**
 * Unique signature columns that definitively identify each CSV type
 */
const SIGNATURE_COLUMNS: Record<CsvFileType, readonly string[]> = {
  [CsvFileType.Rounds]: ['Playlist URL'],
  [CsvFileType.Submissions]: ['Visible To Voters', 'Submitter ID'],
  [CsvFileType.Votes]: ['Points Assigned', 'Voter ID'],
  [CsvFileType.Competitors]: ['Name'], // Fallback - has fewest columns
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect CSV file type based on column headers
 *
 * @param columns - Array of column headers from CSV file
 * @returns Detected file type or null if cannot be determined
 */
export function detectFileType(columns: string[]): CsvFileType | null {
  const normalizedColumns = columns.map(col => col.trim())

  // Check for unique signature columns in priority order
  // (most specific first)

  // Check for Rounds (Playlist URL is unique)
  if (SIGNATURE_COLUMNS[CsvFileType.Rounds].every(sig => normalizedColumns.includes(sig))) {
    return CsvFileType.Rounds
  }

  // Check for Submissions (Visible To Voters and Submitter ID)
  if (SIGNATURE_COLUMNS[CsvFileType.Submissions].every(sig => normalizedColumns.includes(sig))) {
    return CsvFileType.Submissions
  }

  // Check for Votes (Points Assigned and Voter ID)
  if (SIGNATURE_COLUMNS[CsvFileType.Votes].every(sig => normalizedColumns.includes(sig))) {
    return CsvFileType.Votes
  }

  // Check for Competitors (fallback - simplest structure)
  if (
    SIGNATURE_COLUMNS[CsvFileType.Competitors].every(sig => normalizedColumns.includes(sig)) &&
    normalizedColumns.length <= 3 // Competitors has only 2-3 columns
  ) {
    return CsvFileType.Competitors
  }

  return null
}

/**
 * Detect file type based on filename
 *
 * @param filename - Name of the file
 * @returns Detected file type or null if cannot be determined
 */
export function detectFileTypeByName(filename: string): CsvFileType | null {
  const lowerName = filename.toLowerCase()

  if (lowerName.includes('competitor')) {
    return CsvFileType.Competitors
  }
  if (lowerName.includes('round')) {
    return CsvFileType.Rounds
  }
  if (lowerName.includes('submission')) {
    return CsvFileType.Submissions
  }
  if (lowerName.includes('vote')) {
    return CsvFileType.Votes
  }

  return null
}

/**
 * Detect file type using both filename and column headers
 * Prefers column-based detection for accuracy
 *
 * @param filename - Name of the file
 * @param columns - Array of column headers from CSV file
 * @returns Detected file type or null if cannot be determined
 */
export function detectFileTypeHybrid(filename: string, columns: string[]): CsvFileType | null {
  // First try column-based detection (more reliable)
  const columnDetection = detectFileType(columns)
  if (columnDetection !== null) {
    return columnDetection
  }

  // Fall back to filename-based detection
  return detectFileTypeByName(filename)
}

/**
 * Check if columns match expected columns for a given file type
 *
 * @param fileType - CSV file type
 * @param columns - Array of column headers from CSV file
 * @returns True if columns match expected structure
 */
export function validateColumns(fileType: CsvFileType, columns: string[]): boolean {
  const normalizedColumns = columns.map(col => col.trim())
  const expected = EXPECTED_COLUMNS[fileType]

  // Check if all expected columns are present
  return expected.every(expectedCol => normalizedColumns.includes(expectedCol))
}

/**
 * Get missing columns for a given file type
 *
 * @param fileType - CSV file type
 * @param columns - Array of column headers from CSV file
 * @returns Array of missing column names
 */
export function getMissingColumns(fileType: CsvFileType, columns: string[]): string[] {
  const normalizedColumns = columns.map(col => col.trim())
  const expected = EXPECTED_COLUMNS[fileType]

  return expected.filter(expectedCol => !normalizedColumns.includes(expectedCol))
}

/**
 * Get extra columns not expected for a given file type
 *
 * @param fileType - CSV file type
 * @param columns - Array of column headers from CSV file
 * @returns Array of extra column names
 */
export function getExtraColumns(fileType: CsvFileType, columns: string[]): string[] {
  const normalizedColumns = columns.map(col => col.trim())
  const expected = EXPECTED_COLUMNS[fileType]

  return normalizedColumns.filter(actualCol => !expected.includes(actualCol))
}

/**
 * Get a user-friendly description of the file type
 *
 * @param fileType - CSV file type
 * @returns Human-readable description
 */
export function getFileTypeDescription(fileType: CsvFileType): string {
  switch (fileType) {
    case CsvFileType.Competitors:
      return 'Competitors (list of league participants)'
    case CsvFileType.Rounds:
      return 'Rounds (themed voting rounds)'
    case CsvFileType.Submissions:
      return 'Submissions (songs submitted by competitors)'
    case CsvFileType.Votes:
      return 'Votes (votes cast by competitors on submissions)'
  }
}
