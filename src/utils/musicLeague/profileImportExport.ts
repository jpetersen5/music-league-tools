/**
 * Profile Import/Export Utility
 *
 * Handle import and export of Music League profiles as ZIP files
 *
 * @module utils/musicLeague/profileImportExport
 */

import JSZip from 'jszip'
import type { Profile } from '@/types/musicLeague'
import { toCSV, parseCompetitorsCSV } from './csvParser'
import { detectFileTypeHybrid } from './fileDetection'

// ============================================================================
// Types
// ============================================================================

export interface ExportData {
  competitors: Record<string, unknown>[]
  rounds: Record<string, unknown>[]
  submissions: Record<string, unknown>[]
  votes: Record<string, unknown>[]
  metadata: ProfileMetadata
}

export interface ProfileMetadata {
  profileName: string
  leagueName?: string
  exportDate: string
  version: string
}

export interface ImportResult {
  files: {
    competitors?: File
    rounds?: File
    submissions?: File
    votes?: File
    metadata?: ProfileMetadata
  }
  errors: string[]
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export profile data as a ZIP file
 *
 * @param profile - Profile metadata
 * @param data - CSV data to export
 * @returns Promise resolving to Blob containing ZIP file
 */
export async function exportProfileAsZip(profile: Profile, data: ExportData): Promise<Blob> {
  const zip = new JSZip()

  // Create metadata
  const metadata: ProfileMetadata = {
    profileName: profile.name,
    exportDate: new Date().toISOString(),
    version: '1.0',
  }

  // Add metadata.json
  zip.file('metadata.json', JSON.stringify(metadata, null, 2))

  // Convert data to CSV and add to ZIP
  if (data.competitors.length > 0) {
    const competitorsCSV = toCSV(data.competitors)
    zip.file('competitors.csv', competitorsCSV)
  }

  if (data.rounds.length > 0) {
    const roundsCSV = toCSV(data.rounds)
    zip.file('rounds.csv', roundsCSV)
  }

  if (data.submissions.length > 0) {
    const submissionsCSV = toCSV(data.submissions)
    zip.file('submissions.csv', submissionsCSV)
  }

  if (data.votes.length > 0) {
    const votesCSV = toCSV(data.votes)
    zip.file('votes.csv', votesCSV)
  }

  // Generate ZIP file
  return await zip.generateAsync({ type: 'blob' })
}

/**
 * Download a ZIP file to the user's computer
 *
 * @param blob - Blob containing ZIP data
 * @param filename - Name for the downloaded file
 */
export function downloadZipFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export and download profile as ZIP
 *
 * @param profile - Profile metadata
 * @param data - CSV data to export
 * @param filename - Optional custom filename (defaults to profile name)
 */
export async function exportAndDownloadProfile(
  profile: Profile,
  data: ExportData,
  filename?: string
): Promise<void> {
  const blob = await exportProfileAsZip(profile, data)
  const defaultFilename = `${sanitizeFilename(profile.name)}-${Date.now()}.zip`
  downloadZipFile(blob, filename ?? defaultFilename)
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Extract files from a ZIP archive with automatic file type detection
 *
 * Uses the same hybrid detection logic as individual CSV uploads,
 * detecting file type based on column headers and filename.
 *
 * @param zipFile - ZIP file to extract
 * @returns Promise resolving to import result
 */
export async function extractProfileZip(zipFile: File): Promise<ImportResult> {
  const result: ImportResult = {
    files: {},
    errors: [],
  }

  try {
    const zip = await JSZip.loadAsync(zipFile)

    // Extract metadata if present
    const metadataFile = zip.file('metadata.json')
    if (metadataFile) {
      try {
        const metadataContent = await metadataFile.async('string')
        result.files.metadata = JSON.parse(metadataContent)
      } catch (error) {
        result.errors.push(
          `Failed to parse metadata.json: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Get all CSV files from ZIP
    const csvFiles = zip.filter((relativePath, file) => {
      return !file.dir && relativePath.toLowerCase().endsWith('.csv')
    })

    // Process each CSV file with automatic type detection
    for (const [relativePath, zipEntry] of Object.entries(csvFiles)) {
      try {
        // Extract file content as blob
        const content = await zipEntry.async('blob')
        const file = new File([content], relativePath.split('/').pop() || relativePath, {
          type: 'text/csv',
        })

        // Parse CSV to get column headers
        const parseResult = await parseCompetitorsCSV(file)
        const columns = parseResult.meta.fields || []

        // Detect file type using hybrid detection (columns + filename)
        const detectedType = detectFileTypeHybrid(file.name, columns)

        if (!detectedType) {
          result.errors.push(
            `Cannot determine file type for: ${file.name}. Make sure the CSV has the correct column headers.`
          )
          continue
        }

        // Map to appropriate slot based on detected type
        // CsvFileType enum uses string values that match the key names
        const key = detectedType as keyof Pick<
          ImportResult['files'],
          'competitors' | 'rounds' | 'submissions' | 'votes'
        >
        if (result.files[key]) {
          result.errors.push(
            `Duplicate ${key} file detected. Found both "${result.files[key]!.name}" and "${file.name}"`
          )
        } else {
          result.files[key] = file
        }
      } catch (error) {
        result.errors.push(
          `Failed to process ${relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Validate that all required files were found
    const requiredFiles = ['competitors', 'rounds', 'submissions', 'votes'] as const
    for (const fileKey of requiredFiles) {
      if (!result.files[fileKey]) {
        result.errors.push(
          `Missing required ${fileKey} CSV file. Make sure your ZIP contains a CSV with the correct column headers.`
        )
      }
    }

    return result
  } catch (error) {
    result.errors.push(
      `Failed to read ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return result
  }
}

/**
 * Validate extracted ZIP contents
 *
 * @param importResult - Import result to validate
 * @returns True if all required files are present
 */
export function validateZipContents(importResult: ImportResult): boolean {
  return (
    importResult.errors.length === 0 &&
    importResult.files.competitors !== undefined &&
    importResult.files.rounds !== undefined &&
    importResult.files.submissions !== undefined &&
    importResult.files.votes !== undefined
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize filename for safe downloads
 *
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

/**
 * Check if a file is a ZIP file based on extension
 *
 * @param file - File to check
 * @returns True if file appears to be a ZIP
 */
export function isZipFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  )
}

/**
 * Check if a file is a CSV file based on extension
 *
 * @param file - File to check
 * @returns True if file appears to be a CSV
 */
export function isCsvFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'text/comma-separated-values'
  )
}

/**
 * Get a human-readable file size
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
