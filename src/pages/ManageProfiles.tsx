/**
 * Manage Profiles Page
 *
 * Profile management page with full CRUD functionality.
 * Users can view, edit, export, and delete their profiles.
 *
 * @module pages/ManageProfiles
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileContext } from '@/contexts/ProfileContext'
import { ProfileList } from '@/components/MusicLeague/ProfileManager/ProfileList'
import { ProfileEditor } from '@/components/MusicLeague/ProfileManager/ProfileEditor'
import { ProfileUploadModal } from '@/components/MusicLeague/ProfileUploadModal'
import type { Profile } from '@/types/musicLeague'
import { deleteProfile } from '@/services/database/profiles'
import { exportProfileAsZip } from '@/utils/musicLeague/profileImportExport'
import { useToast } from '@/hooks/useToast'
import './ManageProfiles.scss'

export function ManageProfiles() {
  const navigate = useNavigate()
  const { profiles, refreshProfiles, activeProfileId, setActiveProfile } = useProfileContext()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const toast = useToast()

  // Handle edit profile
  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setEditorOpen(true)
  }

  // Handle export profile
  const handleExport = async (profile: Profile) => {
    try {
      toast.info('Preparing export...')
      await exportProfileAsZip(profile.id, profile.name)
      toast.success(`Profile "${profile.name}" exported successfully`)
    } catch (error) {
      console.error('Failed to export profile:', error)
      toast.error('Failed to export profile. Please try again.')
    }
  }

  // Handle delete profile (show confirmation)
  const handleDelete = (profile: Profile) => {
    setDeleteConfirmProfile(profile)
  }

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!deleteConfirmProfile) return

    setIsDeleting(true)

    try {
      const success = await deleteProfile(deleteConfirmProfile.id)

      if (success) {
        toast.success(`Profile "${deleteConfirmProfile.name}" deleted successfully`)

        // If we deleted the active profile, switch to "All Profiles" or first available
        if (activeProfileId === deleteConfirmProfile.id) {
          const remainingProfiles = profiles.filter(p => p.id !== deleteConfirmProfile.id)
          if (remainingProfiles.length > 0) {
            await setActiveProfile(remainingProfiles[0]!.id)
          } else {
            await setActiveProfile(null)
          }
        }

        // Refresh profile list
        await refreshProfiles()
        setDeleteConfirmProfile(null)
      } else {
        toast.error('Profile not found')
      }
    } catch (error) {
      console.error('Failed to delete profile:', error)
      toast.error('Failed to delete profile. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    if (!isDeleting) {
      setDeleteConfirmProfile(null)
    }
  }

  // Handle upload click
  const handleUploadClick = () => {
    setUploadModalOpen(true)
  }

  // Handle upload complete
  const handleUploadComplete = async () => {
    setUploadModalOpen(false)
    await refreshProfiles()
  }

  // Handle editor save complete
  const handleEditorSaveComplete = async () => {
    await refreshProfiles()
  }

  return (
    <div className="manage-profiles">
      <div className="manage-profiles__header">
        <div>
          <h1 className="manage-profiles__title">Manage Profiles</h1>
          <p className="manage-profiles__description">
            View, edit, export, and delete your Music League profiles.
          </p>
        </div>
        <div className="manage-profiles__actions">
          <button
            className="manage-profiles__button manage-profiles__button--secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
          <button
            className="manage-profiles__button manage-profiles__button--primary"
            onClick={handleUploadClick}
          >
            Upload Profile
          </button>
        </div>
      </div>

      <ProfileList
        profiles={profiles}
        onEdit={handleEdit}
        onExport={handleExport}
        onDelete={handleDelete}
        onUploadClick={handleUploadClick}
      />

      {/* Profile Editor Modal */}
      <ProfileEditor
        profile={editingProfile}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaveComplete={handleEditorSaveComplete}
      />

      {/* Profile Upload Modal */}
      <ProfileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmProfile && (
        <div className="delete-confirm-overlay" onClick={cancelDelete}>
          <div className="delete-confirm" onClick={e => e.stopPropagation()}>
            <h2 className="delete-confirm__title">Delete Profile?</h2>
            <p className="delete-confirm__message">
              Are you sure you want to delete <strong>"{deleteConfirmProfile.name}"</strong>?
            </p>
            <p className="delete-confirm__warning">
              This will permanently delete all data including competitors, rounds, submissions, and
              votes. This action cannot be undone.
            </p>
            <div className="delete-confirm__actions">
              <button
                className="delete-confirm__button delete-confirm__button--cancel"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="delete-confirm__button delete-confirm__button--delete"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
