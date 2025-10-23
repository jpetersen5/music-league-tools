import { useState, useEffect } from 'react'
import type { SavedConfiguration } from '@/types'
import { getSavedConfigurations, deleteConfiguration } from '@/utils/secretSanta/storage'
import { CONFIRM_LOAD_UNSAVED } from '@/constants/secretSanta'
import { SaveDialog } from './SaveDialog'
import { LoadMenu } from './LoadMenu'
import saveIcon from '/save.svg'
import loadIcon from '/load.svg'
import './SaveLoadControls.scss'

interface SaveLoadControlsProps {
  currentName: string | null
  hasUnsavedChanges: boolean
  onLoad: (config: SavedConfiguration) => void
  onSave: (name: string) => void
  onCurrentConfigDeleted?: () => void
  triggerSaveDialog?: number
}

export const SaveLoadControls = ({
  currentName,
  hasUnsavedChanges,
  onLoad,
  onSave,
  onCurrentConfigDeleted,
  triggerSaveDialog,
}: SaveLoadControlsProps) => {
  const [savedConfigs, setSavedConfigs] = useState<SavedConfiguration[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    refreshSavedConfigs()
  }, [])

  useEffect(() => {
    if (triggerSaveDialog && triggerSaveDialog > 0) {
      setShowSaveDialog(true)
    }
  }, [triggerSaveDialog])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const refreshSavedConfigs = () => {
    try {
      setSavedConfigs(getSavedConfigurations())
    } catch (err) {
      console.error('Failed to refresh saved configurations:', err)
      setError('Failed to load saved configurations')
    }
  }

  const handleSave = async () => {
    if (currentName) {
      // Quick save to existing name
      setIsSaving(true)
      setError(null)

      try {
        onSave(currentName)
        refreshSavedConfigs()
      } catch (err) {
        console.error('Failed to save configuration:', err)
        setError(err instanceof Error ? err.message : 'Failed to save configuration')
      } finally {
        setIsSaving(false)
      }
    } else {
      // Show save dialog for new config
      setShowSaveDialog(true)
    }
  }

  const handleSaveAs = async (name: string) => {
    setIsSaving(true)
    setError(null)

    try {
      onSave(name)
      setShowSaveDialog(false)
      refreshSavedConfigs()
    } catch (err) {
      console.error('Failed to save configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoad = (config: SavedConfiguration) => {
    if (hasUnsavedChanges) {
      if (!confirm(CONFIRM_LOAD_UNSAVED)) {
        return
      }
    }

    try {
      onLoad(config)
      setShowLoadMenu(false)
      setError(null)
    } catch (err) {
      console.error('Failed to load configuration:', err)
      setError('Failed to load configuration')
    }
  }

  const handleDelete = (name: string) => {
    setError(null)

    try {
      deleteConfiguration(name)
      refreshSavedConfigs()

      // If we deleted the current config, notify parent
      if (name === currentName && onCurrentConfigDeleted) {
        onCurrentConfigDeleted()
      }
    } catch (err) {
      console.error('Failed to delete configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete configuration')
    }
  }

  return (
    <div className="save-load-controls">
      {error && (
        <div className="save-load-controls__error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="save-load-controls__buttons">
        <button
          className="save-load-controls__btn"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
          type="button"
          title={currentName ? `Save to "${currentName}"` : 'Save As...'}
        >
          <img src={saveIcon} alt="Save" />
          <span>
            {isSaving ? 'Saving...' : `Save${hasUnsavedChanges && currentName ? '*' : ''}`}
          </span>
        </button>

        <button
          className="save-load-controls__btn"
          onClick={() => setShowSaveDialog(true)}
          type="button"
          title="Save As..."
        >
          Save As...
        </button>

        <div className="save-load-controls__load-wrapper">
          <button
            className="save-load-controls__btn"
            onClick={() => {
              refreshSavedConfigs()
              setShowLoadMenu(!showLoadMenu)
            }}
            type="button"
            disabled={savedConfigs.length === 0}
            title="Load configuration"
          >
            <img src={loadIcon} alt="Load" />
            <span>Load</span>
          </button>

          <LoadMenu
            isOpen={showLoadMenu}
            configurations={savedConfigs}
            onLoad={handleLoad}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveAs}
        currentName={currentName}
        existingNames={savedConfigs.map(c => c.name)}
      />
    </div>
  )
}
