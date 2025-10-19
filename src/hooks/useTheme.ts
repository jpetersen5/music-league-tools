import { useState, useEffect } from 'react'
import type { Theme } from '@/types'
import { getStoredTheme, setStoredTheme, applyTheme } from '@/utils/theme'

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  return { theme, toggleTheme }
}
