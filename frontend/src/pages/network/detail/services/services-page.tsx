import { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Page, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { formatBytes } from '@/lib/formatters'

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

const columns: Column<SvcRow>[] = [
    {
        key: 'name', header: 'Service',
        render: r => <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-1)' }}>{r.name}</span>,
    },
    {
        key: 'containers', header: 'Containers', shrink: true,
        render: r => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{r.containers}</span>,
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
        key: 'net',
        header: 'Network',
        shrink: true,
        render: r => (
            <span style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                <span style={{ color: '#8b5cf6' }}>↓ {formatBytes(r.rx)}/s</span>
                <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>·</span>
                <span style={{ color: '#a78bfa' }}>↑ {formatBytes(r.tx)}/s</span>
            </span>
        ),
    },
]

export default function NetworkServicesPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''
    const navigate = useNavigate()
    const { dock } = useDashboard()

    const rows: SvcRow[] = useMemo(() =>
        dock
            .filter(s => (s.networks ?? []).includes(name))
            .map(s => ({
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
    , [dock, name])

    return (
        <Page>
            <Table
                columns={columns}
                data={rows}
                keyExtractor={r => r.id}
                emptyMessage="No services on this network."
                onRowClick={r => navigate(`/service/overview?name=${encodeURIComponent(r.name)}`)}
            />
        </Page>
    )
}
