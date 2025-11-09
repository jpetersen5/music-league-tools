/**
 * Profile Switcher Component
 *
 * Dropdown in header for switching between Music League profiles.
 * Shows all profiles with active indicator and quick actions.
 *
 * @module components/MusicLeague/ProfileSwitcher
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileContext, ALL_PROFILES_ID } from '@/contexts/ProfileContext'
import type { ProfileId } from '@/types/musicLeague'
import { ProfileUploadModal } from './ProfileUploadModal'
import userIcon from '/user.svg'
import usersIcon from '/users.svg'
import checkIcon from '/check.svg'
import uploadIcon from '/upload.svg'
import settingsIcon from '/settings.svg'
import './ProfileSwitcher.scss'

export function ProfileSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { activeProfile, activeProfileId, profiles, isAllProfilesActive, setActiveProfile } =
    useProfileContext()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleProfileSelect = async (profileId: ProfileId) => {
    await setActiveProfile(profileId)
    setIsOpen(false)
  }

  const handleUploadClick = () => {
    setIsOpen(false)
    setUploadModalOpen(true)
  }

  const handleManageClick = () => {
    setIsOpen(false)
    navigate('/manage-profiles')
  }

  const getDisplayName = () => {
    if (isAllProfilesActive) {
      return 'All Profiles'
    }
    return activeProfile?.name || 'Select Profile'
  }

  const hasProfiles = profiles.length > 0

  return (
    <>
      <div className="profile-switcher" ref={dropdownRef}>
        <button
          className="profile-switcher__button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Profile menu"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <img
            src={isAllProfilesActive ? usersIcon : userIcon}
            alt=""
            className="profile-switcher__button-icon"
          />
          <span className="profile-switcher__button-text">{getDisplayName()}</span>
          <svg
            className={`profile-switcher__button-arrow ${isOpen ? 'profile-switcher__button-arrow--open' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="profile-switcher__dropdown">
            {/* No profiles state */}
            {!hasProfiles && (
              <div className="profile-switcher__empty">
                <p className="profile-switcher__empty-message">No profiles yet</p>
                <button className="profile-switcher__empty-button" onClick={handleUploadClick}>
                  <img src={uploadIcon} alt="" className="profile-switcher__action-icon" />
                  Upload Profile
                </button>
              </div>
            )}

            {/* Profile list */}
            {hasProfiles && (
              <>
                <div className="profile-switcher__profile-list">
                  {/* All Profiles option */}
                  <button
                    className={`profile-switcher__item ${isAllProfilesActive ? 'profile-switcher__item--active' : ''}`}
                    onClick={() => handleProfileSelect(ALL_PROFILES_ID)}
                  >
                    <img src={usersIcon} alt="" className="profile-switcher__item-icon" />
                    <span className="profile-switcher__item-text">All Profiles</span>
                    {isAllProfilesActive && (
                      <img src={checkIcon} alt="Active" className="profile-switcher__item-check" />
                    )}
                  </button>

                  <div className="profile-switcher__divider" />

                  {/* Individual profiles */}
                  {profiles.map(profile => {
                    const isActive = activeProfileId === profile.id
                    return (
                      <button
                        key={profile.id}
                        className={`profile-switcher__item ${isActive ? 'profile-switcher__item--active' : ''}`}
                        onClick={() => handleProfileSelect(profile.id)}
                      >
                        <img src={userIcon} alt="" className="profile-switcher__item-icon" />
                        <span className="profile-switcher__item-text">{profile.name}</span>
                        {isActive && (
                          <img
                            src={checkIcon}
                            alt="Active"
                            className="profile-switcher__item-check"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="profile-switcher__divider" />

                {/* Quick actions */}
                <div className="profile-switcher__actions">
                  <button className="profile-switcher__action" onClick={handleUploadClick}>
                    <img src={uploadIcon} alt="" className="profile-switcher__action-icon" />
                    Upload Profile
                  </button>
                  <button className="profile-switcher__action" onClick={handleManageClick}>
                    <img src={settingsIcon} alt="" className="profile-switcher__action-icon" />
                    Manage Profiles
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile Upload Modal */}
      <ProfileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={() => {
          setUploadModalOpen(false)
        }}
      />
    </>
  )
}
