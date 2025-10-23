import { useState, useEffect, useRef } from 'react'
import type { GenerationSettings, SeparatorType, CycleOperator } from '@/types'
import { validateCycleSettings } from '@/utils/secretSanta'
import { usePopoverPosition } from '@/hooks/usePopoverPosition'
import infoIcon from '/info.svg'
import './SettingsPanel.scss'

interface SettingsPanelProps {
  settings: GenerationSettings
  onSettingsChange: (settings: GenerationSettings) => void
  separatorType: SeparatorType
  onSeparatorTypeChange: (type: SeparatorType) => void
  customSeparator: string
  onCustomSeparatorChange: (value: string) => void
  participantCount: number
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  onValidationChange?: (hasError: boolean) => void
}

export const SettingsPanel = ({
  settings,
  onSettingsChange,
  separatorType,
  onSeparatorTypeChange,
  customSeparator,
  onCustomSeparatorChange,
  participantCount,
  isOpen,
  onClose,
  anchorRef,
  onValidationChange,
}: SettingsPanelProps) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [cycleSizeInput, setCycleSizeInput] = useState(
    settings.cycleSize?.toString() || participantCount.toString()
  )

  const popoverPosition = usePopoverPosition({
    isOpen,
    anchorRef,
    popoverWidth: 320,
    popoverHeight: 400,
  })

  // Update cycleSizeInput when participantCount changes and using default
  useEffect(() => {
    if (!settings.cycleSize && participantCount > 0) {
      setCycleSizeInput(participantCount.toString())
    }
  }, [participantCount, settings.cycleSize])

  const enableNCycle = settings.enableNCycleConstraint || false
  const cycleOperator = settings.cycleOperator || 'equal'
  const cycleSize = parseInt(cycleSizeInput) || participantCount

  const validationMessage = validateCycleSettings(
    enableNCycle,
    settings.useHamiltonianCycle || false,
    cycleSizeInput,
    cycleOperator,
    participantCount
  )
  const hasValidationError = validationMessage?.type === 'error'

  // Notify parent of validation state changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(hasValidationError)
    }
  }, [hasValidationError, onValidationChange])

  const handleHamiltonianToggle = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      useHamiltonianCycle: checked,
      enableNCycleConstraint: checked ? false : enableNCycle,
    })
  }

  const handleNCycleToggle = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      enableNCycleConstraint: checked,
      cycleSize: checked ? cycleSize : undefined,
      cycleOperator: checked ? cycleOperator : undefined,
    })
  }

  const handleOperatorChange = (operator: CycleOperator) => {
    onSettingsChange({
      ...settings,
      cycleOperator: operator,
    })
  }

  const handleCycleSizeChange = (value: string) => {
    setCycleSizeInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num > 0) {
      onSettingsChange({
        ...settings,
        cycleSize: num,
      })
    }
  }

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return undefined

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    // Add small delay to prevent immediate close on button click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorRef])

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="settings-panel__backdrop" onClick={onClose} />

      <div
        className="settings-panel__popover"
        ref={popoverRef}
        style={{
          top: `${popoverPosition.top}px`,
          left: `${popoverPosition.left}px`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
      >
        <div className="settings-panel__header">
          <h3 className="settings-panel__title" id="settings-panel-title">
            Settings
          </h3>
          <button
            className="settings-panel__close"
            onClick={onClose}
            type="button"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-panel__content">
          <div className="settings-panel__section">
            <h4 className="settings-panel__section-title">Cycle Constraints</h4>

            <label className="settings-panel__checkbox">
              <input
                type="checkbox"
                checked={settings.useHamiltonianCycle}
                onChange={e => handleHamiltonianToggle(e.target.checked)}
                aria-label="Enable Hamiltonian Cycle"
                aria-describedby="hamiltonian-cycle-desc"
              />
              <span>Hamiltonian Cycle</span>
              <span
                className="settings-panel__tooltip"
                title="Create one long cycle connecting all participants."
                id="hamiltonian-cycle-desc"
              >
                <img src={infoIcon} alt="Info" />
              </span>
            </label>

            <div className="settings-panel__n-cycle">
              <label
                className={`settings-panel__checkbox ${settings.useHamiltonianCycle ? 'settings-panel__checkbox--disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={settings.useHamiltonianCycle || enableNCycle}
                  onChange={e => handleNCycleToggle(e.target.checked)}
                  disabled={settings.useHamiltonianCycle}
                  aria-label="Enable N-cycle constraint"
                />
                <span>Force</span>
              </label>

              {settings.useHamiltonianCycle ? (
                <span className="settings-panel__n-cycle-disabled">= {participantCount}-cycle</span>
              ) : enableNCycle ? (
                <div className="settings-panel__n-cycle-controls">
                  <select
                    className="settings-panel__select settings-panel__select--inline"
                    value={cycleOperator}
                    onChange={e => handleOperatorChange(e.target.value as CycleOperator)}
                    aria-label="Cycle size operator"
                  >
                    <option value="equal">=</option>
                    <option value="less">&lt;</option>
                    <option value="greater">&gt;</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    className={`settings-panel__input settings-panel__input--inline ${hasValidationError ? 'settings-panel__input--error' : ''}`}
                    value={cycleSizeInput}
                    onChange={e => handleCycleSizeChange(e.target.value)}
                    onBlur={() => {
                      const num = parseInt(cycleSizeInput)
                      if (isNaN(num) || num < 1) {
                        setCycleSizeInput('1')
                        onSettingsChange({ ...settings, cycleSize: 1 })
                      } else if (num > participantCount && participantCount > 0) {
                        setCycleSizeInput(participantCount.toString())
                        onSettingsChange({ ...settings, cycleSize: participantCount })
                      }
                    }}
                    placeholder="N"
                    aria-label="Cycle size value"
                    aria-describedby={hasValidationError ? 'settings-validation-error' : undefined}
                    aria-invalid={hasValidationError}
                  />
                  <span className="settings-panel__n-cycle-suffix">-cycle</span>
                </div>
              ) : (
                <span className="settings-panel__n-cycle-hint">
                  (no cycle constraints)
                  <span
                    className="settings-panel__tooltip"
                    title="Apply N-cycle size constraints to limit or enforce specific cycle patterns."
                  >
                    <img src={infoIcon} alt="Info" />
                  </span>
                </span>
              )}
            </div>

            {validationMessage && enableNCycle && !settings.useHamiltonianCycle && (
              <div
                className={`settings-panel__validation ${
                  validationMessage.type === 'error'
                    ? 'settings-panel__validation--error'
                    : 'settings-panel__validation--warning'
                }`}
                role={validationMessage.type === 'error' ? 'alert' : 'status'}
                id={validationMessage.type === 'error' ? 'settings-validation-error' : undefined}
              >
                {validationMessage.type === 'error' ? '❌' : '⚠️'} {validationMessage.text}
              </div>
            )}
          </div>

          <div className="settings-panel__section">
            <h4 className="settings-panel__section-title">Separator Settings</h4>

            <select
              className="settings-panel__select"
              value={separatorType}
              onChange={e => onSeparatorTypeChange(e.target.value as SeparatorType)}
              aria-label="Participant separator type"
            >
              <option value="newline">Newline</option>
              <option value="comma">Comma</option>
              <option value="custom">Custom...</option>
            </select>

            {separatorType === 'custom' && (
              <input
                type="text"
                className="settings-panel__custom-separator"
                value={customSeparator}
                onChange={e => onCustomSeparatorChange(e.target.value)}
                placeholder="Enter separator (e.g. |, -, .)"
                maxLength={10}
                aria-label="Custom separator characters"
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
