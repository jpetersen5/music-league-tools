import { useState, useEffect } from 'react'
import {
  PLACEHOLDER_CONFIG_NAME,
  ERROR_CONFIG_NAME_REQUIRED,
  ERROR_CONFIG_NAME_EXISTS,
} from '@/constants/secretSanta'
import './SaveLoadControls.scss'

interface SaveDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  currentName: string | null
  existingNames: string[]
}

export const SaveDialog = ({
  isOpen,
  onClose,
  onSave,
  currentName,
  existingNames,
}: SaveDialogProps) => {
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setNameInput('')
      setError('')
    }
  }, [isOpen])

  const handleSave = () => {
    const name = nameInput.trim()

    if (!name) {
      setError(ERROR_CONFIG_NAME_REQUIRED)
      return
    }

    if (name !== currentName && existingNames.includes(name)) {
      setError(ERROR_CONFIG_NAME_EXISTS)
      return
    }

    onSave(name)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="save-load-controls__dialog-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-dialog-title"
    >
      <div className="save-load-controls__dialog" onClick={e => e.stopPropagation()}>
        <h3 id="save-dialog-title">Save Configuration</h3>
        <input
          type="text"
          className="save-load-controls__input"
          placeholder={PLACEHOLDER_CONFIG_NAME}
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          autoFocus
          aria-label="Configuration name"
          aria-describedby={error ? 'save-dialog-error' : undefined}
          aria-invalid={!!error}
        />
        {error && (
          <div className="save-load-controls__error" role="alert" id="save-dialog-error">
            {error}
          </div>
        )}
        <div className="save-load-controls__dialog-actions">
          <button
            className="save-load-controls__dialog-btn save-load-controls__dialog-btn--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="save-load-controls__dialog-btn save-load-controls__dialog-btn--primary"
            onClick={handleSave}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
