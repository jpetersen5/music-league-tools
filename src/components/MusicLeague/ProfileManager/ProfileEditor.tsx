/**
 * Profile Editor Component
 *
 * Modal for editing profile metadata (name, league name).
 * Simple form with validation and save/cancel actions.
 *
 * @module components/MusicLeague/ProfileManager/ProfileEditor
 */

import { useState, useEffect } from 'react'
import type { Profile } from '@/types/musicLeague'
import { updateProfileMetadata } from '@/services/database/profiles'
import { useToast } from '@/hooks/useToast'
import './ProfileEditor.scss'

export interface ProfileEditorProps {
  profile: Profile | null
  isOpen: boolean
  onClose: () => void
  onSaveComplete: () => void
}

export function ProfileEditor({ profile, isOpen, onClose, onSaveComplete }: ProfileEditorProps) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToast()

  // Initialize form with profile data when it changes
  useEffect(() => {
    if (profile) {
      setName(profile.name)
    }
  }, [profile])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setIsSaving(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) return

    // Validation
    if (!name.trim()) {
      toast.error('Profile name is required')
      return
    }

    setIsSaving(true)

    try {
      await updateProfileMetadata(profile.id, {
        name: name.trim(),
      })

      toast.success('Profile updated successfully')
      onSaveComplete()
      onClose()
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (!isSaving) {
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose()
    }
  }

  if (!isOpen || !profile) {
    return null
  }

  return (
    <div className="profile-editor-overlay" onClick={handleOverlayClick}>
      <div className="profile-editor">
        <div className="profile-editor__header">
          <h2 className="profile-editor__title">Edit Profile</h2>
          <button
            className="profile-editor__close"
            onClick={handleCancel}
            aria-label="Close"
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <form className="profile-editor__form" onSubmit={handleSubmit}>
          <div className="profile-editor__field">
            <label className="profile-editor__label" htmlFor="profile-name">
              Profile Name *
            </label>
            <input
              id="profile-name"
              type="text"
              className="profile-editor__input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter profile name"
              required
              disabled={isSaving}
              autoFocus
            />
            <p className="profile-editor__hint">
              A descriptive name to identify this profile (e.g., "Summer 2024 League")
            </p>
          </div>

          <div className="profile-editor__actions">
            <button
              type="button"
              className="profile-editor__button profile-editor__button--cancel"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-editor__button profile-editor__button--save"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
