import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import LibraryPage from './pages/Library'
import QueuePage from './pages/Queue'
import EffectsPage from './pages/Effects'
import SettingsPage from './pages/Settings'
import PlayerPage from './pages/Player'
import PlaylistsPage from './pages/Playlists'
import AtmospherePage from './pages/Atmosphere'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LibraryPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="atmosphere" element={<AtmospherePage />} />
          <Route path="effects" element={<EffectsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="player" element={<PlayerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
