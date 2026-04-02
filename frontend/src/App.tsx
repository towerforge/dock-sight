import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Home from '@/pages/Home'
import Service from '@/pages/Service'

const Dev = import.meta.env.DEV ? lazy(() => import('@/pages/Dev')) : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<Service />} />
          {Dev && <Route path="/_dev" element={<Dev />} />}
          {!import.meta.env.DEV && <Route path="/_dev" element={<Navigate to="/" replace />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
