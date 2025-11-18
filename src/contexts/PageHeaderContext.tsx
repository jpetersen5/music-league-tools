import { createContext, useState, ReactNode } from 'react'

interface PageHeaderContextValue {
  pageTitle: string | null
  setPageTitle: (title: string | null) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | null>(null)

  return (
    <PageHeaderContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageHeaderContext.Provider>
  )
}
