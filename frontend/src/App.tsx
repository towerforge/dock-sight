import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardProvider } from '@/context/dashboard-context'
import MainLayout from '@/layouts/main-layout'
import Login from '@/pages/login'
import Home from '@/pages/home'
import ServiceLayout from '@/pages/service'
import OverviewPage from '@/pages/service/overview/overview-page'
import ContainersPage from '@/pages/service/containers/containers-page'
import ImagesPage from '@/pages/service/images/images-page'
import LogsPage from '@/pages/service/log/logs-page'
import MetricsPage from '@/pages/service/metrics/metrics-page'
import Cleanup from '@/pages/cleanup'
import SettingsLayout from '@/pages/settings'
import RegistriesPage from '@/pages/settings/registries'
import Metrics from '@/pages/metrics'
import VolumesPage from '@/pages/volumes'
import NetworkHome from '@/pages/network/home'
import NetworkDetailLayout from '@/pages/network/detail'
import NetworkOverviewPage from '@/pages/network/detail/overview/overview-page'
import NetworkServicesPage from '@/pages/network/detail/services/services-page'

const Dev = import.meta.env.DEV ? lazy(() => import('@/pages/dev')) : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<DashboardProvider><MainLayout /></DashboardProvider>}>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<ServiceLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview"   element={<OverviewPage />} />
            <Route path="containers" element={<ContainersPage />} />
            <Route path="images"     element={<ImagesPage />} />
            <Route path="logs"       element={<LogsPage />} />
            <Route path="metrics"    element={<MetricsPage />} />
          </Route>
          <Route path="/cleanup"  element={<Cleanup />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route path="registries" element={<RegistriesPage />} />
          </Route>
          <Route path="/metrics"  element={<Metrics />} />
          <Route path="/volumes"  element={<VolumesPage />} />
          <Route path="/network">
            <Route index element={<NetworkHome />} />
            <Route element={<NetworkDetailLayout />}>
              <Route path="overview" element={<NetworkOverviewPage />} />
              <Route path="services" element={<NetworkServicesPage />} />
            </Route>
          </Route>
          {Dev && <Route path="/_dev" element={<Suspense><Dev /></Suspense>} />}
          {!import.meta.env.DEV && <Route path="/_dev" element={<Navigate to="/" replace />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
