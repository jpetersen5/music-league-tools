import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { PageHeaderProvider } from '@/contexts/PageHeaderContext'

export const Layout = () => {
  return (
    <PageHeaderProvider>
      <div className="app-container">
        <Header />
        <main className="app-main">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </main>
      </div>
    </PageHeaderProvider>
  )
}
