import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Page, Table, Modal, Button, Spinner } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiListDockerVolumes, apiDeleteVolume } from '@/services/api'
import type { DockerVolume } from '@/services/api'
import { formatBytes, formatRelativeTime } from '@/lib/formatters'
import { NETWORK_COLORS as PALETTE } from '@/lib/colors'

type KVRow = { id: string; label: string; value: React.ReactNode }

const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</span> },
    { key: 'value', header: 'Value', render: r => r.value },
]

export default function VolumeOverviewPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const name = searchParams.get('name') ?? ''

    const [volume, setVolume]         = useState<DockerVolume | null>(null)
    const [allNames, setAllNames]     = useState<string[]>([])
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleting, setDeleting]     = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [removing, setRemoving]     = useState(false)

    const loadVolume = () => {
        apiListDockerVolumes()
            .then(data => {
                setAllNames(data.volumes.map(v => v.name))
                const found = data.volumes.find(v => v.name === name) ?? null
                setVolume(found)
            })
            .catch(() => {})
    }

    useEffect(() => {
        loadVolume()
    }, [name])

    // Poll while removing to detect when it disappears
    useEffect(() => {
        if (!removing) return
        const id = setInterval(() => loadVolume(), 1000)
        return () => clearInterval(id)
    }, [removing])

    useEffect(() => {
        if (removing && !allNames.includes(name)) navigate('/volumes')
    }, [allNames, removing, name, navigate])

    const colorIdx = allNames.indexOf(name)
    const color = PALETTE[colorIdx % PALETTE.length] ?? 'var(--text-2)'

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError(null)
        try {
            await apiDeleteVolume(name)
            setConfirmOpen(false)
            setRemoving(true)
        } catch (err: any) {
            setDeleteError(err?.response?.data?.error ?? err?.message ?? 'Failed to delete volume')
        } finally {
            setDeleting(false)
        }
    }

    if (removing) return <Page><Spinner label={`Removing ${name}…`} /></Page>

    const inUse = (volume?.ref_count ?? 0) > 0

    const infoRows: KVRow[] = [
        {
            id: 'name', label: 'Name',
            value: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace' }}>{name}</span>
                </span>
            ),
        },
        volume?.service ? {
            id: 'service', label: 'Service',
            value: <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{volume.service}</span>,
        } : null,
        {
            id: 'driver', label: 'Driver',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{volume?.driver ?? '—'}</span>,
        },
        {
            id: 'mountpoint', label: 'Mount point',
            value: <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)', wordBreak: 'break-all' }}>{volume?.mountpoint ?? '—'}</span>,
        },
        volume && volume.size >= 0 ? {
            id: 'size', label: 'Size',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{formatBytes(volume.size)}</span>,
        } : null,
        {
            id: 'containers', label: 'Containers',
            value: (
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: inUse ? '#10b981' : 'var(--text-3)' }}>
                    {volume?.ref_count ?? 0} {inUse ? 'in use' : 'not in use'}
                </span>
            ),
        },
        volume?.created_at ? {
            id: 'created', label: 'Created',
            value: <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatRelativeTime(volume.created_at)}</span>,
        } : null,
    ].filter(Boolean) as KVRow[]

    const actionRows: KVRow[] = [
        {
            id: 'delete',
            label: 'Delete volume',
            value: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                    <Button variant={2} size="sm" onClick={() => setConfirmOpen(true)}>
                        Delete
                    </Button>
                    {inUse && (
                        <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'monospace' }}>
                            Warning: {volume?.ref_count} container{(volume?.ref_count ?? 0) !== 1 ? 's' : ''} still using this volume — Docker will reject the deletion
                        </span>
                    )}
                </div>
            ),
        },
    ]

    return (
        <Page>
            <Table columns={kvCols} data={infoRows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} />

            <div style={{ marginTop: 24, borderTop: '1px solid var(--stroke-1)', paddingTop: 24 }}>
                <Table columns={kvCols} data={actionRows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} />
            </div>

            <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete volume">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        Are you sure you want to delete <strong>{name}</strong>?
                        {inUse && (
                            <span style={{ display: 'block', marginTop: 8, color: '#f59e0b', fontSize: 13 }}>
                                This volume is currently in use. Docker will only allow deletion if no containers are attached.
                            </span>
                        )}
                    </p>
                    {deleteError && (
                        <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace' }}>{deleteError}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button type="button" variant={2} onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button type="button" variant={5} loading={deleting} onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </Page>
    )
}
