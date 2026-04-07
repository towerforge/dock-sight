import { useNavigate } from 'react-router-dom'
import { Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import type { DockerService } from '@/types/dashboard'
import { StatusBadge } from '../metrics/service-card'
import { formatBytes, formatRelativeTime } from '@/lib/formatters'

interface Props {
    items: DockerService[]
}

export function ServiceBar({ items }: Props) {
    const navigate = useNavigate()

    const columns: Column<DockerService>[] = [
        {
            key: 'name',
            header: 'Name',
            render: s => (
                <span>
                    {s.name}
                </span>
            ),
        },
        {
            key: 'containers',
            header: 'Cont.',
            shrink: true,
            render: s => (
                <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--fill-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 700,
                }}>
                    {s.containers}
                </span>
            ),
        },
        {
            key: 'cpu',
            header: 'CPU',
            shrink: true,
            render: s => (
                <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontSize: 13 }}>
                    {s.info.cpu.percent.toFixed(2)}%
                </span>
            ),
        },
        {
            key: 'ram',
            header: 'RAM',
            shrink: true,
            render: s => (
                <span style={{ fontFamily: 'monospace', color: '#10b981', fontSize: 13 }}>
                    {s.info.ram.percent.toFixed(2)}%
                </span>
            ),
        },
        {
            key: 'net',
            header: 'Network',
            shrink: true,
            render: s => (
                <span style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#8b5cf6' }}>↓ {formatBytes(s.info.net?.rx ?? 0)}/s</span>
                    <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>·</span>
                    <span style={{ color: '#a78bfa' }}>↑ {formatBytes(s.info.net?.tx ?? 0)}/s</span>
                </span>
            ),
        },
        {
            key: 'last_deployed',
            header: 'Last image',
            shrink: true,
            render: s => (
                <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {formatRelativeTime(s.last_deployed)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            align: 'right',
            shrink: true,
            render: s => s.containers === 0
                ? <StatusBadge paused />
                : <StatusBadge highLoad={s.info.cpu.percent > 70} />,
        },
    ]

    return (
        <Table
            columns={columns}
            data={items}
            keyExtractor={s => s.name}
            onRowClick={s => navigate(`/service/overview?name=${encodeURIComponent(s.name)}`)}
        />
    )
}
