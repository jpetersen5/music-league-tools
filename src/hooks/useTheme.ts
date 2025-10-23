import { useState, useEffect } from 'react'
import type { Theme } from '@/types'
import { getStoredTheme, setStoredTheme, applyTheme } from '@/utils/theme'

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? ('light' as const) : ('dark' as const)
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  return { theme, toggleTheme }
}
