import { useTheme } from '@/hooks/useTheme'
import sunIcon from '/sun.svg'
import moonIcon from '/moon.svg'
import './ThemeToggle.scss'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <img
        src={theme === 'dark' ? sunIcon : moonIcon}
        alt={theme === 'dark' ? 'Sun icon' : 'Moon icon'}
        className="theme-toggle__icon"
      />
    </button>
  )
}
