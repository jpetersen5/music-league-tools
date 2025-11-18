import { useContext } from 'react'
import { PageHeaderContext } from '@/contexts/PageHeaderContext'

export function usePageHeader() {
  const context = useContext(PageHeaderContext)
  if (!context) {
    throw new Error('usePageHeader must be used within PageHeaderProvider')
  }
  return context
}
