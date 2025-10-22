import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Home } from '@/pages/Home'
import { SecretSanta } from '@/pages/SecretSanta'

function App() {
  return (
    <BrowserRouter basename="/music-league-tools">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="secret-santa" element={<SecretSanta />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
