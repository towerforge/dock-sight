import { useState, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { Page, Table, Modal, Button, Spinner } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiServiceContainers, apiDeleteService, apiScaleService } from '@/services/api'
import { formatBytes } from '@/lib/formatters'
import { useDashboard } from '@/context/dashboard-context'

function Tag({ value }: { value: string }) {
    return (
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', color: 'var(--text-2)', fontFamily: 'monospace', whiteSpace: 'nowrap', display: 'inline-block' }}>
            {value}
        </span>
    )
}


type KVRow = { id: string; label: string; value: React.ReactNode; onClick?: () => void }
type PortRow = { id: string; host: string; container: string }
type MountRow = { id: string; source: string; destination: string; type: string }

const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</span> },
    { key: 'value', header: 'Value',              render: r => r.value },
]

export default function OverviewPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const name = searchParams.get('name') ?? ''
    const { dock, refreshInterval, refresh } = useDashboard()

    const go = (path: string) => navigate(`/service/${path}?name=${encodeURIComponent(name)}`)

    const [containers, setContainers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleting, setDeleting]       = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [removing, setRemoving]       = useState(false)
    const [scaling, setScaling]         = useState(false)
    const [scaleError, setScaleError]   = useState<string | null>(null)

    const service = useMemo(() => dock.find(s => s.name === name) ?? null, [dock, name])

    useEffect(() => {
        let mounted = true
        const fetch = () =>
            apiServiceContainers(name)
                .then(c => { if (mounted) setContainers(c.containers ?? []) })
                .finally(() => { if (mounted) setLoading(false) })

        fetch()
        const id = setInterval(fetch, refreshInterval)
        return () => { mounted = false; clearInterval(id) }
    }, [name, refreshInterval])

    useEffect(() => {
        if (!removing) return
        const id = setInterval(() => refresh(), 1000)
        return () => clearInterval(id)
    }, [removing])

    useEffect(() => {
        if (removing && !dock.find(s => s.name === name)) navigate('/')
    }, [dock, removing, name])

    if (loading) return <Page><Spinner /></Page>

    if (removing) return <Page><Spinner label={`Removing ${name}…`} /></Page>

    const running     = containers.filter(c => c.running).length
    const stopped     = containers.length - running
    const allNetworks = [...new Set(containers.flatMap(c => c.networks ?? []))]
    const allPolicies = [...new Set(containers.map(c => c.restart_policy).filter(Boolean))]
    const allImages   = [...new Set(containers.map(c => c.image).filter(Boolean))]

    const portRows: PortRow[] = [...new Set(containers.flatMap(c => c.ports ?? []))].map(p => {
        const [host, container] = (p as string).split('→')
        return { id: p, host: host ?? p, container: container ?? '' }
    })

    const mountRows: MountRow[] = containers
        .flatMap(c => c.mounts ?? [])
        .filter((m, i, arr) => arr.findIndex((x: any) => x.source === m.source && x.destination === m.destination) === i)
        .map((m: any, i: number) => ({ id: `${i}`, source: m.source, destination: m.destination, type: m.type ?? '' }))

    const infoRows: KVRow[] = [
        { id: 'name', label: 'Name', value: name },
        {
            id: 'containers', label: 'Containers',
            onClick: () => go('containers'),
            value: (
                <span>
                    <span style={{ color: running > 0 ? '#10b981' : 'var(--text-3)' }}>{running} running</span>
                    {stopped > 0 && <span style={{ color: 'var(--text-3)', marginLeft: 10 }}>{stopped} stopped</span>}
                </span>
            ),
        },
        {
            id: 'cpu', label: 'CPU',
            onClick: () => go('metrics'),
            value: <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{(service?.info.cpu.percent ?? 0).toFixed(1)}%</span>,
        },
        {
            id: 'ram', label: 'RAM',
            onClick: () => go('metrics'),
            value: (
                <span>
                    <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{formatBytes(service?.info.ram.used ?? 0)}</span>
                    <span style={{ color: 'var(--text-3)', marginLeft: 8, fontSize: 12 }}>{(service?.info.ram.percent ?? 0).toFixed(1)}%</span>
                </span>
            ),
        },
        allImages.length > 0 && {
            id: 'image', label: 'Image',
            onClick: () => go('images'),
            value: <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{allImages.map(img => <Tag key={img} value={(img as string).split('@')[0]} />)}</div>,
        },
        allPolicies.length > 0 && {
            id: 'restart', label: 'Restart',
            value: <div style={{ display: 'flex', gap: 6 }}>{allPolicies.map(p => <Tag key={p} value={p} />)}</div>,
        },
        allNetworks.length > 0 && {
            id: 'networks', label: 'Networks',
            value: <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{allNetworks.map(n => <Tag key={n} value={n} />)}</div>,
        },
        portRows.length > 0 && {
            id: 'ports', label: 'Ports',
            value: <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{portRows.map(p => <Tag key={p.id} value={`${p.host} → ${p.container}`} />)}</div>,
        },
        mountRows.length > 0 && {
            id: 'volumes', label: 'Volumes',
            value: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {mountRows.map(m => (
                        <span key={m.id} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {m.source} <span style={{ color: 'var(--text-3)' }}>→</span> {m.destination}
                            {m.type && <Tag value={m.type} />}
                        </span>
                    ))}
                </div>
            ),
        },
    ].filter(Boolean) as KVRow[]

    const isPaused = containers.length === 0

    const handleScale = async () => {
        flushSync(() => { setScaling(true); setScaleError(null) })
        try {
            await apiScaleService(name, isPaused ? 1 : 0)
            refresh()
        } catch (err: any) {
            setScaleError(err?.message ?? 'Failed to update service')
        } finally {
            setScaling(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError(null)
        try {
            await apiDeleteService(name)
            setConfirmOpen(false)
            setRemoving(true)
        } catch (err: any) {
            setDeleteError(err?.message ?? 'Failed to delete service')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Page>
            <Table
                columns={kvCols}
                data={infoRows}
                keyExtractor={r => r.id}
                onRowClick={r => r.onClick?.()}
                rowStyle={r => r.onClick ? {} : { cursor: 'default' }}
            />

            <div style={{ marginTop: 24, borderTop: '1px solid var(--stroke-1)', paddingTop: 24 }}>
                <Table
                    columns={kvCols}
                    data={[
                        {
                            id: 'power',
                            label: 'Power',
                            value: (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                    <Button variant={2} size="sm" loading={scaling} onClick={handleScale}>
                                        {!scaling && (isPaused ? <><Play size={12} /> Start</> : <><Pause size={12} /> Pause</>)}
                                    </Button>
                                    {scaleError && <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{scaleError}</span>}
                                </div>
                            ),
                        },
                        {
                            id: 'delete',
                            label: 'Delete service',
                            value: (
                                <Button variant={2} size="sm" onClick={() => setConfirmOpen(true)}>
                                    Delete
                                </Button>
                            ),
                        },
                    ]}
                    keyExtractor={r => r.id}
                    rowStyle={() => ({ cursor: 'default' })}
                />
            </div>

            <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete service">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        Are you sure you want to delete <strong>{name}</strong>? This will stop and remove all containers in this service.
                    </p>
                    {deleteError && (
                        <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace' }}>{deleteError}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button type="button" variant={2} onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button type="button" variant={5} loading={deleting} onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </Page>
    )
}
