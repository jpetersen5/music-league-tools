import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { Home } from '@/pages/Home'
import { SecretSanta } from '@/pages/SecretSanta'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/music-league-tools">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route
              path="secret-santa"
              element={
                <ErrorBoundary>
                  <SecretSanta />
                </ErrorBoundary>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
