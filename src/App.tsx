import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { Home } from '@/pages/Home'
import { SecretSanta } from '@/pages/SecretSanta'
import { AlertTest } from '@/pages/AlertTest'
import { DataTableTest } from '@/pages/DataTableTest'
import { ManageProfiles } from '@/pages/ManageProfiles'
import { Leaderboard } from '@/pages/Leaderboard'
import { ToastProvider } from '@/components/common/ToastProvider'
import { ProfileUploadModal } from '@/components/MusicLeague/ProfileUploadModal'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { useState } from 'react'

function App() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <ToastProvider>
      <ErrorBoundary>
        <ProfileProvider>
          <BrowserRouter basename="/music-league-tools">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route
                  path="profile-upload"
                  element={
                    <>
                      <button onClick={() => setIsOpen(true)}>Upload Profile</button>
                      <ProfileUploadModal
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        onUploadComplete={() => {
                          // Upload complete
                        }}
                      />
                    </>
                  }
                />
                <Route
                  path="secret-santa"
                  element={
                    <ErrorBoundary>
                      <SecretSanta />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="alert-test"
                  element={
                    <ErrorBoundary>
                      <AlertTest />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="data-table-test"
                  element={
                    <ErrorBoundary>
                      <DataTableTest />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="manage-profiles"
                  element={
                    <ErrorBoundary>
                      <ManageProfiles />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="leaderboard"
                  element={
                    <ErrorBoundary>
                      <Leaderboard />
                    </ErrorBoundary>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </ProfileProvider>
      </ErrorBoundary>
    </ToastProvider>
  )
}

export default App
