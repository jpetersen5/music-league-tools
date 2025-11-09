/**
 * CSV Validation Utility
 *
 * Validate CSV structure and data with detailed error reporting
 *
 * @module utils/musicLeague/validation
 */

import type {
  ValidationError,
  CompetitorCsvRow,
  RoundCsvRow,
  SubmissionCsvRow,
  VoteCsvRow,
} from '@/types/musicLeague'
import { ValidationSeverity, CsvFileType } from '@/types/musicLeague'
import {
  EXPECTED_COLUMNS,
  getMissingColumns,
  getExtraColumns,
  validateColumns,
} from './fileDetection'

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  infos: ValidationError[]
}

export interface ColumnValidationResult {
  valid: boolean
  missingColumns: string[]
  extraColumns: string[]
  expectedColumns: string[]
  actualColumns: string[]
}

// ============================================================================
// Column Validation
// ============================================================================

/**
 * Validate CSV column structure
 *
 * @param fileType - Expected CSV file type
 * @param actualColumns - Actual column headers from CSV
 * @returns Validation result with details
 */
export function validateColumnStructure(
  fileType: CsvFileType,
  actualColumns: string[]
): ColumnValidationResult {
  const missing = getMissingColumns(fileType, actualColumns)
  const extra = getExtraColumns(fileType, actualColumns)
  const valid = validateColumns(fileType, actualColumns)

  return {
    valid,
    missingColumns: missing,
    extraColumns: extra,
    expectedColumns: [...EXPECTED_COLUMNS[fileType]],
    actualColumns: actualColumns.map(col => col.trim()),
  }
}

/**
 * Create validation errors for column mismatches
 *
 * @param columnResult - Column validation result
 * @param fileType - CSV file type
 * @returns Array of validation errors
 */
export function createColumnValidationErrors(
  columnResult: ColumnValidationResult,
  fileType: CsvFileType
): ValidationError[] {
  const errors: ValidationError[] = []

  if (columnResult.missingColumns.length > 0) {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: null,
      column: null,
      message: `Missing required columns: ${columnResult.missingColumns.join(', ')}. Expected: ${columnResult.expectedColumns.join(', ')}. Actual: ${columnResult.actualColumns.join(', ')}. Ensure your CSV file contains all required columns for ${fileType} data.`,
      value: {
        missing: columnResult.missingColumns,
        expected: columnResult.expectedColumns,
        actual: columnResult.actualColumns,
      },
    })
  }

  if (columnResult.extraColumns.length > 0) {
    errors.push({
      severity: ValidationSeverity.Warning,
      fileType,
      lineNumber: null,
      column: null,
      message: `Unexpected columns found: ${columnResult.extraColumns.join(', ')}. These will be ignored during import.`,
      value: {
        extra: columnResult.extraColumns,
        expected: columnResult.expectedColumns,
        actual: columnResult.actualColumns,
      },
    })
  }

  return errors
}

// ============================================================================
// Row Data Validation
// ============================================================================

/**
 * Validate a competitor row
 *
 * @param row - CSV row data
 * @param rowIndex - Row number (for error reporting)
 * @param fileType - CSV file type for error context
 * @returns Array of validation errors
 */
export function validateCompetitorRow(
  row: Partial<CompetitorCsvRow>,
  rowIndex: number,
  fileType: CsvFileType = CsvFileType.Competitors
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!row.ID || row.ID.trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'ID',
      message: 'Competitor ID is required. Ensure every competitor has a valid ID.',
      value: row.ID ?? '',
    })
  }

  if (!row.Name || row.Name.trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Name',
      message: 'Competitor name is required. Ensure every competitor has a name.',
      value: row.Name ?? '',
    })
  }

  return errors
}

/**
 * Validate a round row
 *
 * @param row - CSV row data
 * @param rowIndex - Row number (for error reporting)
 * @param fileType - CSV file type for error context
 * @returns Array of validation errors
 */
export function validateRoundRow(
  row: Partial<RoundCsvRow>,
  rowIndex: number,
  fileType: CsvFileType = CsvFileType.Rounds
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!row.ID || row.ID.trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'ID',
      message: 'Round ID is required. Ensure every round has a valid ID.',
      value: row.ID ?? '',
    })
  }

  if (!row.Name || row.Name.trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Name',
      message: 'Round name is required. Ensure every round has a name.',
      value: row.Name ?? '',
    })
  }

  if (!row.Created || row.Created.trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Created',
      message:
        'Round creation date is required. Ensure every round has a valid creation timestamp.',
      value: row.Created ?? '',
    })
  } else {
    // Validate ISO date format
    const date = new Date(row.Created)
    if (isNaN(date.getTime())) {
      errors.push({
        severity: ValidationSeverity.Error,
        fileType,
        lineNumber: rowIndex,
        column: 'Created',
        message:
          'Invalid date format. Date must be in ISO 8601 format (e.g., 2025-03-03T00:46:13Z).',
        value: row.Created,
      })
    }
  }

  if (!row['Playlist URL'] || row['Playlist URL'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Warning,
      fileType,
      lineNumber: rowIndex,
      column: 'Playlist URL',
      message: 'Playlist URL is missing. Round will not have a linked Spotify playlist.',
      value: row['Playlist URL'] ?? '',
    })
  }

  return errors
}

/**
 * Validate a submission row
 *
 * @param row - CSV row data
 * @param rowIndex - Row number (for error reporting)
 * @param fileType - CSV file type for error context
 * @returns Array of validation errors
 */
export function validateSubmissionRow(
  row: Partial<SubmissionCsvRow>,
  rowIndex: number,
  fileType: CsvFileType = CsvFileType.Submissions
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!row['Spotify URI'] || row['Spotify URI'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Spotify URI',
      message: 'Spotify URI is required. Every submission must have a valid Spotify track URI.',
      value: row['Spotify URI'] ?? '',
    })
  } else if (!row['Spotify URI'].startsWith('spotify:track:')) {
    errors.push({
      severity: ValidationSeverity.Warning,
      fileType,
      lineNumber: rowIndex,
      column: 'Spotify URI',
      message: 'Spotify URI format may be invalid. URI should start with "spotify:track:TRACK_ID".',
      value: row['Spotify URI'],
    })
  }

  if (!row['Submitter ID'] || row['Submitter ID'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Submitter ID',
      message: 'Submitter ID is required. Every submission must be associated with a competitor.',
      value: row['Submitter ID'] ?? '',
    })
  }

  if (!row['Round ID'] || row['Round ID'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Round ID',
      message: 'Round ID is required. Every submission must be associated with a round.',
      value: row['Round ID'] ?? '',
    })
  }

  if (!row.Title || row.Title.trim() === '') {
    errors.push({
      severity: ValidationSeverity.Warning,
      fileType,
      lineNumber: rowIndex,
      column: 'Title',
      message: 'Track title is missing. Submission will display without a title.',
      value: row.Title ?? '',
    })
  }

  return errors
}

/**
 * Validate a vote row
 *
 * @param row - CSV row data
 * @param rowIndex - Row number (for error reporting)
 * @param fileType - CSV file type for error context
 * @returns Array of validation errors
 */
export function validateVoteRow(
  row: Partial<VoteCsvRow>,
  rowIndex: number,
  fileType: CsvFileType = CsvFileType.Votes
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!row['Spotify URI'] || row['Spotify URI'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Spotify URI',
      message: 'Spotify URI is required. Every vote must be associated with a submission.',
      value: row['Spotify URI'] ?? '',
    })
  }

  if (!row['Voter ID'] || row['Voter ID'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Voter ID',
      message: 'Voter ID is required. Every vote must be associated with a competitor.',
      value: row['Voter ID'] ?? '',
    })
  }

  if (row['Points Assigned'] === undefined || row['Points Assigned'] === null) {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Points Assigned',
      message: 'Points Assigned is required. Every vote must have a point value.',
      value: row['Points Assigned'] ?? '',
    })
  } else {
    const points = parseFloat(row['Points Assigned'])
    if (isNaN(points)) {
      errors.push({
        severity: ValidationSeverity.Error,
        fileType,
        lineNumber: rowIndex,
        column: 'Points Assigned',
        message: 'Points Assigned must be a number. Use numeric values for points.',
        value: row['Points Assigned'],
      })
    }
  }

  if (!row['Round ID'] || row['Round ID'].trim() === '') {
    errors.push({
      severity: ValidationSeverity.Error,
      fileType,
      lineNumber: rowIndex,
      column: 'Round ID',
      message: 'Round ID is required. Every vote must be associated with a round.',
      value: row['Round ID'] ?? '',
    })
  }

  return errors
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate all rows in a CSV dataset
 *
 * @param fileType - CSV file type
 * @param rows - Array of CSV rows
 * @param maxErrors - Maximum number of errors to collect (default: 100)
 * @returns Validation result
 */
export function validateRows(
  fileType: CsvFileType,
  rows: Record<string, unknown>[],
  maxErrors = 100
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const infos: ValidationError[] = []

  for (let i = 0; i < rows.length && errors.length < maxErrors; i++) {
    const row = rows[i]!
    let rowErrors: ValidationError[] = []

    switch (fileType) {
      case CsvFileType.Competitors:
        rowErrors = validateCompetitorRow(row as Partial<CompetitorCsvRow>, i + 1, fileType)
        break
      case CsvFileType.Rounds:
        rowErrors = validateRoundRow(row as Partial<RoundCsvRow>, i + 1, fileType)
        break
      case CsvFileType.Submissions:
        rowErrors = validateSubmissionRow(row as Partial<SubmissionCsvRow>, i + 1, fileType)
        break
      case CsvFileType.Votes:
        rowErrors = validateVoteRow(row as Partial<VoteCsvRow>, i + 1, fileType)
        break
    }

    // Categorize by severity
    for (const error of rowErrors) {
      if (error.severity === ValidationSeverity.Error) {
        errors.push(error)
      } else if (error.severity === ValidationSeverity.Warning) {
        warnings.push(error)
      } else {
        infos.push(error)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
  }
}

/**
 * Create a summary message from validation results
 *
 * @param result - Validation result
 * @returns Human-readable summary
 */
export function formatValidationSummary(result: ValidationResult): string {
  const parts: string[] = []

  if (result.valid) {
    parts.push('✓ Validation passed')
  } else {
    parts.push(`✗ Validation failed with ${result.errors.length} error(s)`)
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`)
  }

  if (result.infos.length > 0) {
    parts.push(`${result.infos.length} info message(s)`)
  }

  return parts.join(', ')
}
