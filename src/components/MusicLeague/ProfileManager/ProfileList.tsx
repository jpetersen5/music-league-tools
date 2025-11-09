/**
 * Profile List Component
 *
 * Grid container for profile cards with empty state.
 * Displays all user profiles in a responsive grid layout.
 *
 * @module components/MusicLeague/ProfileManager/ProfileList
 */

import type { Profile } from '@/types/musicLeague'
import { ProfileCard } from './ProfileCard'
import uploadIcon from '/upload.svg'
import './ProfileList.scss'

export interface ProfileListProps {
  profiles: Profile[]
  isLoading?: boolean
  onEdit: (profile: Profile) => void
  onExport: (profile: Profile) => void
  onDelete: (profile: Profile) => void
  onUploadClick: () => void
}

export function ProfileList({
  profiles,
  isLoading = false,
  onEdit,
  onExport,
  onDelete,
  onUploadClick,
}: ProfileListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="profile-list">
        <div className="profile-list__loading">
          <p className="profile-list__loading-text">Loading profiles...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (profiles.length === 0) {
    return (
      <div className="profile-list">
        <div className="profile-list__empty">
          <h2 className="profile-list__empty-title">No Profiles Yet</h2>
          <p className="profile-list__empty-description">
            Upload your first Music League profile to get started analyzing your data.
          </p>
          <button className="profile-list__empty-button" onClick={onUploadClick}>
            <img src={uploadIcon} alt="" className="profile-list__empty-button-icon" />
            Upload Profile
          </button>
        </div>
      </div>
    )
  }

  // Profile grid
  return (
    <div className="profile-list">
      <div className="profile-list__grid">
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onEdit={onEdit}
            onExport={onExport}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
