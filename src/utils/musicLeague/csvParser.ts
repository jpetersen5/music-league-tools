/**
 * CSV Parser Utility
 *
 * PapaParse integration for parsing Music League CSV files
 *
 * @module utils/musicLeague/csvParser
 */

import Papa from 'papaparse'
import type {
  CompetitorCsvRow,
  RoundCsvRow,
  SubmissionCsvRow,
  VoteCsvRow,
} from '@/types/musicLeague'

// ============================================================================
// Parser Types
// ============================================================================

export interface ParseResult<T> {
  data: T[]
  errors: ParseError[]
  meta: ParseMeta
}

export interface ParseError {
  type: 'FieldMismatch' | 'Rows' | 'Delimiter' | 'Quotes'
  code: string
  message: string
  row?: number
}

export interface ParseMeta {
  delimiter: string
  linebreak: string
  aborted: boolean
  truncated: boolean
  fields: string[]
}

export interface ParseOptions {
  skipEmptyLines?: boolean
  trimValues?: boolean
}

// ============================================================================
// CSV Parsing Functions
// ============================================================================

/**
 * Parse a CSV file into typed rows
 *
 * @param file - File to parse
 * @param options - Parsing options
 * @returns Promise resolving to parse result
 */
async function parseCSVFile<T>(file: File, options: ParseOptions = {}): Promise<ParseResult<T>> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: options.skipEmptyLines ?? true,
      dynamicTyping: false, // Keep everything as strings for now
      transform: options.trimValues ? (value: string) => value.trim() : undefined,
      complete: results => {
        resolve({
          data: results.data,
          errors: results.errors.map(err => ({
            type: err.type as ParseError['type'],
            code: err.code,
            message: err.message,
            row: err.row,
          })),
          meta: {
            delimiter: results.meta.delimiter,
            linebreak: results.meta.linebreak,
            aborted: results.meta.aborted,
            truncated: results.meta.truncated,
            fields: results.meta.fields ?? [],
          },
        })
      },
      error: error => {
        reject(new Error(`CSV parsing failed: ${error.message}`))
      },
    })
  })
}

/**
 * Parse competitors CSV file
 *
 * @param file - CSV file containing competitor data
 * @returns Promise resolving to parse result
 */
export async function parseCompetitorsCSV(file: File): Promise<ParseResult<CompetitorCsvRow>> {
  return parseCSVFile<CompetitorCsvRow>(file, {
    skipEmptyLines: true,
    trimValues: true,
  })
}

/**
 * Parse rounds CSV file
 *
 * @param file - CSV file containing round data
 * @returns Promise resolving to parse result
 */
export async function parseRoundsCSV(file: File): Promise<ParseResult<RoundCsvRow>> {
  return parseCSVFile<RoundCsvRow>(file, {
    skipEmptyLines: true,
    trimValues: true,
  })
}

/**
 * Parse submissions CSV file
 *
 * @param file - CSV file containing submission data
 * @returns Promise resolving to parse result
 */
export async function parseSubmissionsCSV(file: File): Promise<ParseResult<SubmissionCsvRow>> {
  return parseCSVFile<SubmissionCsvRow>(file, {
    skipEmptyLines: true,
    trimValues: true,
  })
}

/**
 * Parse votes CSV file
 *
 * @param file - CSV file containing vote data
 * @returns Promise resolving to parse result
 */
export async function parseVotesCSV(file: File): Promise<ParseResult<VoteCsvRow>> {
  return parseCSVFile<VoteCsvRow>(file, {
    skipEmptyLines: true,
    trimValues: true,
  })
}

/**
 * Parse any CSV file without type validation
 * Used for auto-detection
 *
 * @param file - CSV file to parse
 * @returns Promise resolving to parse result with generic rows
 */
export async function parseGenericCSV(file: File): Promise<ParseResult<Record<string, string>>> {
  return parseCSVFile<Record<string, string>>(file, {
    skipEmptyLines: true,
    trimValues: true,
  })
}

// ============================================================================
// String to CSV Conversion
// ============================================================================

/**
 * Convert array of objects to CSV string
 * Useful for export functionality
 *
 * @param data - Array of objects to convert
 * @param columns - Optional specific columns to include
 * @returns CSV string
 */
export function toCSV<T extends Record<string, unknown>>(data: T[], columns?: (keyof T)[]): string {
  return Papa.unparse(data, {
    columns: columns as string[] | undefined,
    header: true,
  })
}

/**
 * Convert CSV string to array of objects
 * Useful for import functionality
 *
 * @param csvString - CSV string to parse
 * @returns Promise resolving to parse result
 */
export async function fromCSVString<T>(csvString: string): Promise<ParseResult<T>> {
  return new Promise(resolve => {
    Papa.parse<T>(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: results => {
        resolve({
          data: results.data,
          errors: results.errors.map(err => ({
            type: err.type as ParseError['type'],
            code: err.code,
            message: err.message,
            row: err.row,
          })),
          meta: {
            delimiter: results.meta.delimiter,
            linebreak: results.meta.linebreak,
            aborted: results.meta.aborted,
            truncated: results.meta.truncated,
            fields: results.meta.fields ?? [],
          },
        })
      },
    })
  })
}
