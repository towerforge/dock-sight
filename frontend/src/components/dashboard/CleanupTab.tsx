import { useState, useEffect, useCallback } from 'react'
import { Trash2, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { apiCleanupPreview, apiRunCleanup } from '@/services/api'
import { formatBytes } from '@/lib/formatters'
import { Button, Modal, Table, TableHead, TableBody, Th, Tr, Td, TableCell, Text } from '@/components/ui'

interface Container { id: string; name: string; image: string; status: string }
interface Image     { id: string; tag: string; size: number }

export function CleanupTab() {
    const [containers, setContainers] = useState<Container[]>([])
    const [images,     setImages]     = useState<Image[]>([])
    const [totalSpace, setTotalSpace] = useState(0)
    const [loading,    setLoading]    = useState(true)
    const [error,      setError]      = useState(false)
    const [confirm,    setConfirm]    = useState(false)
    const [running,    setRunning]    = useState(false)
    const [result,     setResult]     = useState<{ containers_deleted: number; images_deleted: number; space_reclaimed: number } | null>(null)

    const fetchPreview = useCallback(() => {
        setLoading(true); setError(false); setResult(null)
        apiCleanupPreview()
            .then(d => { setContainers(d.containers ?? []); setImages(d.images ?? []); setTotalSpace(d.total_space ?? 0); setLoading(false) })
            .catch(() => { setError(true); setLoading(false) })
    }, [])

    useEffect(() => { fetchPreview() }, [fetchPreview])

    const handleCleanup = async () => {
        setConfirm(false); setRunning(true)
        try {
            const res = await apiRunCleanup()
            setResult(res)
            fetchPreview()
        } finally {
            setRunning(false)
        }
    }

    const isEmpty = containers.length === 0 && images.length === 0

    if (loading) return <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
    if (error) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-3)' }}>
            <AlertCircle size={28} />
            <p style={{ fontSize: 14, margin: 0 }}>Could not load cleanup data</p>
            <button onClick={fetchPreview} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
        </div>
    )

    return (
        <>
            <Modal open={confirm} onClose={() => setConfirm(false)} title="Run cleanup">
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                    Remove {containers.length} stopped containers and {images.length} unused images. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant={2} onClick={() => setConfirm(false)}>Cancel</Button>
                    <Button variant={5} onClick={handleCleanup} loading={running}>Clean all</Button>
                </div>
            </Modal>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Result banner */}
                {result && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 'var(--radius-2)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 16px' }}>
                        <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                        <p style={{ fontSize: 14, color: '#10b981', margin: 0 }}>
                            Removed <strong>{result.containers_deleted}</strong> containers and <strong>{result.images_deleted}</strong> images
                            {result.space_reclaimed > 0 && <> — freed <strong>{formatBytes(result.space_reclaimed)}</strong></>}
                        </p>
                    </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <Text variant="body" style={{ fontWeight: 500, marginBottom: 2 }}>Unused resources</Text>
                        <Text variant="caption">
                            {isEmpty ? 'Nothing to clean up' : `${containers.length} containers · ${images.length} images · ~${formatBytes(totalSpace)} to free`}
                        </Text>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant={4} onClick={fetchPreview}><RefreshCw size={14} /></Button>
                        <Button variant={5} onClick={() => setConfirm(true)} disabled={isEmpty || running}>
                            <Trash2 size={13} />{running ? 'Cleaning…' : 'Clean All'}
                        </Button>
                    </div>
                </div>

                {isEmpty ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-3)' }}>
                        <CheckCircle2 size={32} />
                        <p style={{ fontSize: 14, margin: 0 }}>Everything is clean</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {containers.length > 0 && (
                            <div>
                                <Text variant="caption" style={{ marginBottom: 8, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Stopped containers ({containers.length})
                                </Text>
                                <Table>
                                    <TableHead>
                                        <Th>Name</Th>
                                        <Th>Image</Th>
                                        <Th align="right" shrink>Status</Th>
                                    </TableHead>
                                    <TableBody>
                                        {containers.map(c => (
                                            <Tr key={c.id}>
                                                <Td>
                                                    <TableCell>{c.name}</TableCell>
                                                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{c.id}</span>
                                                </Td>
                                                <Td muted>{c.image}</Td>
                                                <Td align="right" shrink>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', color: 'var(--text-2)' }}>
                                                        {c.status}
                                                    </span>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {images.length > 0 && (
                            <div>
                                <Text variant="caption" style={{ marginBottom: 8, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Unused images ({images.length})
                                </Text>
                                <Table>
                                    <TableHead>
                                        <Th>Tag</Th>
                                        <Th shrink>ID</Th>
                                        <Th align="right" shrink>Size</Th>
                                    </TableHead>
                                    <TableBody>
                                        {images.map(img => (
                                            <Tr key={img.id}>
                                                <Td>{img.tag}</Td>
                                                <Td shrink muted style={{ fontFamily: 'monospace', fontSize: 11 }}>{img.id}</Td>
                                                <Td align="right" shrink muted>{formatBytes(img.size)}</Td>
                                            </Tr>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </>
    )
}
