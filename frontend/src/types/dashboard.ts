export interface SystemStats {
    cpu: { percent: number; total: number; active: number }
    ram: { percent: number; total: number; used: number; free: number }
    disk: { percent: number; total: number; used: number; free: number }
    network: { total_rx: number; total_tx: number; max_limit: number }
}

export interface DockerService {
    name: string
    containers: number
    last_deployed: number
    info: {
        cpu: { percent: number }
        ram: { used: number; percent: number }
    }
}

export interface SysHistoryPoint {
    time: number
    cpu: number
    ram: number
    disk: number
    networkRx?: number
    networkTx?: number
}

export interface ServiceHistoryPoint {
    time: number
    cpu: number
    ramPercent: number
}
