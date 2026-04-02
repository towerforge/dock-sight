import { useState, useEffect } from 'react'
import { Box, Info, HardDrive, Network, RotateCcw, Trash2 } from 'lucide-react'
import { apiServiceContainers, apiDeleteContainer, apiServiceImages } from '@/services/api'
import { Button, Modal } from '@/components/ui'

const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }
const valueStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const chipStyle: React.CSSProperties = { fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', color: 'var(--text-2)', fontFamily: 'monospace' }

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3 }}>{icon}{label}</div>
            <div style={{ ...valueStyle, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
        </div>
    )
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

    return (
        <>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {sorted.map((c: any, i: number) => (
                    <div key={c.id} style={{
                        padding: '20px 0',
                        borderTop: i > 0 ? '1px solid var(--stroke-1)' : undefined,
                        opacity: c.running ? 1 : 0.5,
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{c.name}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-3)' }}>{c.id}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                    background: c.running ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                                    color: c.running ? '#10b981' : 'var(--text-2)',
                                    border: `1px solid ${c.running ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)'}`,
                                }}>{c.status}</span>
                                {!c.running && (
                                    <button
                                        onClick={() => { setConfirmId(c.id); setConfirmName(c.name); setConfirmImage(getLinkedImage(c.image ?? '')) }}
                                        style={{ padding: 4, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                                        title="Delete container"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                            <InfoRow icon={<Box size={11} />}       label="Image"   value={c.image || '—'} mono />
                            <InfoRow icon={<RotateCcw size={11} />} label="Restart" value={c.restart_policy || '—'} />
                            <InfoRow icon={<Info size={11} />}      label="Created" value={c.created ? new Date(c.created).toLocaleString() : '—'} />
                        </div>

                        {(c.ports?.length > 0 || c.networks?.length > 0 || c.mounts?.length > 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 8, borderTop: '1px solid var(--stroke-1)' }}>
                                {c.ports?.length > 0 && (
                                    <div>
                                        <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}><Network size={11} />Ports</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{c.ports.map((p: string) => <span key={p} style={chipStyle}>{p}</span>)}</div>
                                    </div>
                                )}
                                {c.networks?.length > 0 && (
                                    <div>
                                        <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}><Network size={11} />Networks</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{c.networks.map((n: string) => <span key={n} style={chipStyle}>{n}</span>)}</div>
                                    </div>
                                )}
                                {c.mounts?.length > 0 && (
                                    <div>
                                        <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}><HardDrive size={11} />Mounts</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {c.mounts.map((m: any, j: number) => (
                                                <div key={j} style={{ ...chipStyle, display: 'flex', gap: 4 }}>
                                                    <span style={{ color: 'var(--text-3)' }}>{m.type}</span>
                                                    <span>{m.source}</span>
                                                    <span style={{ color: 'var(--text-3)' }}>→</span>
                                                    <span>{m.destination}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    )
}
