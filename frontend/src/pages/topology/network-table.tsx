import { useMemo } from 'react'
import { Globe } from 'lucide-react'
import type { DockerService } from '@/types/dashboard'
import { Table, TableCell, type Column } from '@/components/ui/table'
import { COLORS } from './network-graph'

interface NetworkRow {
    name:    string
    color:   string
    total:   number
    running: number
    health:  'healthy' | 'degraded' | 'down'
    rx:      number   // bytes
    tx:      number   // bytes
}

function buildNetworkRows(dock: DockerService[], networks: string[]): NetworkRow[] {
    return networks.map((name, ci) => {
        const svcs    = dock.filter(s => (s.networks ?? []).includes(name))
        const running = svcs.filter(s => s.containers > 0).length
        const rx      = svcs.reduce((sum, s) => sum + (s.info.net?.rx ?? 0), 0)
        const tx      = svcs.reduce((sum, s) => sum + (s.info.net?.tx ?? 0), 0)

        const health: NetworkRow['health'] =
            svcs.length === 0 || running === 0 ? 'down'     :
            running < svcs.length              ? 'degraded' : 'healthy'

        return { name, color: COLORS[ci % COLORS.length], total: svcs.length, running, health, rx, tx }
    })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(b: number): string {
    if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)} GB`
    if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(1)} MB`
    if (b >= 1_024)         return `${(b / 1_024).toFixed(1)} KB`
    return `${b} B`
}

// ── Sub-components ────────────────────────────────────────────────────────────
const HEALTH_COLOR = { healthy: '#10b981', degraded: '#f59e0b', down: '#ef4444' }
const HEALTH_LABEL = { healthy: 'Healthy', degraded: 'Degraded', down: 'Down' }

function HealthBadge({ health }: { health: NetworkRow['health'] }) {
    const color = HEALTH_COLOR[health]
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 20,
            background: color + '18',
            fontSize: 11, fontWeight: 600, color,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {HEALTH_LABEL[health]}
        </span>
    )
}

function NetRate({ value }: { value: number }) {
    return (
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>
            {formatBytes(value)}/s
        </span>
    )
}

// ── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<NetworkRow>[] = [
    {
        key: 'network',
        header: 'Network',
        render: row => (
            <TableCell icon={
                <Globe size={14} style={{ color: row.color, flexShrink: 0 }} />
            }>
                <span style={{ fontWeight: 600, color: row.color }}>{row.name}</span>
            </TableCell>
        ),
    },
    {
        key: 'health',
        header: 'Status',
        shrink: true,
        render: row => <HealthBadge health={row.health} />,
    },
    {
        key: 'services',
        header: 'Services',
        shrink: true,
        render: row => (
            <span style={{ fontSize: 12 }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>{row.running}</span>
                <span style={{ color: 'var(--text-3)' }}> / {row.total}</span>
            </span>
        ),
    },
    {
        key: 'rx',
        header: '↓ RX',
        shrink: true,
        render: row => <NetRate value={row.rx} />,
    },
    {
        key: 'tx',
        header: '↑ TX',
        shrink: true,
        render: row => <NetRate value={row.tx} />,
    },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function NetworkTable({ dock, networks, onHover }: {
    dock: DockerService[]
    networks: string[]
    onHover?: (network: string | null) => void
}) {
    const rows = useMemo(() => buildNetworkRows(dock, networks), [dock, networks])

    return (
        <Table
            columns={COLUMNS}
            data={rows}
            keyExtractor={row => row.name}
            emptyMessage="No networks found."
            onRowHover={onHover ? (row) => onHover(row?.name ?? null) : undefined}
        />
    )
}
