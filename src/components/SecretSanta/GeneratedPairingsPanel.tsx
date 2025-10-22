import { useState } from 'react'
import type { GenerationResult, Constraint, Participant, Pairing } from '@/types'
import { OutputDisplay } from './OutputDisplay'
import { GraphVisualization } from './GraphVisualization'
import { Tabs } from '../common/Tabs'
import './GeneratedPairingsPanel.scss'

interface GeneratedPairingsPanelProps {
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

export const GeneratedPairingsPanel = ({
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
}: GeneratedPairingsPanelProps) => {
  const [activeView, setActiveView] = useState<'list' | 'graph'>('list')

  if (!result) {
    return null
  }

  return (
    <div className="generated-pairings-panel">
      <Tabs
        tabs={[
          { id: 'list', label: 'List View' },
          { id: 'graph', label: 'Graph View' },
        ]}
        activeTab={activeView}
        onChange={setActiveView}
        className="generated-pairings-panel__tabs"
      />

      <div className="generated-pairings-panel__content">
        {activeView === 'list' ? (
          <OutputDisplay
            result={result}
            participants={participants}
            onBanPairing={onBanPairing}
            onForcePairing={onForcePairing}
            onRemoveBanned={onRemoveBanned}
            onRemoveForced={onRemoveForced}
            onBanAll={onBanAll}
            bannedPairings={bannedPairings}
            forcedPairings={forcedPairings}
            onRegenerate={onRegenerate}
            hasInputChanged={hasInputChanged}
          />
        ) : (
          <GraphVisualization pairings={result.pairings} participants={participants} />
        )}
      </div>
    </div>
  )
}
