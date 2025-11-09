/**
 * Profile Card Component
 *
 * Displays individual profile information with action buttons.
 * Shows profile name, statistics, and actions (Edit, Export, Delete).
 *
 * @module components/MusicLeague/ProfileManager/ProfileCard
 */

import type { Profile } from '@/types/musicLeague'
import editIcon from '/settings.svg'
import exportIcon from '/download.svg'
import deleteIcon from '/trash-red.svg'
import './ProfileCard.scss'

export interface ProfileCardProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  onExport: (profile: Profile) => void
  onDelete: (profile: Profile) => void
}

export function ProfileCard({ profile, onEdit, onExport, onDelete }: ProfileCardProps) {
  const handleEdit = () => {
    onEdit(profile)
  }

  const handleExport = () => {
    onExport(profile)
  }

  const handleDelete = () => {
    onDelete(profile)
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="profile-card">
      <div className="profile-card__header">
        <h3 className="profile-card__title">{profile.name}</h3>
      </div>

      <div className="profile-card__stats">
        <div className="profile-card__stat">
          <span className="profile-card__stat-label">Rounds</span>
          <span className="profile-card__stat-value">{profile.roundCount}</span>
        </div>
        <div className="profile-card__stat">
          <span className="profile-card__stat-label">Submissions</span>
          <span className="profile-card__stat-value">{profile.submissionCount}</span>
        </div>
        <div className="profile-card__stat">
          <span className="profile-card__stat-label">Votes</span>
          <span className="profile-card__stat-value">{profile.voteCount}</span>
        </div>
        <div className="profile-card__stat">
          <span className="profile-card__stat-label">Competitors</span>
          <span className="profile-card__stat-value">{profile.competitors.total}</span>
        </div>
      </div>

      <div className="profile-card__meta">
        <p className="profile-card__meta-item">
          <span className="profile-card__meta-label">Created:</span>{' '}
          <span className="profile-card__meta-value">{formatDate(profile.createdAt)}</span>
        </p>
        <p className="profile-card__meta-item">
          <span className="profile-card__meta-label">Updated:</span>{' '}
          <span className="profile-card__meta-value">{formatDate(profile.updatedAt)}</span>
        </p>
      </div>

      <div className="profile-card__actions">
        <button
          className="profile-card__action profile-card__action--edit"
          onClick={handleEdit}
          aria-label="Edit profile"
          title="Edit profile"
        >
          <img src={editIcon} alt="" className="profile-card__action-icon" />
          <span className="profile-card__action-text">Edit</span>
        </button>
        <button
          className="profile-card__action profile-card__action--export"
          onClick={handleExport}
          aria-label="Export profile"
          title="Export profile as ZIP"
        >
          <img src={exportIcon} alt="" className="profile-card__action-icon" />
          <span className="profile-card__action-text">Export</span>
        </button>
        <button
          className="profile-card__action profile-card__action--delete"
          onClick={handleDelete}
          aria-label="Delete profile"
          title="Delete profile"
        >
          <img src={deleteIcon} alt="" className="profile-card__action-icon" />
          <span className="profile-card__action-text">Delete</span>
        </button>
      </div>
    </div>
  )
}
