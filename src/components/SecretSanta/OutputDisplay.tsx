import { useState, useMemo, useCallback } from 'react'
import type { Pairing, Constraint, GenerationResult, Participant } from '@/types'
import { detectCycles, downloadTextFile, isPairingInList } from '@/utils/secretSanta'
import { CONFIRM_BAN_ALL } from '@/constants/secretSanta'
import { PairingBrickWrapper } from './PairingBrickWrapper'
import copyIcon from '/copy.svg'
import resetIcon from '/reset.svg'
import downloadIcon from '/download.svg'
import banAllIcon from '/ban-all.svg'
import './OutputDisplay.scss'

interface OutputDisplayProps {
  result: GenerationResult | null
  participants: Participant[]
  onBanPairing: (pairing: Pairing) => void
  onForcePairing: (pairing: Pairing) => void
  onRemoveBanned: (pairing: Pairing) => void
  onRemoveForced: (pairing: Pairing) => void
  onBanAll: () => void
  bannedPairings: Constraint[]
  forcedPairings: Constraint[]
  onRegenerate: () => void
  hasInputChanged: boolean
  isGenerating?: boolean
}

export const OutputDisplay = ({
  result,
  participants,
  onBanPairing,
  onForcePairing,
  onRemoveBanned,
  onRemoveForced,
  onBanAll,
  bannedPairings,
  forcedPairings,
  onRegenerate,
  hasInputChanged,
  isGenerating = false,
}: OutputDisplayProps) => {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const sortedCycles = useMemo(() => {
    if (!result || result.pairings.length === 0) return []

    const cycles = detectCycles(result.pairings, participants)

    return cycles.map(cycle => {
      const cyclePairings: Pairing[] = []
      for (let i = 0; i < cycle.length; i++) {
        const fromIdx = cycle[i]!
        const toIdx = cycle[(i + 1) % cycle.length]!
        const from = participants[fromIdx]!
        const to = participants[toIdx]!
        cyclePairings.push({ from, to })
      }
      return cyclePairings
    })
  }, [result, participants])

  const handleCopy = useCallback(async () => {
    if (!result) return

    const text = result.pairings.map(p => `${p.from} → ${p.to}`).join('\n')

    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available')
      }

      await navigator.clipboard.writeText(text)
      setCopied(true)
      setCopyError(null)

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)

      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy to clipboard'

      setCopyError(errorMessage)
      setCopied(false)

      // Clear error after 3 seconds
      setTimeout(() => setCopyError(null), 3000)

      // Fallback: Try to use deprecated execCommand as backup
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()

        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (success) {
          setCopied(true)
          setCopyError(null)
          setTimeout(() => setCopied(false), 2000)
        }
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError)
      }
    }
  }, [result])

  const handleDownload = useCallback(() => {
    if (!result) return

    try {
      const text = result.pairings.map(p => `${p.from} → ${p.to}`).join('\n')
      downloadTextFile(text, 'secret-santa-pairings.txt')
    } catch (error) {
      console.error('Failed to download file:', error)
      setCopyError('Failed to download file')
      setTimeout(() => setCopyError(null), 3000)
    }
  }, [result])

  const isPairingBanned = useCallback(
    (pairing: Pairing) => isPairingInList(pairing, bannedPairings),
    [bannedPairings]
  )

  const isPairingForced = useCallback(
    (pairing: Pairing) => isPairingInList(pairing, forcedPairings),
    [forcedPairings]
  )

  const handleBanAllWithConfirm = useCallback(() => {
    if (confirm(CONFIRM_BAN_ALL)) {
      onBanAll()
    }
  }, [onBanAll])

  if (!result) {
    return null
  }

  return (
    <div className="output-display">
      <div className="output-display__header">
        <h3>Generated Pairings</h3>
        <div className="output-display__actions">
          <button
            className="output-display__btn output-display__btn--ban-all"
            onClick={handleBanAllWithConfirm}
            type="button"
            title="Ban all generated pairings"
            aria-label="Ban All"
          >
            <img src={banAllIcon} alt="Ban All" />
          </button>
          <button
            className="output-display__btn output-display__btn--regenerate"
            onClick={onRegenerate}
            disabled={isGenerating}
            type="button"
            title={
              isGenerating ? 'Generating...' : 'Generate a different pairing with the same settings'
            }
            aria-label="Regenerate"
          >
            <img src={resetIcon} alt="Regenerate" />
          </button>
          <button
            className="output-display__btn output-display__btn--copy"
            onClick={handleCopy}
            type="button"
            title={copied ? 'Copied!' : 'Copy pairings to clipboard'}
            aria-label="Copy"
          >
            <img src={copyIcon} alt="Copy" />
          </button>
          <button
            className="output-display__btn output-display__btn--download"
            onClick={handleDownload}
            type="button"
            title="Download pairings as .txt file"
            aria-label="Download"
          >
            <img src={downloadIcon} alt="Download" />
          </button>
        </div>
      </div>

      {copyError && (
        <div className="output-display__error" role="alert">
          {copyError}
        </div>
      )}

      {hasInputChanged && (
        <div className="output-display__warning" role="status">
          ⚠️ Inputs have changed since generation. Click "Generate" to use new inputs.
        </div>
      )}

      {result.warning && (
        <div className="output-display__warning" role="status">
          ⚠️ {result.warning}
        </div>
      )}

      {!result.success && result.pairings.length === 0 && (
        <div className="output-display__error" role="alert">
          ❌ Could not generate valid pairings after {result.attempts ?? 'unknown'} attempts. Please
          adjust your constraints.
        </div>
      )}

      {result.pairings.length > 0 && (
        <div className="output-display__bricks">
          {sortedCycles.flatMap((cycle, cycleIndex) =>
            [
              ...cycle.map((pairing, pairingIndex) => (
                <PairingBrickWrapper
                  key={`${pairing.from}-${pairing.to}-${pairingIndex}`}
                  pairing={pairing}
                  isBanned={isPairingBanned(pairing)}
                  isForced={isPairingForced(pairing)}
                  onBanPairing={onBanPairing}
                  onForcePairing={onForcePairing}
                  onRemoveBanned={onRemoveBanned}
                  onRemoveForced={onRemoveForced}
                />
              )),
              cycleIndex < sortedCycles.length - 1 ? (
                <div key={`divider-${cycleIndex}`} className="output-display__cycle-divider">
                  |
                </div>
              ) : null,
            ].filter(Boolean)
          )}
        </div>
      )}

      {result.success && result.pairings.length > 0 && (
        <div className="output-display__success" role="status">
          ✓ Successfully generated {result.pairings.length} pairings in{' '}
          {result.attempts ?? 'unknown'} attempts
        </div>
      )}
    </div>
  )
}
