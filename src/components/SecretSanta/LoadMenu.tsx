import type { SavedConfiguration } from '@/types'
import { CONFIRM_DELETE_CONFIG } from '@/constants/secretSanta'
import './SaveLoadControls.scss'

interface LoadMenuProps {
  isOpen: boolean
  configurations: SavedConfiguration[]
  onLoad: (config: SavedConfiguration) => void
  onDelete: (name: string) => void
}

export const LoadMenu = ({ isOpen, configurations, onLoad, onDelete }: LoadMenuProps) => {
  const handleDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(CONFIRM_DELETE_CONFIG(name))) {
      onDelete(name)
    }
  }

  if (!isOpen || configurations.length === 0) return null

  return (
    <div className="save-load-controls__dropdown">
      {configurations.map(config => (
        <div
          key={config.name}
          className="save-load-controls__dropdown-item"
          onClick={() => onLoad(config)}
        >
          <span className="save-load-controls__dropdown-name">{config.name}</span>
          <button
            className="save-load-controls__delete-btn"
            onClick={e => handleDelete(config.name, e)}
            type="button"
            aria-label="Delete"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
