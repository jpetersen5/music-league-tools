import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { ProfileSwitcher } from './MusicLeague/ProfileSwitcher'
import { APP_NAME } from '@/utils/constants'
import { usePageHeader } from '@/hooks/usePageHeader'

export const Header = () => {
  const { pageTitle } = usePageHeader()

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="app-title-link">
          <h1 className="app-title">{APP_NAME}</h1>
        </Link>
        {pageTitle && (
          <div className="page-title-container">
            <h2 className="page-title">{pageTitle}</h2>
          </div>
        )}
        <div className="header-actions">
          <ProfileSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
