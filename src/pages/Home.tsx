import { useState, useEffect } from 'react'
import { ToolCard } from '@/components/ToolCard'
import { Alert } from '@/components/common/Alert'
import { useProfileContext } from '@/contexts/ProfileContext'
import { TOOLS } from '@/utils/constants'
import './Home.scss'

const NO_PROFILES_ALERT_DISMISSED_KEY = 'music-league-tools:no-profiles-alert-dismissed'

export const Home = () => {
  const { profiles } = useProfileContext()
  const [showNoProfilesAlert, setShowNoProfilesAlert] = useState(false)

  // Check if we should show the no-profiles alert
  useEffect(() => {
    const dismissed = localStorage.getItem(NO_PROFILES_ALERT_DISMISSED_KEY)
    const shouldShow = profiles.length === 0 && !dismissed
    setShowNoProfilesAlert(shouldShow)
  }, [profiles.length])

  const handleDismissAlert = () => {
    localStorage.setItem(NO_PROFILES_ALERT_DISMISSED_KEY, 'true')
    setShowNoProfilesAlert(false)
  }

  return (
    <div className="home">
      {showNoProfilesAlert && (
        <Alert
          variant="info"
          message="No Music League profiles uploaded yet. Upload a profile from the header to get started analyzing your data."
          dismissible={true}
          onDismiss={handleDismissAlert}
        />
      )}
      <div className="home__header">
        <h2 className="home__title">Choose a Tool</h2>
        <p className="home__subtitle">
          Select from the toolbox below to analyze and visualize your Music League data
        </p>
      </div>
      <div className="home__grid">
        {TOOLS.map(tool => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}
