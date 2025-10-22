import { useState, useEffect } from 'react'
import type { SavedConfiguration } from '@/types'
import { getSavedConfigurations, deleteConfiguration } from '@/utils/secretSantaStorage'
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

  useEffect(() => {
    refreshSavedConfigs()
  }, [])

  useEffect(() => {
    if (triggerSaveDialog && triggerSaveDialog > 0) {
      setShowSaveDialog(true)
    }
  }, [triggerSaveDialog])

  const refreshSavedConfigs = () => {
    setSavedConfigs(getSavedConfigurations())
  }

  const handleSave = () => {
    if (currentName) {
      // Quick save to existing name
      onSave(currentName)
      setTimeout(() => refreshSavedConfigs(), 100)
    } else {
      // Show save dialog for new config
      setShowSaveDialog(true)
    }
  }

  const handleSaveAs = (name: string) => {
    onSave(name)
    setShowSaveDialog(false)
    setTimeout(() => refreshSavedConfigs(), 100)
  }

  const handleLoad = (config: SavedConfiguration) => {
    if (hasUnsavedChanges) {
      if (!confirm(CONFIRM_LOAD_UNSAVED)) {
        return
      }
    }
    onLoad(config)
    setShowLoadMenu(false)
  }

  const handleDelete = (name: string) => {
    deleteConfiguration(name)
    setTimeout(() => refreshSavedConfigs(), 100)
    // If we deleted the current config, notify parent
    if (name === currentName && onCurrentConfigDeleted) {
      onCurrentConfigDeleted()
    }
  }

  return (
    <div className="save-load-controls">
      <button
        className="save-load-controls__btn"
        onClick={handleSave}
        disabled={!hasUnsavedChanges}
        type="button"
        title={currentName ? `Save to "${currentName}"` : 'Save As...'}
      >
        <img src={saveIcon} alt="Save" />
        <span>Save{hasUnsavedChanges && currentName && '*'}</span>
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
