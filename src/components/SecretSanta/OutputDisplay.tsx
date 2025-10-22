import { useState, useMemo } from 'react'
import type { Pairing, Constraint, GenerationResult, Participant } from '@/types'
import { detectCycles, downloadTextFile, isPairingInList } from '@/utils/secretSanta'
import { CONFIRM_BAN_ALL } from '@/constants/secretSanta'
import { PairingBrick } from './PairingBrick'
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
}: OutputDisplayProps) => {
  const [copied, setCopied] = useState(false)

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

  if (!result) {
    return null
  }

  const handleCopy = async () => {
    const text = result.pairings.map(p => `${p.from} → ${p.to}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownload = () => {
    const text = result.pairings.map(p => `${p.from} → ${p.to}`).join('\n')
    downloadTextFile(text, 'secret-santa-pairings.txt')
  }

  const isPairingBanned = (pairing: Pairing) => isPairingInList(pairing, bannedPairings)

  const isPairingForced = (pairing: Pairing) => isPairingInList(pairing, forcedPairings)

  return (
    <div className="output-display">
      <div className="output-display__header">
        <h3>Generated Pairings</h3>
        <div className="output-display__actions">
          <button
            className="output-display__btn output-display__btn--ban-all"
            onClick={() => {
              if (confirm(CONFIRM_BAN_ALL)) {
                onBanAll()
              }
            }}
            type="button"
            title="Ban all generated pairings"
            aria-label="Ban All"
          >
            <img src={banAllIcon} alt="Ban All" />
          </button>
          <button
            className="output-display__btn output-display__btn--regenerate"
            onClick={onRegenerate}
            type="button"
            title="Generate a different pairing with the same settings"
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

      {hasInputChanged && (
        <div className="output-display__warning">
          ⚠️ Inputs have changed since generation. Click "Generate" to use new inputs.
        </div>
      )}

      {result.warning && <div className="output-display__warning">⚠️ {result.warning}</div>}

      {!result.success && result.pairings.length === 0 && (
        <div className="output-display__error">
          ❌ Could not generate valid pairings after {result.attempts ?? 'unknown'} attempts. Please
          adjust your constraints.
        </div>
      )}

      {result.pairings.length > 0 && (
        <div className="output-display__bricks">
          {sortedCycles.flatMap((cycle, cycleIndex) =>
            [
              ...cycle.map((pairing, pairingIndex) => (
                <PairingBrick
                  key={`${pairing.from}-${pairing.to}-${pairingIndex}`}
                  pairing={pairing}
                  isBanned={isPairingBanned(pairing)}
                  isForced={isPairingForced(pairing)}
                  onBan={() => onBanPairing(pairing)}
                  onForce={() => onForcePairing(pairing)}
                  onRemoveBanned={() => onRemoveBanned(pairing)}
                  onRemoveForced={() => onRemoveForced(pairing)}
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
        <div className="output-display__success">
          ✓ Successfully generated {result.pairings.length} pairings in{' '}
          {result.attempts ?? 'unknown'} attempts
        </div>
      )}
    </div>
  )
}
