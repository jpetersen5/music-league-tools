import { useState, useMemo, useCallback, useRef } from 'react'
import type {
  SeparatorType,
  GenerationSettings,
  Constraint,
  SavedConfiguration,
  GenerationResult,
} from '@/types'
import { ParticipantInput } from '@/components/SecretSanta/ParticipantInput'
import { SettingsPanel } from '@/components/SecretSanta/SettingsPanel'
import { ConstraintsPanel } from '@/components/SecretSanta/ConstraintsPanel'
import { SaveLoadControls } from '@/components/SecretSanta/SaveLoadControls'
import { GeneratedPairingsPanel } from '@/components/SecretSanta/GeneratedPairingsPanel'
import {
  parseParticipants,
  detectDuplicates,
  generatePairings,
  createConfigSnapshot,
} from '@/utils/secretSanta'
import { saveConfiguration } from '@/utils/secretSantaStorage'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePairingConstraints } from '@/hooks/usePairingConstraints'
import './SecretSanta.scss'

export const SecretSanta = () => {
  const [participantInput, setParticipantInput] = useState('')
  const [separatorType, setSeparatorType] = useState<SeparatorType>('newline')
  const [customSeparator, setCustomSeparator] = useState('')

  const [settings, setSettings] = useState<GenerationSettings>({
    useHamiltonianCycle: true,
  })

  const [bannedPairings, setBannedPairings] = useState<Constraint[]>([])
  const [forcedPairings, setForcedPairings] = useState<Constraint[]>([])

  const [result, setResult] = useState<GenerationResult | null>(null)
  const [lastGenerationSnapshot, setLastGenerationSnapshot] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const [currentConfigName, setCurrentConfigName] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string>('')

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [hasSettingsError, setHasSettingsError] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)

  const participants = useMemo(
    () => parseParticipants(participantInput, separatorType, customSeparator),
    [participantInput, separatorType, customSeparator]
  )

  const duplicates = useMemo(() => detectDuplicates(participants), [participants])

  const hasExactDuplicates = useMemo(() => duplicates.some(d => d.isExact), [duplicates])

  const currentSnapshot = useMemo(
    () => createConfigSnapshot(participants, settings, bannedPairings, forcedPairings),
    [participants, settings, bannedPairings, forcedPairings]
  )

  const hasInputChanged = useMemo(
    () => currentSnapshot !== lastGenerationSnapshot && result !== null,
    [currentSnapshot, lastGenerationSnapshot, result]
  )

  const hasUnsavedChanges = useMemo(
    () => currentSnapshot !== savedSnapshot && participants.length > 0,
    [currentSnapshot, savedSnapshot, participants.length]
  )

  const canGenerate = useMemo(
    () =>
      participants.length > 0 &&
      !hasExactDuplicates &&
      bannedPairings.every(bp => participants.includes(bp.from) && participants.includes(bp.to)) &&
      forcedPairings.every(fp => participants.includes(fp.from) && participants.includes(fp.to)),
    [participants, hasExactDuplicates, bannedPairings, forcedPairings]
  )

  // Track save action trigger from keyboard
  const [triggerSaveDialog, setTriggerSaveDialog] = useState(0)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      try {
        const generationResult = generatePairings(
          participants,
          settings,
          bannedPairings,
          forcedPairings
        )
        setResult(generationResult)
        setLastGenerationSnapshot(currentSnapshot)
      } catch (error) {
        console.error('Error generating pairings:', error)
        setResult({
          pairings: [],
          success: false,
          warning: error instanceof Error ? error.message : 'An unexpected error occurred',
        })
      } finally {
        setIsGenerating(false)
      }
    }, 50)
  }, [participants, settings, bannedPairings, forcedPairings, currentSnapshot])

  const handleRegenerate = useCallback(async () => {
    setIsGenerating(true)

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      try {
        // Use the snapshot from last generation, not current inputs
        const snapshot = JSON.parse(lastGenerationSnapshot)

        // Validate snapshot structure
        if (!snapshot.participants || !Array.isArray(snapshot.participants)) {
          throw new Error('Invalid snapshot: missing or invalid participants')
        }

        const generationResult = generatePairings(
          snapshot.participants,
          snapshot.settings,
          snapshot.bannedPairings || [],
          snapshot.forcedPairings || []
        )
        setResult(generationResult)
      } catch (error) {
        console.error('Error regenerating pairings:', error)
        setResult({
          pairings: [],
          success: false,
          warning:
            error instanceof Error
              ? `Regeneration failed: ${error.message}`
              : 'Failed to regenerate pairings',
        })
      } finally {
        setIsGenerating(false)
      }
    }, 50)
  }, [lastGenerationSnapshot])

  const { handleBanPairing, handleForcePairing, handleRemoveBanned, handleRemoveForced } =
    usePairingConstraints(bannedPairings, forcedPairings, setBannedPairings, setForcedPairings)

  const handleBanAll = () => {
    if (!result) return
    const newBans = result.pairings.filter(
      p => !bannedPairings.some(bp => bp.from === p.from && bp.to === p.to)
    )
    setBannedPairings([...bannedPairings, ...newBans])
  }

  const handleSave = useCallback(
    (name: string | null) => {
      const configName = name || `Configuration ${new Date().toLocaleString()}`

      const config: SavedConfiguration = {
        name: configName,
        participants,
        bannedPairings,
        forcedPairings,
        settings,
        lastModified: Date.now(),
      }

      saveConfiguration(config)
      setCurrentConfigName(configName)
      setSavedSnapshot(currentSnapshot)
    },
    [participants, bannedPairings, forcedPairings, settings, currentSnapshot]
  )

  const handleLoad = (config: SavedConfiguration) => {
    setParticipantInput(config.participants.join('\n'))
    setSeparatorType('newline')
    setBannedPairings(config.bannedPairings)
    setForcedPairings(config.forcedPairings)
    setSettings(config.settings)
    setCurrentConfigName(config.name)
    setSavedSnapshot(
      createConfigSnapshot(
        config.participants,
        config.settings,
        config.bannedPairings,
        config.forcedPairings
      )
    )
    setResult(null)
  }

  const handleCurrentConfigDeleted = () => {
    // Clear current config name and treat as new unsaved config
    setCurrentConfigName(null)
    setSavedSnapshot('')
  }

  // Keyboard shortcut for save
  useKeyboardShortcuts({
    onSave: () => {
      if (hasUnsavedChanges) {
        if (currentConfigName) {
          // Quick save to existing config
          handleSave(currentConfigName)
        } else {
          // Trigger save dialog for new config
          setTriggerSaveDialog(prev => prev + 1)
        }
      }
    },
  })

  // Warn before leaving page with unsaved changes to a known config
  useUnsavedChanges(hasUnsavedChanges, currentConfigName)

  return (
    <div className="secret-santa">
      <div className="secret-santa__header">
        <div>
          <h2 className="secret-santa__title">Secret Santa-inator</h2>
          <p className="secret-santa__description">
            Create unique Secret Santa pairings with customizable constraints
          </p>
        </div>
        <SaveLoadControls
          currentName={currentConfigName}
          hasUnsavedChanges={hasUnsavedChanges}
          onLoad={handleLoad}
          onSave={handleSave}
          onCurrentConfigDeleted={handleCurrentConfigDeleted}
          triggerSaveDialog={triggerSaveDialog}
        />
      </div>

      <div className="secret-santa__grid">
        <div className="secret-santa__inputs">
          <ParticipantInput
            value={participantInput}
            onChange={setParticipantInput}
            separatorType={separatorType}
            customSeparator={customSeparator}
            onSettingsClick={() => setIsSettingsOpen(true)}
            settingsButtonRef={settingsButtonRef}
            hasSettingsError={hasSettingsError}
          />

          <ConstraintsPanel
            bannedConstraints={bannedPairings}
            forcedConstraints={forcedPairings}
            participants={participants}
            onBannedChange={setBannedPairings}
            onForcedChange={setForcedPairings}
          />

          <button
            className="secret-santa__generate-btn"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            type="button"
            aria-label={
              isGenerating ? 'Generating pairings in progress' : 'Generate Secret Santa pairings'
            }
            aria-live="polite"
            aria-busy={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Pairings'}
          </button>
        </div>

        <div className="secret-santa__output">
          <GeneratedPairingsPanel
            result={result}
            participants={participants}
            onBanPairing={handleBanPairing}
            onForcePairing={handleForcePairing}
            onRemoveBanned={handleRemoveBanned}
            onRemoveForced={handleRemoveForced}
            onBanAll={handleBanAll}
            bannedPairings={bannedPairings}
            forcedPairings={forcedPairings}
            onRegenerate={handleRegenerate}
            hasInputChanged={hasInputChanged}
            isGenerating={isGenerating}
          />
        </div>
      </div>

      <SettingsPanel
        settings={settings}
        onSettingsChange={setSettings}
        separatorType={separatorType}
        onSeparatorTypeChange={setSeparatorType}
        customSeparator={customSeparator}
        onCustomSeparatorChange={setCustomSeparator}
        participantCount={participants.length}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        anchorRef={settingsButtonRef}
        onValidationChange={setHasSettingsError}
      />
    </div>
  )
}
