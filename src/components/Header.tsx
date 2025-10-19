import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { APP_NAME } from '@/utils/constants'

export const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/">
          <h1 className="app-title">{APP_NAME}</h1>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
