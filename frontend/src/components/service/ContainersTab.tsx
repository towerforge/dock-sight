import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { apiServiceContainers, apiDeleteContainer, apiServiceImages } from '@/services/api'
import { Button, Modal } from '@/components/ui'
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/table'

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-1)', background: 'var(--fill-1)', border: '1px solid var(--stroke-1)', fontSize: 12 }}>
            <span style={{ color: 'var(--text-3)' }}>{label}</span>
            <span style={{ fontWeight: 700, color: color ?? 'var(--text-1)' }}>{value}</span>
        </div>
    )
}

const chipStyle: React.CSSProperties = {
    fontSize: 11, padding: '1px 6px', borderRadius: 4,
    background: 'var(--fill-2)', border: '1px solid var(--stroke-1)',
    color: 'var(--text-2)', fontFamily: 'monospace', whiteSpace: 'nowrap',
}

export function ContainersTab({ serviceName }: { serviceName: string }) {
    const [data, setData] = useState<any>(null)
    const [serviceImageNames, setServiceImageNames] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [confirmName, setConfirmName] = useState('')
    const [confirmImage, setConfirmImage] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        Promise.all([apiServiceContainers(serviceName), apiServiceImages(serviceName)])
            .then(([containers, images]: [any, any[]]) => {
                setData(containers)
                setServiceImageNames(new Set(images.map((img: any) => `${img.name}:${img.tag}`)))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [serviceName])

    const getLinkedImage = (image: string) => {
        const normalized = image.split('@')[0]
        return serviceImageNames.has(normalized) ? normalized : ''
    }

    const handleDelete = async () => {
        if (!confirmId) return
        setDeleting(true)
        try {
            await apiDeleteContainer(confirmId)
            setData((prev: any) => ({ ...prev, containers: prev.containers.filter((c: any) => c.id !== confirmId) }))
        } finally {
            setDeleting(false)
            setConfirmId(null)
        }
    }

    if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, padding: '32px 0' }}>Loading…</p>
    if (!data?.containers?.length) return <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, padding: '32px 0' }}>No containers found.</p>

    const sorted = [...data.containers].sort((a: any, b: any) => Number(b.running) - Number(a.running))

    const running = sorted.filter((c: any) => c.running).length
    const stopped = sorted.length - running
    const totalPorts = sorted.reduce((n: number, c: any) => n + (c.ports?.length ?? 0), 0)
    const totalMounts = sorted.reduce((n: number, c: any) => n + (c.mounts?.length ?? 0), 0)

    return (
        <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatChip label="Total" value={sorted.length} />
                <StatChip label="Running" value={running} color="#10b981" />
                <StatChip label="Stopped" value={stopped} color="var(--text-3)" />
                {totalPorts > 0 && <StatChip label="Ports exposed" value={totalPorts} />}
                {totalMounts > 0 && <StatChip label="Mounts" value={totalMounts} />}
            </div>

            <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete container">
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: confirmImage ? 12 : 16 }}>
                    Remove "{confirmName}"? This action cannot be undone.
                </p>
                {confirmImage && (
                    <p style={{ fontSize: 13, color: '#f59e0b', marginBottom: 16, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        This container has a linked image "{confirmImage}". Consider deleting the image first.
                    </p>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant={2} onClick={() => setConfirmId(null)}>Cancel</Button>
                    <Button variant={5} onClick={handleDelete} loading={deleting}>Delete</Button>
                </div>
            </Modal>

            <Table>
                <TableHead>
                    <Th>Name</Th>
                    <Th shrink>Status</Th>
                    <Th>Image</Th>
                    <Th>Ports</Th>
                    <Th>Networks</Th>
                    <Th shrink>Restart</Th>
                    <Th shrink>Created</Th>
                    <Th shrink></Th>
                </TableHead>
                <TableBody>
                    {sorted.map((c: any) => (
                        <Tr key={c.id} style={{ opacity: c.running ? 1 : 0.5 }}>
                            <Td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</Td>
                            <Td shrink>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                    background: c.running ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                                    color: c.running ? '#10b981' : 'var(--text-2)',
                                    border: `1px solid ${c.running ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)'}`,
                                    whiteSpace: 'nowrap',
                                }}>{c.status}</span>
                            </Td>
                            <Td muted>
                                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.image || '—'}</span>
                            </Td>
                            <Td>
                                {c.ports?.length > 0
                                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{c.ports.map((p: string) => <span key={p} style={chipStyle}>{p}</span>)}</div>
                                    : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                                }
                            </Td>
                            <Td>
                                {c.networks?.length > 0
                                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{c.networks.map((n: string) => <span key={n} style={chipStyle}>{n}</span>)}</div>
                                    : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                                }
                            </Td>
                            <Td shrink muted>{c.restart_policy || '—'}</Td>
                            <Td shrink muted>{c.created ? new Date(c.created).toLocaleDateString() : '—'}</Td>
                            <Td shrink>
                                {!c.running && (
                                    <button
                                        onClick={() => { setConfirmId(c.id); setConfirmName(c.name); setConfirmImage(getLinkedImage(c.image ?? '')) }}
                                        style={{ padding: 4, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                                        title="Delete container"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </Td>
                        </Tr>
                    ))}
                </TableBody>
            </Table>
        </>
    )
}
