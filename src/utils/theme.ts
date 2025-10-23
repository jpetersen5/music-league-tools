import { isTheme, type Theme } from '@/types'

const THEME_KEY = 'music-league-tools-theme' as const
const DEFAULT_THEME: Theme = 'dark' as const

export const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY)
  return stored && isTheme(stored) ? stored : DEFAULT_THEME
}

export const setStoredTheme = (theme: Theme): void => {
  localStorage.setItem(THEME_KEY, theme)
}

export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme)
}
