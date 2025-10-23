import { useState, useRef } from 'react'
import type { Constraint, Participant } from '@/types'
import { findInvalidConstraints } from '@/utils/secretSanta'
import { parseConstraintsFile, findParticipant } from '@/utils/constraintsParsing'
import {
  ERROR_BOTH_FIELDS_REQUIRED,
  ERROR_NOT_IN_LIST,
  ERROR_PAIRING_EXISTS,
  CONFIRM_CLEAR_BANNED,
  CONFIRM_CLEAR_FORCED,
} from '@/constants/secretSanta'
import { Tabs } from '../common/Tabs'
import uploadIcon from '/upload.svg'
import resetIcon from '/reset.svg'
import './ConstraintsPanel.scss'

interface ConstraintsPanelProps {
  bannedConstraints: Constraint[]
  forcedConstraints: Constraint[]
  participants: Participant[]
  onBannedChange: (constraints: Constraint[]) => void
  onForcedChange: (constraints: Constraint[]) => void
}

export const ConstraintsPanel = ({
  bannedConstraints,
  forcedConstraints,
  participants,
  onBannedChange,
  onForcedChange,
}: ConstraintsPanelProps) => {
  const [activeTab, setActiveTab] = useState<'banned' | 'forced'>('banned')
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived values based on active tab
  const constraints = activeTab === 'banned' ? bannedConstraints : forcedConstraints
  const onChange = activeTab === 'banned' ? onBannedChange : onForcedChange
  const title = activeTab === 'banned' ? 'Banned Pairings' : 'Forced Pairings'

  const invalidConstraints = findInvalidConstraints(constraints, participants)

  const handleAdd = () => {
    const from = fromInput.trim()
    const to = toInput.trim()

    if (!from || !to) {
      setError(ERROR_BOTH_FIELDS_REQUIRED)
      return
    }

    if (!participants.includes(from)) {
      setError(ERROR_NOT_IN_LIST(from))
      return
    }

    if (!participants.includes(to)) {
      setError(ERROR_NOT_IN_LIST(to))
      return
    }

    const exists = constraints.some(c => c.from === from && c.to === to)
    if (exists) {
      setError(ERROR_PAIRING_EXISTS)
      return
    }

    onChange([...constraints, { from, to }])
    setFromInput('')
    setToInput('')
    setError('')
  }

  const handleRemove = (index: number) => {
    onChange(constraints.filter((_, i) => i !== index))
  }

  const handleReset = () => {
    const confirmMessage = activeTab === 'banned' ? CONFIRM_CLEAR_BANNED : CONFIRM_CLEAR_FORCED
    if (confirm(confirmMessage)) {
      onChange([])
      setError('')
      setFileError(null)
      setUnmatchedNames([])
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (!file.name.endsWith('.txt')) {
      setFileError('Only .txt files are supported')
      return
    }

    // Security: Enforce 1MB file size limit to prevent DoS
    const MAX_FILE_SIZE = 1024 * 1024 // 1MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds 1MB limit')
      return
    }

    try {
      const content = await file.text()
      const parsed = parseConstraintsFile(content)

      if (parsed.errors.length > 0) {
        setFileError(parsed.errors.join('; '))
        return
      }

      // Match parsed constraints to participant list
      const matched: Constraint[] = []
      const unmatched: string[] = []

      parsed.constraints.forEach(({ from, to }) => {
        const matchedFrom = findParticipant(from, participants)
        const matchedTo = findParticipant(to, participants)

        if (matchedFrom && matchedTo) {
          const exists = [...constraints, ...matched].some(
            c => c.from === matchedFrom && c.to === matchedTo
          )
          if (!exists) {
            matched.push({ from: matchedFrom, to: matchedTo })
          }
        } else {
          if (!matchedFrom) unmatched.push(from)
          if (!matchedTo && from !== to) unmatched.push(to)
        }
      })

      if (matched.length > 0) {
        onChange([...constraints, ...matched])
      }

      if (unmatched.length > 0) {
        setUnmatchedNames([...new Set(unmatched)])
      } else {
        setUnmatchedNames([])
      }

      setFileError(null)
    } catch {
      setFileError('Failed to read file')
    }
  }

  return (
    <div className="constraints-panel">
      <Tabs
        tabs={[
          { id: 'banned', label: 'Banned Pairings', count: bannedConstraints.length },
          { id: 'forced', label: 'Forced Pairings', count: forcedConstraints.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="constraints-panel__tabs"
      />

      <div className="constraints-panel__header">
        <h3 className="constraints-panel__title">{title}</h3>
        <div className="constraints-panel__actions">
          <button
            className="constraints-panel__upload-btn"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title="Upload .txt file"
            aria-label="Upload"
          >
            <img src={uploadIcon} alt="Upload" />
          </button>
          <button
            className="constraints-panel__reset-btn"
            onClick={handleReset}
            type="button"
            title={`Clear all ${activeTab === 'banned' ? 'banned' : 'forced'} pairings`}
            aria-label="Reset"
          >
            <img src={resetIcon} alt="Reset" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          aria-label="Upload constraints file"
        />
      </div>

      {constraints.length > 0 && (
        <div className="constraints-panel__tags">
          {constraints.map((constraint, index) => {
            const isInvalid = invalidConstraints.some(
              ic => ic.from === constraint.from && ic.to === constraint.to
            )

            return (
              <div
                key={`${constraint.from}-${constraint.to}-${index}`}
                className={`constraints-panel__tag ${isInvalid ? 'constraints-panel__tag--invalid' : ''}`}
              >
                <span className="constraints-panel__tag-text">
                  {constraint.from} → {constraint.to}
                </span>
                <button
                  className="constraints-panel__tag-remove"
                  onClick={() => handleRemove(index)}
                  type="button"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="constraints-panel__add">
        <input
          type="text"
          className="constraints-panel__input"
          placeholder="From"
          value={fromInput}
          onChange={e => setFromInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          list={`${activeTab}-from-datalist`}
          aria-label={`${activeTab === 'banned' ? 'Banned' : 'Forced'} pairing from participant`}
          aria-describedby={
            error ? 'constraints-error' : fileError ? 'constraints-file-error' : undefined
          }
        />
        <span className="constraints-panel__arrow" aria-hidden="true">
          →
        </span>
        <input
          type="text"
          className="constraints-panel__input"
          placeholder="To"
          value={toInput}
          onChange={e => setToInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          list={`${activeTab}-to-datalist`}
          aria-label={`${activeTab === 'banned' ? 'Banned' : 'Forced'} pairing to participant`}
          aria-describedby={
            error ? 'constraints-error' : fileError ? 'constraints-file-error' : undefined
          }
        />
        <button
          className="constraints-panel__add-btn"
          onClick={handleAdd}
          type="button"
          disabled={participants.length < 2}
          aria-label={`Add ${activeTab === 'banned' ? 'banned' : 'forced'} pairing`}
        >
          +
        </button>

        {/* Datalists for autocomplete */}
        <datalist id={`${activeTab}-from-datalist`}>
          {participants.map(p => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id={`${activeTab}-to-datalist`}>
          {participants.map(p => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      {error && (
        <div className="constraints-panel__error" role="alert" id="constraints-error">
          ❌ {error}
        </div>
      )}
      {fileError && (
        <div className="constraints-panel__error" role="alert" id="constraints-file-error">
          ❌ {fileError}
        </div>
      )}
      {unmatchedNames.length > 0 && (
        <div className="constraints-panel__warning" role="status">
          ⚠️ Names not found in participant list: {unmatchedNames.join(', ')}
        </div>
      )}
      {invalidConstraints.length > 0 && (
        <div className="constraints-panel__warning" role="status">
          ⚠️ {invalidConstraints.length} pairing{invalidConstraints.length !== 1 ? 's' : ''}{' '}
          reference{invalidConstraints.length === 1 ? 's' : ''} participants not in the list
        </div>
      )}
    </div>
  )
}
