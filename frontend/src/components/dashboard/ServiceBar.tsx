import { useNavigate } from 'react-router-dom'
import { Table, TableHead, TableBody, Th, Tr, Td, TableCell } from '@/components/ui'
import { Box } from 'lucide-react'
import type { DockerService } from '@/types/dashboard'
import { StatusBadge } from './ServiceCard'

interface Props {
    items: DockerService[]
}

export function ServiceBar({ items }: Props) {
    const navigate = useNavigate()

    return (
        <Table>
            <TableHead>
                <Th>Name</Th>
                <Th shrink>Cont.</Th>
                <Th shrink>CPU</Th>
                <Th shrink>RAM</Th>
                <Th align="right" shrink>Status</Th>
            </TableHead>
            <TableBody>
                {items.map(s => (
                    <Tr
                        key={s.name}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/service?name=${encodeURIComponent(s.name)}`)}
                    >
                        <Td>
                            <TableCell icon={<Box size={14} style={{ color: '#3b82f6' }} />}>
                                {s.name}
                            </TableCell>
                        </Td>
                        <Td shrink>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 22, height: 22, borderRadius: '50%',
                                background: 'var(--fill-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 700,
                            }}>
                                {s.containers}
                            </span>
                        </Td>
                        <Td shrink>
                            <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontSize: 13 }}>
                                {s.info.cpu.percent.toFixed(2)}%
                            </span>
                        </Td>
                        <Td shrink>
                            <span style={{ fontFamily: 'monospace', color: '#10b981', fontSize: 13 }}>
                                {s.info.ram.percent.toFixed(2)}%
                            </span>
                        </Td>
                        <Td align="right" shrink>
                            <StatusBadge highLoad={s.info.cpu.percent > 70} />
                        </Td>
                    </Tr>
                ))}
            </TableBody>
        </Table>
    )
}
