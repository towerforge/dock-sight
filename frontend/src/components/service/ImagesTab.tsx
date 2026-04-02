import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { apiServiceImages, apiDeleteImage } from '@/services/api'
import { formatBytes } from '@/lib/formatters'
import { Button, Modal } from '@/components/ui'
import { Table, TableHead, TableBody, Th, Tr, Td, TableCell } from '@/components/ui/table'

function StatChip({ label, value, color }: { label: string; value: number | string; color?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-1)', background: 'var(--fill-1)', border: '1px solid var(--stroke-1)', fontSize: 12 }}>
            <span style={{ color: 'var(--text-3)' }}>{label}</span>
            <span style={{ fontWeight: 700, color: color ?? 'var(--text-1)' }}>{value}</span>
        </div>
    )
}

export function ImagesTab({ serviceName }: { serviceName: string }) {
    const [images, setImages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [confirmName, setConfirmName] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        apiServiceImages(serviceName)
            .then(d => { setImages(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [serviceName])

    const handleDelete = async () => {
        if (!confirmId) return
        setDeleting(true)
        try {
            await apiDeleteImage(confirmId)
            setImages(prev => prev.filter(img => img.delete_id !== confirmId))
        } finally {
            setDeleting(false)
            setConfirmId(null)
        }
    }

    if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, padding: '32px 0' }}>Loading…</p>
    if (!images.length) return <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, padding: '32px 0' }}>No images found.</p>

    const sorted = [...images].sort((a, b) => Number(b.in_use) - Number(a.in_use))

    const inUse = sorted.filter(i => i.in_use).length
    const unused = sorted.length - inUse
    const totalSize = sorted.reduce((n, i) => n + (i.size ?? 0), 0)

    return (
        <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatChip label="Total" value={sorted.length} />
                <StatChip label="In use" value={inUse} color="#10b981" />
                <StatChip label="Unused" value={unused} color="var(--text-3)" />
                <StatChip label="Total size" value={formatBytes(totalSize)} />
            </div>

            <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete image">
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                    Remove "{confirmName}"? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant={2} onClick={() => setConfirmId(null)}>Cancel</Button>
                    <Button variant={5} onClick={handleDelete} loading={deleting}>Delete</Button>
                </div>
            </Modal>

            <Table>
                <TableHead>
                    <Th>Name</Th>
                    <Th shrink>Tag</Th>
                    <Th shrink>Status</Th>
                    <Th shrink align="right">Size</Th>
                    <Th shrink>Arch</Th>
                    <Th shrink>OS</Th>
                    <Th shrink>Created</Th>
                    <Th shrink></Th>
                </TableHead>
                <TableBody>
                    {sorted.map(img => (
                        <Tr key={img.id} style={{ opacity: img.in_use ? 1 : 0.5 }}>
                            <Td>
                                <TableCell>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{img.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{img.id}</div>
                                    </div>
                                </TableCell>
                            </Td>
                            <Td shrink>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                    {img.tag}
                                </span>
                            </Td>
                            <Td shrink>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                                    background: img.in_use ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                                    color: img.in_use ? '#10b981' : 'var(--text-2)',
                                    border: `1px solid ${img.in_use ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)'}`,
                                }}>{img.in_use ? 'In use' : 'Unused'}</span>
                            </Td>
                            <Td shrink align="right" muted>{formatBytes(img.size)}</Td>
                            <Td shrink muted>{img.architecture || '—'}</Td>
                            <Td shrink muted>{img.os || '—'}</Td>
                            <Td shrink muted>{img.created ? new Date(img.created).toLocaleDateString() : '—'}</Td>
                            <Td shrink>
                                {!img.in_use && (
                                    <button
                                        onClick={() => { setConfirmId(img.delete_id); setConfirmName(`${img.name}:${img.tag}`) }}
                                        style={{ padding: 4, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                                        title="Delete image"
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
