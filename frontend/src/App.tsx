import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardProvider } from '@/context/DashboardContext'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import ServiceLayout from '@/pages/Service'
import ContainersPage from '@/pages/Service/ContainersPage'
import ImagesPage from '@/pages/Service/ImagesPage'
import LogsPage from '@/pages/Service/LogsPage'
import MetricsPage from '@/pages/Service/MetricsPage'
import Cleanup from '@/pages/Cleanup'
import Metrics from '@/pages/Metrics'

const Dev = import.meta.env.DEV ? lazy(() => import('@/pages/Dev')) : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<DashboardProvider><MainLayout /></DashboardProvider>}>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<ServiceLayout />}>
            <Route index element={<Navigate to="containers" replace />} />
            <Route path="containers" element={<ContainersPage />} />
            <Route path="images"     element={<ImagesPage />} />
            <Route path="logs"       element={<LogsPage />} />
            <Route path="metrics"    element={<MetricsPage />} />
          </Route>
          <Route path="/cleanup" element={<Cleanup />} />
          <Route path="/metrics" element={<Metrics />} />
          {Dev && <Route path="/_dev" element={<Suspense><Dev /></Suspense>} />}
          {!import.meta.env.DEV && <Route path="/_dev" element={<Navigate to="/" replace />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
