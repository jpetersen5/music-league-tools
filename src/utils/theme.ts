import type { Theme } from '@/types'

const THEME_KEY = 'music-league-tools-theme'

export const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

export const setStoredTheme = (theme: Theme): void => {
  localStorage.setItem(THEME_KEY, theme)
}

export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme)
}
