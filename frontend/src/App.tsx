import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardProvider } from '@/context/DashboardContext'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Service from '@/pages/Service'
import Cleanup from '@/pages/Cleanup'

const Dev = import.meta.env.DEV ? lazy(() => import('@/pages/Dev')) : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<DashboardProvider><MainLayout /></DashboardProvider>}>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<Service />} />
          <Route path="/cleanup" element={<Cleanup />} />
          {Dev && <Route path="/_dev" element={<Suspense><Dev /></Suspense>} />}
          {!import.meta.env.DEV && <Route path="/_dev" element={<Navigate to="/" replace />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
