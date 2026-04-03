import { useState, useEffect } from 'react'
import { apiSysInfo, apiDockerService } from '@/services/api'
import type { SystemStats, DockerService, SysHistoryPoint, ServiceHistoryPoint } from '@/types/dashboard'

const MAX_HISTORY = 200

export function useDashboardData(refreshInterval: number) {
    const [sys, setSys] = useState<SystemStats | null>(null)
    const [dock, setDock] = useState<DockerService[]>([])
    const [sysHistory, setSysHistory] = useState<SysHistoryPoint[]>([])
    const [serviceHistory, setServiceHistory] = useState<Record<string, ServiceHistoryPoint[]>>({})
    const [tick, setTick] = useState(0)

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const [sysResult, dockResult] = await Promise.allSettled([apiSysInfo(), apiDockerService()])
                const now = Date.now()

                if (sysResult.status === 'fulfilled' && mounted) {
                    const d = sysResult.value
                    setSys(d)
                    setSysHistory(prev => {
                        const point: SysHistoryPoint = {
                            time: now,
                            cpu: d.cpu.percent,
                            ram: d.ram.percent,
                            disk: d.disk.percent,
                            networkRx: d.network?.total_rx ?? 0,
                            networkTx: d.network?.total_tx ?? 0,
                        }
                        const next = [point, ...prev]
                        if (next.length > MAX_HISTORY) next.pop()
                        return next
                    })
                }

                if (dockResult.status === 'fulfilled' && mounted) {
                    const d = dockResult.value
                    setDock(d)
                    setServiceHistory(prev => {
                        const next = { ...prev }
                        d.forEach((svc: DockerService) => {
                            const history = [...(next[svc.name] ?? []), {
                                time: now,
                                cpu: svc.info.cpu.percent,
                                ramPercent: svc.info.ram.percent,
                            }]
                            if (history.length > MAX_HISTORY) history.shift()
                            next[svc.name] = history
                        })
                        return next
                    })
                }
            } catch (err) {
                console.error('Dashboard data error:', err)
            }
        })()
        return () => { mounted = false }
    }, [tick])

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), refreshInterval)
        return () => clearInterval(id)
    }, [refreshInterval])

    return { sys, dock, sysHistory, serviceHistory }
}
