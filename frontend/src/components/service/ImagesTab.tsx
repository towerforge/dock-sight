import { useState, useEffect } from 'react'
import { HardDrive, Info, Trash2 } from 'lucide-react'
import { apiServiceImages, apiDeleteImage } from '@/services/api'
import { formatBytes } from '@/lib/formatters'
import { Button, Modal } from '@/components/ui'

const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }
const valueStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div>
            <div style={labelStyle}>{icon}{label}</div>
            <div style={valueStyle}>{value}</div>
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

    return (
        <>
            <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete image">
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                    Remove "{confirmName}"? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant={2} onClick={() => setConfirmId(null)}>Cancel</Button>
                    <Button variant={5} onClick={handleDelete} loading={deleting}>Delete</Button>
                </div>
            </Modal>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sorted.map((img, i) => (
                    <div key={img.id} style={{
                        padding: '20px 0',
                        borderTop: i > 0 ? '1px solid var(--stroke-1)' : undefined,
                        opacity: img.in_use ? 1 : 0.5,
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{img.name}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-3)' }}>{img.id}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontFamily: 'monospace' }}>
                                    {img.tag}
                                </span>
                                {!img.in_use && (
                                    <button
                                        onClick={() => { setConfirmId(img.delete_id); setConfirmName(`${img.name}:${img.tag}`) }}
                                        style={{ padding: 4, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                                        title="Delete image"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                            <InfoRow icon={<HardDrive size={11} />} label="Size"    value={formatBytes(img.size)} />
                            <InfoRow icon={<Info size={11} />}      label="Created" value={img.created ? new Date(img.created).toLocaleString() : '—'} />
                            <InfoRow icon={<Info size={11} />}      label="Arch"    value={img.architecture || '—'} />
                            <InfoRow icon={<Info size={11} />}      label="OS"      value={img.os || '—'} />
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}
