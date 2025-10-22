import type { SeparatorType } from '@/types'
import { parseParticipants, detectDuplicates } from '@/utils/secretSanta'
import {
  PLACEHOLDER_PARTICIPANT_NEWLINE,
  PLACEHOLDER_PARTICIPANT_COMMA,
  PLACEHOLDER_PARTICIPANT_CUSTOM,
} from '@/constants/secretSanta'
import settingsIcon from '/settings.svg'
import './ParticipantInput.scss'

interface ParticipantInputProps {
  value: string
  onChange: (value: string) => void
  separatorType: SeparatorType
  customSeparator: string
  onSettingsClick: () => void
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>
  hasSettingsError?: boolean
}

export const ParticipantInput = ({
  value,
  onChange,
  separatorType,
  customSeparator,
  onSettingsClick,
  settingsButtonRef,
  hasSettingsError = false,
}: ParticipantInputProps) => {
  const participants = parseParticipants(value, separatorType, customSeparator)
  const duplicates = detectDuplicates(participants)
  const exactDuplicates = duplicates.filter(d => d.isExact)
  const nearDuplicates = duplicates.filter(d => !d.isExact)

  return (
    <div className="participant-input">
      <div className="participant-input__header">
        <h3>Participants</h3>
        <div className="participant-input__header-actions">
          <span className="participant-input__count">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
          <button
            ref={settingsButtonRef}
            className={`participant-input__settings-btn ${hasSettingsError ? 'participant-input__settings-btn--error' : ''}`}
            onClick={onSettingsClick}
            type="button"
            aria-label="Settings"
            title="Settings"
          >
            <img src={settingsIcon} alt="Settings" />
            {hasSettingsError && <span className="participant-input__error-dot" />}
          </button>
        </div>
      </div>

      <textarea
        className="participant-input__textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={
          separatorType === 'newline'
            ? PLACEHOLDER_PARTICIPANT_NEWLINE
            : separatorType === 'comma'
              ? PLACEHOLDER_PARTICIPANT_COMMA
              : PLACEHOLDER_PARTICIPANT_CUSTOM(customSeparator)
        }
        rows={10}
      />

      {exactDuplicates.length > 0 && (
        <div className="participant-input__error">
          ❌ Exact duplicates found: {exactDuplicates.map(d => d.value).join(', ')}
        </div>
      )}

      {nearDuplicates.length > 0 && (
        <div className="participant-input__warning">
          ⚠️ Similar names found: {nearDuplicates.map(d => d.value).join(', ')}
        </div>
      )}
    </div>
  )
}
