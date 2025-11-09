/**
 * Profile Upload Progress Component
 *
 * Visual progress indicator for the multi-phase profile upload process.
 * Displays progress bar, phase stepper, and real-time status messages.
 *
 * @module components/MusicLeague/ProfileUploadProgress
 */

import type { UploadState } from '@/hooks/useMusicLeague/useProfileUpload'
import { UploadPhase } from '@/hooks/useMusicLeague/useProfileUpload'
import pauseIcon from '/pause.svg'
import folderIcon from '/folder.svg'
import documentIcon from '/document.svg'
import checkIcon from '/check.svg'
import searchIcon from '/search.svg'
import analyzeIcon from '/analyze.svg'
import saveIcon from '/save.svg'
import checkCircleIcon from '/check-circle.svg'
import errorIcon from '/error.svg'
import './ProfileUploadProgress.scss'

// ============================================================================
// Component Props
// ============================================================================

export interface ProfileUploadProgressProps {
  /** Current upload state from useProfileUpload hook */
  uploadState: UploadState
}

interface PhaseInfo {
  label: string
  description: string
  icon: string // Path to SVG icon
  order: number
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_INFO: Record<UploadPhase, PhaseInfo> = {
  [UploadPhase.Idle]: {
    label: 'Idle',
    description: 'Waiting to start',
    icon: pauseIcon,
    order: 0,
  },
  [UploadPhase.SelectingFiles]: {
    label: 'Selecting Files',
    description: 'Choosing files to upload',
    icon: folderIcon,
    order: 1,
  },
  [UploadPhase.Parsing]: {
    label: 'Parsing',
    description: 'Reading and parsing CSV files',
    icon: documentIcon,
    order: 2,
  },
  [UploadPhase.Validating]: {
    label: 'Validating',
    description: 'Checking data structure and content',
    icon: checkIcon,
    order: 3,
  },
  [UploadPhase.DetectingOrphans]: {
    label: 'Detecting Orphans',
    description: 'Finding orphaned competitors',
    icon: searchIcon,
    order: 4,
  },
  [UploadPhase.Analyzing]: {
    label: 'Analyzing',
    description: 'Processing comment sentiment',
    icon: analyzeIcon,
    order: 5,
  },
  [UploadPhase.Inserting]: {
    label: 'Inserting',
    description: 'Saving to database',
    icon: saveIcon,
    order: 6,
  },
  [UploadPhase.Complete]: {
    label: 'Complete',
    description: 'Upload finished successfully',
    icon: checkCircleIcon,
    order: 7,
  },
  [UploadPhase.Failed]: {
    label: 'Failed',
    description: 'Upload encountered errors',
    icon: errorIcon,
    order: -1,
  },
}

// Phases to display in the stepper (excluding Idle, SelectingFiles, and Failed)
const DISPLAY_PHASES: UploadPhase[] = [
  UploadPhase.Parsing,
  UploadPhase.Validating,
  UploadPhase.DetectingOrphans,
  UploadPhase.Analyzing,
  UploadPhase.Inserting,
]

// ============================================================================
// Component
// ============================================================================

export function ProfileUploadProgress({ uploadState }: ProfileUploadProgressProps) {
  // ============================================================================
  // Computed Values
  // ============================================================================

  const currentPhase = PHASE_INFO[uploadState.phase]
  const currentOrder = currentPhase?.order ?? 0

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    // Use explicit progress if available
    if (uploadState.progress !== undefined) {
      return uploadState.progress
    }

    // Otherwise calculate from phase
    if (uploadState.phase === UploadPhase.Complete) {
      return 100
    }

    if (uploadState.phase === UploadPhase.Failed || uploadState.phase === UploadPhase.Idle) {
      return 0
    }

    // Calculate based on phase order
    const totalPhases = DISPLAY_PHASES.length
    const currentPhaseIndex = DISPLAY_PHASES.indexOf(uploadState.phase)

    if (currentPhaseIndex === -1) return 0

    return Math.round(((currentPhaseIndex + 1) / totalPhases) * 100)
  }

  const progress = getProgressPercentage()

  // ============================================================================
  // Phase Status Helpers
  // ============================================================================

  const getPhaseStatus = (phase: UploadPhase): 'completed' | 'active' | 'pending' => {
    const phaseOrder = PHASE_INFO[phase].order
    const currentPhaseOrder = currentOrder

    if (phaseOrder < currentPhaseOrder) {
      return 'completed'
    } else if (phase === uploadState.phase) {
      return 'active'
    } else {
      return 'pending'
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="profile-upload-progress">
      {/* Progress Bar */}
      <div className="profile-upload-progress__progress-bar">
        <div
          className="profile-upload-progress__progress-bar__fill"
          style={{ width: `${progress}%` }}
        />
        <div className="profile-upload-progress__progress-bar__percentage">{progress}%</div>
      </div>

      {/* Phase Stepper */}
      <div className="profile-upload-progress__phases">
        {DISPLAY_PHASES.map(phase => {
          const info = PHASE_INFO[phase]
          const status = getPhaseStatus(phase)

          return (
            <div
              key={phase}
              className={`profile-upload-progress__phase profile-upload-progress__phase--${status}`}
            >
              <div className="profile-upload-progress__phase__icon">
                <img
                  src={status === 'completed' ? checkIcon : info.icon}
                  alt={info.label}
                  className="profile-upload-progress__phase__icon-img"
                />
              </div>
              <div className="profile-upload-progress__phase__label">{info.label}</div>
            </div>
          )
        })}
      </div>

      {/* Current Status */}
      <div className="profile-upload-progress__status">
        <div className="profile-upload-progress__status__icon">
          <img
            src={currentPhase.icon}
            alt={currentPhase.label}
            className="profile-upload-progress__status__icon-img"
          />
        </div>
        <div className="profile-upload-progress__status__title">{currentPhase.label}</div>
        <div className="profile-upload-progress__status__message">
          {uploadState.message || currentPhase.description}
        </div>
      </div>
    </div>
  )
}
