import { useNavigate } from 'react-router-dom'
import { Table, TableCell } from '@/components/ui'
import type { Column } from '@/components/ui'
import { Box } from 'lucide-react'
import type { DockerService } from '@/types/dashboard'
import { StatusBadge } from '../metrics/service-card'

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
                <TableCell icon={<Box size={14} style={{ color: '#3b82f6' }} />}>
                    {s.name}
                </TableCell>
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
            key: 'status',
            header: 'Status',
            align: 'right',
            shrink: true,
            render: s => <StatusBadge highLoad={s.info.cpu.percent > 70} />,
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
