import { createContext, useContext, useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import type { SystemStats, DockerService, SysHistoryPoint, ServiceHistoryPoint } from '@/types/dashboard'

interface DashboardCtx {
    sys: SystemStats | null
    dock: DockerService[]
    sysHistory: SysHistoryPoint[]
    serviceHistory: Record<string, ServiceHistoryPoint[]>
    refreshInterval: number
    setRefreshInterval: (v: number) => void
    pointCount: number
    setPointCount: (v: number) => void
}

const Ctx = createContext<DashboardCtx | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [refreshInterval, setRefreshInterval] = useState(5000)
    const [pointCount, setPointCount] = useState(10)

    const { sys, dock, sysHistory, serviceHistory } = useDashboardData(refreshInterval)

    return (
        <Ctx value={{ sys, dock, sysHistory, serviceHistory, refreshInterval, setRefreshInterval, pointCount, setPointCount }}>
            {children}
        </Ctx>
    )
}

export function useDashboard() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
    return ctx
}
