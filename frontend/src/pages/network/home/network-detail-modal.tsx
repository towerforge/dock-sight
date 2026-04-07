import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import type { DockerService } from '@/types/dashboard'
import { formatBytes, formatRelativeTime } from '@/lib/formatters'
import { NETWORK_COLORS as NET_COLORS } from '@/lib/colors'

// ── Types ─────────────────────────────────────────────────────────────────────
type KVRow = { id: string; label: string; value: React.ReactNode }

type SvcRow = {
    id: string
    name: string
    status: 'running' | 'paused'
    containers: number
    cpu: number
    ram: number
    ramUsed: number
    rx: number
    tx: number
    lastDeployed: number
}

interface ApiNetworkInfo {
    id: string
    name: string
    driver: string
    scope: string
}

// ── Columns ───────────────────────────────────────────────────────────────────
const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</span> },
    { key: 'value', header: 'Value', render: r => r.value },
]

const svcCols: Column<SvcRow>[] = [
    {
        key: 'name', header: 'Service',
        render: r => (
            <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-1)' }}>
                {r.name}
            </span>
        ),
    },
    {
        key: 'status', header: 'Status', shrink: true,
        render: r => {
            const c = r.status === 'running' ? '#10b981' : '#6b7280'
            const label = r.status === 'running' ? 'Running' : 'Paused'
            return (
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 8px', borderRadius: 20,
                    background: c + '18', fontSize: 11, fontWeight: 600, color: c,
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    {label}
                </span>
            )
        },
    },
    {
        key: 'cpu', header: 'CPU', shrink: true,
        render: r => {
            const color = r.cpu > 80 ? '#ef4444' : r.cpu > 50 ? '#f59e0b' : '#3b82f6'
            return <span style={{ fontFamily: 'monospace', fontSize: 12, color }}>{r.cpu.toFixed(1)}%</span>
        },
    },
    {
        key: 'ram', header: 'RAM', shrink: true,
        render: r => {
            const color = r.ram > 80 ? '#ef4444' : r.ram > 50 ? '#f59e0b' : '#10b981'
            return (
                <span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color }}>{formatBytes(r.ramUsed)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>{r.ram.toFixed(0)}%</span>
                </span>
            )
        },
    },
    {
        key: 'net', header: 'RX / TX', shrink: true,
        render: r => (
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>
                <span style={{ color: '#10b981' }}>↓{formatBytes(r.rx)}</span>
                {' / '}
                <span style={{ color: '#3b82f6' }}>↑{formatBytes(r.tx)}</span>
            </span>
        ),
    },
    {
        key: 'deployed', header: 'Deployed', shrink: true,
        render: r => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatRelativeTime(r.lastDeployed)}</span>,
    },
]

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
    network: string | null
    allNetworks: string[]
    dock: DockerService[]
    apiNetworks: ApiNetworkInfo[]
    onClose: () => void
}

export function NetworkDetailModal({ network, allNetworks, dock, apiNetworks, onClose }: Props) {
    const navigate = useNavigate()

    const colorIdx = network ? allNetworks.indexOf(network) : 0
    const color = NET_COLORS[colorIdx % NET_COLORS.length] ?? 'var(--text-2)'

    const apiInfo = apiNetworks.find(n => n.name === network) ?? null

    const services = useMemo(
        () => dock.filter(s => network && (s.networks ?? []).includes(network)),
        [dock, network]
    )

    const running  = services.filter(s => s.containers > 0).length
    const totalRx  = services.reduce((sum, s) => sum + (s.info.net?.rx ?? 0), 0)
    const totalTx  = services.reduce((sum, s) => sum + (s.info.net?.tx ?? 0), 0)
    const totalCpu = services.reduce((sum, s) => sum + s.info.cpu.percent, 0)

    const health: 'healthy' | 'degraded' | 'down' =
        services.length === 0 || running === 0 ? 'down'     :
        running < services.length               ? 'degraded' : 'healthy'

    const HEALTH_COLOR = { healthy: '#10b981', degraded: '#f59e0b', down: '#ef4444' }
    const HEALTH_LABEL = { healthy: 'Healthy', degraded: 'Degraded', down: 'Down' }

    const infoRows: KVRow[] = [
        {
            id: 'status', label: 'Status',
            value: (
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 10px', borderRadius: 20,
                    background: HEALTH_COLOR[health] + '18',
                    fontSize: 12, fontWeight: 600, color: HEALTH_COLOR[health],
                }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: HEALTH_COLOR[health], flexShrink: 0 }} />
                    {HEALTH_LABEL[health]}
                </span>
            ),
        },
        {
            id: 'services', label: 'Services',
            value: (
                <span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{running} running</span>
                    {services.length - running > 0 && (
                        <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>{services.length - running} paused</span>
                    )}
                    <span style={{ color: 'var(--text-3)', marginLeft: 8, fontSize: 11 }}>({services.length} total)</span>
                </span>
            ),
        },
        {
            id: 'io', label: 'Network I/O',
            value: (
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    <span style={{ color: '#10b981' }}>↓ {formatBytes(totalRx)}/s</span>
                    <span style={{ color: 'var(--text-3)', margin: '0 8px' }}>·</span>
                    <span style={{ color: '#3b82f6' }}>↑ {formatBytes(totalTx)}/s</span>
                </span>
            ),
        },
        {
            id: 'cpu', label: 'Total CPU',
            value: (
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: totalCpu > 80 ? '#ef4444' : totalCpu > 40 ? '#f59e0b' : '#3b82f6' }}>
                    {totalCpu.toFixed(1)}%
                </span>
            ),
        },
        apiInfo?.driver ? {
            id: 'driver', label: 'Driver',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{apiInfo.driver}</span>,
        } : null,
        apiInfo?.scope ? {
            id: 'scope', label: 'Scope',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{apiInfo.scope}</span>,
        } : null,
        apiInfo?.id ? {
            id: 'id', label: 'ID',
            value: <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)' }}>{apiInfo.id.slice(0, 12)}</span>,
        } : null,
    ].filter(Boolean) as KVRow[]

    const svcRows: SvcRow[] = services.map(s => ({
        id: s.name,
        name: s.name,
        status: s.containers > 0 ? 'running' : 'paused',
        containers: s.containers,
        cpu: s.info.cpu.percent,
        ram: s.info.ram.percent,
        ramUsed: s.info.ram.used,
        rx: s.info.net?.rx ?? 0,
        tx: s.info.net?.tx ?? 0,
        lastDeployed: s.last_deployed,
    }))

    return (
        <Modal open={network !== null} onClose={onClose} title={network ?? ''}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Color pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{network}</span>
                </div>

                {/* Info KV */}
                <Table columns={kvCols} data={infoRows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} />

                {/* Services */}
                {svcRows.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: 'var(--text-3)',
                            marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--stroke-1)',
                        }}>
                            Services on this network
                        </div>
                        <Table
                            columns={svcCols}
                            data={svcRows}
                            keyExtractor={r => r.id}
                            onRowClick={r => {
                                onClose()
                                navigate(`/service/overview?name=${encodeURIComponent(r.name)}`)
                            }}
                        />
                    </div>
                )}

                {svcRows.length === 0 && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>No services connected to this network.</p>
                )}
            </div>
        </Modal>
    )
}
