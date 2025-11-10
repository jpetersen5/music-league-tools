/**
 * Profile Upload Modal Component
 *
 * Main modal for uploading Music League profiles via ZIP or individual CSV files.
 * Handles file selection, validation, progress tracking, and error display.
 *
 * @module components/MusicLeague/ProfileUploadModal
 */

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react'
import type { ProfileId, UploadStats, UploadMode as UploadModeType } from '@/types/musicLeague'
import { UploadMode } from '@/types/musicLeague'
import { useProfileUpload, UploadPhase } from '@/hooks/useMusicLeague/useProfileUpload'
import { useProfileContext } from '@/contexts/ProfileContext'
import { useToast } from '@/hooks/useToast'
import { ProfileUploadProgress } from './ProfileUploadProgress'
import { UploadErrorDisplay } from './UploadErrorDisplay'
import documentIcon from '/document.svg'
import checkCircleIcon from '/check-circle.svg'
import zipIcon from '/zip.svg'
import './ProfileUploadModal.scss'

// ============================================================================
// Component Props
// ============================================================================

export interface ProfileUploadModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback when upload completes successfully */
  onUploadComplete?: (profileId: ProfileId, stats: UploadStats) => void
}

interface UploadFormData {
  profileName: string
  profileNameError: string | null
}

interface SelectedFiles {
  zip?: File
  competitors?: File
  rounds?: File
  submissions?: File
  votes?: File
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

// ============================================================================
// Component
// ============================================================================

export function ProfileUploadModal({ isOpen, onClose, onUploadComplete }: ProfileUploadModalProps) {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { uploadState, selectFiles, startUpload, reset } = useProfileUpload()
  const { profiles, refreshProfiles, setActiveProfile } = useProfileContext()
  const toast = useToast()

  // ============================================================================
  // State
  // ============================================================================

  const [uploadMode, setUploadMode] = useState<UploadModeType>(UploadMode.Zip)
  const [formData, setFormData] = useState<UploadFormData>({
    profileName: '',
    profileNameError: null,
  })
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({})
  const [isDragging, setIsDragging] = useState(false)

  // ============================================================================
  // Refs
  // ============================================================================

  const zipInputRef = useRef<HTMLInputElement>(null)
  const competitorsInputRef = useRef<HTMLInputElement>(null)
  const roundsInputRef = useRef<HTMLInputElement>(null)
  const submissionsInputRef = useRef<HTMLInputElement>(null)
  const votesInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const successToastShownRef = useRef(false)

  // ============================================================================
  // Effects
  // ============================================================================

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setFormData({ profileName: '', profileNameError: null })
      setSelectedFiles({})
      setUploadMode(UploadMode.Zip)
      successToastShownRef.current = false
    } else {
      // Focus first input when modal opens
      const firstInput = modalRef.current?.querySelector('input')
      firstInput?.focus()
    }
  }, [isOpen, reset])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  // Reset success toast flag when upload returns to Idle (prevents race condition)
  useEffect(() => {
    if (uploadState.phase === UploadPhase.Idle && successToastShownRef.current) {
      successToastShownRef.current = false
    }
  }, [uploadState.phase])

  // Handle successful upload
  useEffect(() => {
    let cancelled = false

    async function handleComplete() {
      if (uploadState.phase !== UploadPhase.Complete || !uploadState.result) return

      const { profileId, profileName, stats } = uploadState.result
      // Only execute once per upload using a ref
      // Check profileName exists to prevent showing toast for cancelled uploads
      if (!profileId || !profileName || successToastShownRef.current) return

      successToastShownRef.current = true
      toast.success(`Profile "${profileName}" created successfully!`)

      try {
        await refreshProfiles()
        await setActiveProfile(profileId)

        if (!cancelled) {
          onUploadComplete?.(profileId, stats)
        }
      } catch (error) {
        console.error('Post-upload refresh failed:', error)
        if (!cancelled) {
          toast.error('Profile created but failed to refresh. Please reload the page.')
        }
      }
    }

    handleComplete()

    return () => {
      cancelled = true
    }
  }, [
    uploadState.phase,
    uploadState.result,
    toast,
    refreshProfiles,
    setActiveProfile,
    onUploadComplete,
  ])

  // ============================================================================
  // Validation
  // ============================================================================

  const validateProfileName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Profile name is required'
    }
    if (profiles.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      return 'A profile with this name already exists'
    }
    return null
  }

  const validateFileSize = (file: File): boolean => {
    const isZip = file.name.toLowerCase().endsWith('.zip')
    const maxSize = isZip ? MAX_ZIP_SIZE : MAX_FILE_SIZE

    if (file.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(0)
      toast.error(`File exceeds maximum size of ${sizeMB}MB`)
      return false
    }

    return true
  }

  const canStartUpload = (): boolean => {
    if (!formData.profileName.trim() || formData.profileNameError) {
      return false
    }

    if (uploadMode === UploadMode.Zip) {
      return !!selectedFiles.zip
    } else {
      return !!(
        selectedFiles.competitors &&
        selectedFiles.rounds &&
        selectedFiles.submissions &&
        selectedFiles.votes
      )
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleProfileNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const error = validateProfileName(name)
    setFormData({ profileName: name, profileNameError: error })
  }

  const handleFileSelect = (fileType: keyof SelectedFiles, file: File | null) => {
    if (file && !validateFileSize(file)) {
      return
    }

    setSelectedFiles(prev => ({
      ...prev,
      [fileType]: file || undefined,
    }))
  }

  const handleZipSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    handleFileSelect('zip', file || null)
  }

  const handleCsvSelect =
    (fileType: 'competitors' | 'rounds' | 'submissions' | 'votes') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      handleFileSelect(fileType, file || null)
    }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)

    if (uploadMode === UploadMode.Zip) {
      const zipFile = files.find(f => f.name.toLowerCase().endsWith('.zip'))
      if (zipFile) {
        handleFileSelect('zip', zipFile)
      } else {
        toast.error('Please drop a ZIP file')
      }
    } else {
      // Auto-detect CSV types
      files.forEach(file => {
        const fileName = file.name.toLowerCase()
        if (fileName.includes('competitor')) {
          handleFileSelect('competitors', file)
        } else if (fileName.includes('round')) {
          handleFileSelect('rounds', file)
        } else if (fileName.includes('submission')) {
          handleFileSelect('submissions', file)
        } else if (fileName.includes('vote')) {
          handleFileSelect('votes', file)
        }
      })
    }
  }

  const handleStartUpload = async () => {
    // Validate profile name
    const nameError = validateProfileName(formData.profileName)
    if (nameError) {
      setFormData(prev => ({ ...prev, profileNameError: nameError }))
      return
    }

    // Select files and get them back synchronously
    let selectedFilesFromHook: Awaited<ReturnType<typeof selectFiles>> = null

    if (uploadMode === UploadMode.Zip && selectedFiles.zip) {
      selectedFilesFromHook = await selectFiles(selectedFiles.zip)
    } else if (uploadMode === UploadMode.IndividualCsvs) {
      selectedFilesFromHook = await selectFiles([
        selectedFiles.competitors!,
        selectedFiles.rounds!,
        selectedFiles.submissions!,
        selectedFiles.votes!,
      ])
    }

    // Only proceed if files were successfully selected
    if (!selectedFilesFromHook) {
      // selectFiles already handled error state
      return
    }

    // Start upload with the selected files
    await startUpload(formData.profileName.trim(), selectedFilesFromHook)
  }

  const handleCancel = () => {
    if (uploadState.phase !== UploadPhase.Idle && uploadState.phase !== UploadPhase.Complete) {
      if (confirm('Upload in progress. Are you sure you want to cancel?')) {
        reset()
        onClose()
      }
    } else {
      onClose()
    }
  }

  /**
   * Handle overlay click - only close if not actively uploading
   * Prevents accidental closure during upload
   */
  const handleOverlayClick = () => {
    // Only allow overlay click to close if upload is idle, complete, or failed
    if (
      uploadState.phase === UploadPhase.Idle ||
      uploadState.phase === UploadPhase.Complete ||
      uploadState.phase === UploadPhase.Failed
    ) {
      onClose()
    }
    // During active upload, do nothing (user must click cancel button)
  }

  const handleRetry = () => {
    reset()
    setSelectedFiles({})
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderFileCard = (file: File | undefined, label: string, onRemove: () => void) => {
    if (!file) return null

    return (
      <div className="profile-upload-modal__file-card">
        <div className="profile-upload-modal__file-card__icon">
          <img src={documentIcon} alt="File" />
        </div>
        <div className="profile-upload-modal__file-card__info">
          <div className="profile-upload-modal__file-card__name">{file.name}</div>
          <div className="profile-upload-modal__file-card__size">{formatFileSize(file.size)}</div>
        </div>
        <button
          className="profile-upload-modal__file-card__remove"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      </div>
    )
  }

  const renderFileSelection = () => {
    if (uploadMode === UploadMode.Zip) {
      return (
        <div
          className={`profile-upload-modal__upload-zone ${isDragging ? 'profile-upload-modal__upload-zone--dragging' : ''} ${selectedFiles.zip ? 'profile-upload-modal__upload-zone--has-files' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => zipInputRef.current?.click()}
        >
          {selectedFiles.zip ? (
            renderFileCard(selectedFiles.zip, 'ZIP file', () => handleFileSelect('zip', null))
          ) : (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <p style={{ marginBottom: '8px', fontWeight: 500 }}>
                Drop ZIP file here or click to browse
              </p>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                ZIP must contain: competitors.csv, rounds.csv, submissions.csv, votes.csv
              </p>
            </div>
          )}
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipSelect}
            style={{ display: 'none' }}
            aria-label="Upload ZIP file"
          />
        </div>
      )
    }

    return (
      <div className="profile-upload-modal__csv-inputs">
        {[
          {
            label: 'Competitors CSV',
            file: selectedFiles.competitors,
            ref: competitorsInputRef,
            handler: handleCsvSelect('competitors'),
          },
          {
            label: 'Rounds CSV',
            file: selectedFiles.rounds,
            ref: roundsInputRef,
            handler: handleCsvSelect('rounds'),
          },
          {
            label: 'Submissions CSV',
            file: selectedFiles.submissions,
            ref: submissionsInputRef,
            handler: handleCsvSelect('submissions'),
          },
          {
            label: 'Votes CSV',
            file: selectedFiles.votes,
            ref: votesInputRef,
            handler: handleCsvSelect('votes'),
          },
        ].map(({ label, file, ref, handler }) => (
          <div key={label} className="profile-upload-modal__csv-input">
            <label className="profile-upload-modal__csv-input__label">{label}</label>
            {file ? (
              renderFileCard(file, label, () =>
                handleFileSelect(label.toLowerCase().split(' ')[0] as keyof SelectedFiles, null)
              )
            ) : (
              <button
                className="profile-upload-modal__csv-input__button"
                onClick={() => ref.current?.click()}
              >
                Choose File
              </button>
            )}
            <input
              ref={ref}
              type="file"
              accept=".csv"
              onChange={handler}
              style={{ display: 'none' }}
              aria-label={label}
            />
          </div>
        ))}
      </div>
    )
  }

  const renderContent = () => {
    switch (uploadState.phase) {
      case UploadPhase.Idle:
      case UploadPhase.SelectingFiles:
        return (
          <>
            <div className="profile-upload-modal__form-group">
              <label htmlFor="profile-name" className="profile-upload-modal__label">
                Profile Name <span className="profile-upload-modal__required">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                value={formData.profileName}
                onChange={handleProfileNameChange}
                className={`profile-upload-modal__input ${formData.profileNameError ? 'profile-upload-modal__input--error' : ''}`}
                placeholder="e.g., My Music League!"
                aria-invalid={!!formData.profileNameError}
                aria-describedby={formData.profileNameError ? 'profile-name-error' : undefined}
              />
              {formData.profileNameError && (
                <div id="profile-name-error" className="profile-upload-modal__error">
                  {formData.profileNameError}
                </div>
              )}
            </div>

            <div className="profile-upload-modal__tabs">
              <button
                className={`profile-upload-modal__tab ${uploadMode === UploadMode.Zip ? 'profile-upload-modal__tab--active' : ''}`}
                onClick={() => setUploadMode(UploadMode.Zip)}
              >
                <img src={zipIcon} alt="" className="profile-upload-modal__tab-icon" />
                ZIP File
              </button>
              <button
                className={`profile-upload-modal__tab ${uploadMode === UploadMode.IndividualCsvs ? 'profile-upload-modal__tab--active' : ''}`}
                onClick={() => setUploadMode(UploadMode.IndividualCsvs)}
              >
                <img src={documentIcon} alt="" className="profile-upload-modal__tab-icon" />
                Individual CSVs
              </button>
            </div>

            {renderFileSelection()}
          </>
        )

      case UploadPhase.Parsing:
      case UploadPhase.Validating:
      case UploadPhase.DetectingOrphans:
      case UploadPhase.Analyzing:
      case UploadPhase.Inserting:
        return <ProfileUploadProgress uploadState={uploadState} />

      case UploadPhase.Complete:
        return (
          <div className="profile-upload-modal__success">
            <div className="profile-upload-modal__success__icon">
              <img src={checkCircleIcon} alt="Success" />
            </div>
            <h3 className="profile-upload-modal__success__title">Upload Complete!</h3>
            <p className="profile-upload-modal__success__message">
              Profile "{formData.profileName}" has been created successfully.
            </p>
            {uploadState.result && (
              <div className="profile-upload-modal__success__stats">
                <div className="profile-upload-modal__success__stat">
                  <div className="profile-upload-modal__success__stat__value">
                    {uploadState.result.stats.competitorsAdded}
                  </div>
                  <div className="profile-upload-modal__success__stat__label">Competitors</div>
                </div>
                <div className="profile-upload-modal__success__stat">
                  <div className="profile-upload-modal__success__stat__value">
                    {uploadState.result.stats.roundsAdded}
                  </div>
                  <div className="profile-upload-modal__success__stat__label">Rounds</div>
                </div>
                <div className="profile-upload-modal__success__stat">
                  <div className="profile-upload-modal__success__stat__value">
                    {uploadState.result.stats.submissionsAdded}
                  </div>
                  <div className="profile-upload-modal__success__stat__label">Submissions</div>
                </div>
                <div className="profile-upload-modal__success__stat">
                  <div className="profile-upload-modal__success__stat__value">
                    {uploadState.result.stats.votesAdded}
                  </div>
                  <div className="profile-upload-modal__success__stat__label">Votes</div>
                </div>
              </div>
            )}
          </div>
        )

      case UploadPhase.Failed:
        return (
          <UploadErrorDisplay
            errors={uploadState.errors}
            warnings={uploadState.warnings}
            onRetry={handleRetry}
          />
        )

      default:
        return null
    }
  }

  const renderFooter = () => {
    if (uploadState.phase === UploadPhase.Complete) {
      return (
        <button
          className="profile-upload-modal__button profile-upload-modal__button--primary"
          onClick={onClose}
        >
          Close
        </button>
      )
    }

    if (uploadState.phase === UploadPhase.Failed) {
      return (
        <>
          <button className="profile-upload-modal__button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="profile-upload-modal__button profile-upload-modal__button--primary"
            onClick={handleRetry}
          >
            Try Again
          </button>
        </>
      )
    }

    if (
      uploadState.phase === UploadPhase.Idle ||
      uploadState.phase === UploadPhase.SelectingFiles
    ) {
      return (
        <>
          <button className="profile-upload-modal__button" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="profile-upload-modal__button profile-upload-modal__button--primary"
            onClick={handleStartUpload}
            disabled={!canStartUpload()}
          >
            Upload Profile
          </button>
        </>
      )
    }

    return (
      <button className="profile-upload-modal__button" onClick={handleCancel}>
        Cancel Upload
      </button>
    )
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (!isOpen) return null

  return (
    <div className="profile-upload-modal__overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="profile-upload-modal__dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        aria-describedby="upload-modal-description"
      >
        <div className="profile-upload-modal__header">
          <h2 id="upload-modal-title" className="profile-upload-modal__title">
            Upload Profile
          </h2>
          <p id="upload-modal-description" className="profile-upload-modal__description">
            Import Music League data from ZIP or individual CSV files
          </p>
          <button
            className="profile-upload-modal__close"
            onClick={handleCancel}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="profile-upload-modal__body">{renderContent()}</div>

        <div className="profile-upload-modal__footer">{renderFooter()}</div>
      </div>
    </div>
  )
}
