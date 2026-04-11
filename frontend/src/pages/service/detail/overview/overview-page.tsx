import { useState, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Pause, Play, RefreshCw, Plus, Pencil } from 'lucide-react'
import { Page, Table, Modal, Button, Spinner, Select, Checkbox } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiServiceContainers, apiDeleteService, apiScaleService, apiPullService, apiListRegistries } from '@/services/api'
import type { Registry } from '@/services/api'
import { apiUpdateServicePorts, apiUpdateServiceMounts, apiListDockerVolumes } from '@/services/docker'
import type { PortConfigPayload, MountConfigPayload } from '@/services/docker'
import { formatBytes } from '@/lib/formatters'
import { useDashboard } from '@/context/dashboard-context'

function Tag({ value }: { value: string }) {
    return (
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', color: 'var(--text-2)', fontFamily: 'monospace', whiteSpace: 'nowrap', display: 'inline-block' }}>
            {value}
        </span>
    )
}

type KVRow    = { id: string; label: string; value: React.ReactNode; onClick?: () => void }
type PortRow  = { id: string; host: string; container: string; protocol: string }
type MountRow = { id: string; source: string; destination: string; type: string }

interface PortDraft {
    hostPort:       string
    hostRange:      boolean
    containerPort:  string
    containerRange: boolean
    protocol:       'tcp' | 'udp' | 'tcp+udp'
    publishMode:    'ingress' | 'host'
}

const EMPTY_DRAFT: PortDraft = {
    hostPort: '', hostRange: false,
    containerPort: '', containerRange: false,
    protocol: 'tcp',
    publishMode: 'ingress',
}

function parsePortRowToDraft(row: PortRow): PortDraft {
    const hostParts = row.host.split(':')
    const hostPort  = hostParts.length > 1 ? hostParts[hostParts.length - 1] : row.host
    const protocol: PortDraft['protocol'] =
        row.protocol === 'udp' ? 'udp' :
        row.protocol === 'tcp+udp' ? 'tcp+udp' : 'tcp'
    return {
        hostPort:       hostPort ?? '',
        hostRange:      hostPort?.includes('-') ?? false,
        containerPort:  row.container,
        containerRange: row.container.includes('-'),
        protocol,
        publishMode:    'ingress',
    }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{children}</p>
}

// ── RangePortInput ────────────────────────────────────────────────────────────

interface RangePortInputProps {
    label:       string
    value:       string
    isRange:     boolean
    onChange:    (value: string) => void
    onRangeChange: (isRange: boolean) => void
}

function RangePortInput({ label, value, isRange, onChange, onRangeChange }: RangePortInputProps) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <FieldLabel>{label}</FieldLabel>
                <Checkbox checked={isRange} onChange={onRangeChange} label="Range" />
            </div>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={isRange ? 'e.g. 3000-3010' : 'e.g. 3000'}
                style={{
                    background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
                    borderRadius: 'var(--radius-1)', padding: '7px 10px',
                    fontSize: 13, color: 'var(--text-1)', outline: 'none',
                    width: '100%', boxSizing: 'border-box', fontFamily: 'monospace',
                }}
            />
        </div>
    )
}

// ── PortEditModal ─────────────────────────────────────────────────────────────

function PortEditModal({ port, onClose, onSave, saving, error }: {
    port:    PortRow | null
    onClose: () => void
    onSave:  (draft: PortDraft, original: PortRow | null) => void
    saving?: boolean
    error?:  string | null
}) {
    const [draft, setDraft] = useState<PortDraft>(() =>
        port ? parsePortRowToDraft(port) : EMPTY_DRAFT
    )

    const set = <K extends keyof PortDraft>(key: K, value: PortDraft[K]) =>
        setDraft(d => ({ ...d, [key]: value }))

    return (
        <Modal open onClose={onClose} title={port ? 'Edit port mapping' : 'Add port mapping'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 360 }}>

                <RangePortInput
                    label="Host port"
                    value={draft.hostPort}
                    isRange={draft.hostRange}
                    onChange={v => set('hostPort', v)}
                    onRangeChange={v => set('hostRange', v)}
                />

                <RangePortInput
                    label="Container port"
                    value={draft.containerPort}
                    isRange={draft.containerRange}
                    onChange={v => set('containerPort', v)}
                    onRangeChange={v => set('containerRange', v)}
                />

                <Select
                    label="Protocol"
                    value={draft.protocol}
                    options={[
                        { value: 'tcp',     label: 'TCP' },
                        { value: 'udp',     label: 'UDP' },
                        { value: 'tcp+udp', label: 'TCP + UDP' },
                    ]}
                    onChange={e => set('protocol', e.target.value as PortDraft['protocol'])}
                />

                <Select
                    label="Publish mode"
                    value={draft.publishMode}
                    options={[
                        { value: 'ingress', label: 'ingress — load-balanced across all nodes' },
                        { value: 'host',    label: 'host — bind directly on the task node' },
                    ]}
                    onChange={e => set('publishMode', e.target.value as PortDraft['publishMode'])}
                />

                {error && (
                    <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <Button variant={2} onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant={1} loading={saving} onClick={() => onSave(draft, port)}>Save</Button>
                </div>
            </div>
        </Modal>
    )
}

const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</span> },
    { key: 'value', header: 'Value',              render: r => r.value },
]

// ── MountEditModal ────────────────────────────────────────────────────────────

interface MountDraft {
    source:    string
    target:    string
    typ:       'bind' | 'volume' | 'tmpfs'
    readOnly:  boolean
}

const EMPTY_MOUNT_DRAFT: MountDraft = { source: '', target: '', typ: 'volume', readOnly: false }

function parseMountRowToDraft(row: MountRow): MountDraft {
    const typ = row.type === 'bind' ? 'bind' : row.type === 'tmpfs' ? 'tmpfs' : 'volume'
    return { source: row.source, target: row.destination, typ, readOnly: false }
}

const NEW_VOLUME_SENTINEL = '__new__'

function MountEditModal({ mount, onClose, onSave, saving, error }: {
    mount:   MountRow | null
    onClose: () => void
    onSave:  (draft: MountDraft, original: MountRow | null) => void
    saving?: boolean
    error?:  string | null
}) {
    const [draft, setDraft] = useState<MountDraft>(() =>
        mount ? parseMountRowToDraft(mount) : EMPTY_MOUNT_DRAFT
    )
    const [volumes, setVolumes] = useState<string[]>([])
    const [customName, setCustomName] = useState(false)

    useEffect(() => {
        apiListDockerVolumes()
            .then(r => setVolumes((r.volumes ?? []).map(v => v.name)))
            .catch(() => {})
    }, [])

    const set = <K extends keyof MountDraft>(key: K, value: MountDraft[K]) =>
        setDraft(d => ({ ...d, [key]: value }))

    const handleVolumeSelect = (val: string) => {
        if (val === NEW_VOLUME_SENTINEL) {
            setCustomName(true)
            set('source', '')
        } else {
            setCustomName(false)
            set('source', val)
        }
    }

    const volumeSelectValue = customName ? NEW_VOLUME_SENTINEL : (draft.source || '')

    return (
        <Modal open onClose={onClose} title={mount ? 'Edit mount' : 'Add mount'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 360 }}>
                <Select
                    label="Type"
                    value={draft.typ}
                    options={[
                        { value: 'volume', label: 'volume — managed Docker volume' },
                        { value: 'bind',   label: 'bind — host path' },
                        { value: 'tmpfs',  label: 'tmpfs — in-memory' },
                    ]}
                    onChange={e => { set('typ', e.target.value as MountDraft['typ']); setCustomName(false) }}
                />

                {draft.typ === 'volume' && (
                    <>
                        <Select
                            label="Volume"
                            value={volumeSelectValue}
                            options={[
                                { value: '', label: '— select a volume —' },
                                ...volumes.map(v => ({ value: v, label: v })),
                                { value: NEW_VOLUME_SENTINEL, label: '+ new volume name…' },
                            ]}
                            onChange={e => handleVolumeSelect(e.target.value)}
                        />
                        {customName && (
                            <div>
                                <FieldLabel>New volume name</FieldLabel>
                                <input
                                    type="text"
                                    value={draft.source}
                                    onChange={e => set('source', e.target.value)}
                                    placeholder="my-volume"
                                    autoFocus
                                    style={{
                                        background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
                                        borderRadius: 'var(--radius-1)', padding: '7px 10px',
                                        fontSize: 13, color: 'var(--text-1)', outline: 'none',
                                        width: '100%', boxSizing: 'border-box', fontFamily: 'monospace',
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}

                {draft.typ === 'bind' && (
                    <div>
                        <FieldLabel>Host path</FieldLabel>
                        <input
                            type="text"
                            value={draft.source}
                            onChange={e => set('source', e.target.value)}
                            placeholder="/host/path"
                            style={{
                                background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
                                borderRadius: 'var(--radius-1)', padding: '7px 10px',
                                fontSize: 13, color: 'var(--text-1)', outline: 'none',
                                width: '100%', boxSizing: 'border-box', fontFamily: 'monospace',
                            }}
                        />
                    </div>
                )}

                <div>
                    <FieldLabel>Container path</FieldLabel>
                    <input
                        type="text"
                        value={draft.target}
                        onChange={e => set('target', e.target.value)}
                        placeholder="/data"
                        style={{
                            background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
                            borderRadius: 'var(--radius-1)', padding: '7px 10px',
                            fontSize: 13, color: 'var(--text-1)', outline: 'none',
                            width: '100%', boxSizing: 'border-box', fontFamily: 'monospace',
                        }}
                    />
                </div>

                <Checkbox checked={draft.readOnly} onChange={v => set('readOnly', v)} label="Read-only" />

                {error && (
                    <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <Button variant={2} onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant={1} loading={saving} onClick={() => onSave(draft, mount)}>Save</Button>
                </div>
            </div>
        </Modal>
    )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{children}</p>
            {action}
        </div>
    )
}

export default function OverviewPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const name = searchParams.get('name') ?? ''
    const { dock, refreshInterval, refresh } = useDashboard()

    const go = (path: string) => navigate(`/service/${path}?name=${encodeURIComponent(name)}`)

    const [registries, setRegistries] = useState<Registry[]>([])
    const [containers, setContainers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleting, setDeleting]       = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [removing, setRemoving]       = useState(false)
    const [pulling, setPulling]         = useState(false)
    const [pullError, setPullError]     = useState<string | null>(null)
    const [scaling, setScaling]         = useState(false)
    const [scaleError, setScaleError]   = useState<string | null>(null)
    const [editingPort, setEditingPort]   = useState<PortRow | 'new' | null>(null)
    const [savingPorts, setSavingPorts]   = useState(false)
    const [portsError, setPortsError]     = useState<string | null>(null)
    const [editingMount, setEditingMount] = useState<MountRow | 'new' | null>(null)
    const [savingMounts, setSavingMounts] = useState(false)
    const [mountsError, setMountsError]   = useState<string | null>(null)
    const [refreshKey, setRefreshKey]     = useState(0)

    const portCols: Column<PortRow>[] = [
        { key: 'host',      header: 'Host',           render: r => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.host || '—'}</span> },
        { key: 'container', header: 'Container port',  render: r => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.container}</span> },
        { key: 'protocol',  header: 'Protocol', shrink: true, render: r => r.protocol ? <Tag value={r.protocol} /> : null },
        {
            key: 'edit', header: '', shrink: true,
            render: r => (
                <Button variant={4} size="sm" onClick={e => { e.stopPropagation(); setEditingPort(r) }}
                    style={{ color: 'var(--text-3)' }}>
                    <Pencil size={12} />
                </Button>
            ),
        },
    ]

    const service = useMemo(() => dock.find(s => s.name === name) ?? null, [dock, name])

    useEffect(() => { apiListRegistries().then(setRegistries).catch(() => {}) }, [])

    useEffect(() => {
        let mounted = true
        const fetch = () =>
            apiServiceContainers(name)
                .then(c => { if (mounted) setContainers(c.containers ?? []) })
                .finally(() => { if (mounted) setLoading(false) })

        fetch()
        const id = setInterval(fetch, refreshInterval)
        return () => { mounted = false; clearInterval(id) }
    }, [name, refreshInterval, refreshKey])

    useEffect(() => {
        if (!removing) return
        const id = setInterval(() => refresh(), 1000)
        return () => clearInterval(id)
    }, [removing])

    useEffect(() => {
        if (removing && !dock.find(s => s.name === name)) navigate('/')
    }, [dock, removing, name])

    if (loading) return <Page><Spinner /></Page>

    if (removing)     return <Page><Spinner label={`Removing ${name}…`} /></Page>
    if (pulling)      return <Page><Spinner label={`Pulling latest image for ${name}…`} /></Page>
    if (savingPorts)  return <Page><Spinner label="Updating ports…" /></Page>
    if (savingMounts) return <Page><Spinner label="Updating mounts…" /></Page>

    const running     = containers.filter(c => c.running).length
    const stopped     = containers.length - running
    const allNetworks = [...new Set(containers.flatMap(c => c.networks ?? []))]
    const allPolicies = [...new Set(containers.map(c => c.restart_policy).filter(Boolean))]
    const allImages   = [...new Set(containers.map(c => c.image).filter(Boolean))]

    type ServicePort = { published: number | null; target: number | null; protocol: string; publish_mode: string }
    const portRows: PortRow[] = ((service as unknown as { ports?: ServicePort[] })?.ports ?? []).map((p, i) => ({
        id:        `${i}`,
        host:      p.published != null ? String(p.published) : '',
        container: p.target    != null ? String(p.target)    : '',
        protocol:  p.protocol.toLowerCase().replace('empty', ''),
    }))

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
            value: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {allImages.map(img => {
                        const ref = (img as string).split('@')[0]
                        const registry = registries.find(r => ref.startsWith(r.username + '/'))
                        return (
                            <span key={img} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Tag value={ref} />
                                {registry && (
                                    <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '1px 6px', borderRadius: 3, background: 'var(--fill-1)', border: '1px solid var(--stroke-1)' }}>
                                        {registry.name}
                                    </span>
                                )}
                            </span>
                        )
                    })}
                </div>
            ),
        },
        allPolicies.length > 0 && {
            id: 'restart', label: 'Restart',
            value: <div style={{ display: 'flex', gap: 6 }}>{allPolicies.map(p => <Tag key={p} value={p} />)}</div>,
        },
        allNetworks.length > 0 && {
            id: 'networks', label: 'Networks',
            value: <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{allNetworks.map(n => <Tag key={n} value={n} />)}</div>,
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

    const handlePull = async () => {
        setPulling(true)
        setPullError(null)
        try {
            await apiPullService(name)
            refresh()
        } catch (err: any) {
            setPullError(err?.message ?? 'Failed to pull image')
        } finally {
            setPulling(false)
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

    const mountCols: Column<MountRow>[] = [
        { key: 'source',      header: 'Source',      render: r => <span style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{r.source || '—'}</span> },
        { key: 'destination', header: 'Destination', render: r => <span style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{r.destination}</span> },
        { key: 'type',        header: 'Type', shrink: true, render: r => r.type ? <Tag value={r.type} /> : null },
        {
            key: 'edit', header: '', shrink: true,
            render: r => (
                <Button variant={4} size="sm" onClick={e => { e.stopPropagation(); setEditingMount(r) }}
                    style={{ color: 'var(--text-3)' }}>
                    <Pencil size={12} />
                </Button>
            ),
        },
    ]

    const handleSaveMounts = async (draft: MountDraft, original: MountRow | null) => {
        setSavingMounts(true)
        setMountsError(null)
        try {
            const draftToPayload = (d: MountDraft): MountConfigPayload => ({
                source:    d.source,
                target:    d.target,
                typ:       d.typ,
                read_only: d.readOnly,
            })
            const rowToPayload = (r: MountRow): MountConfigPayload => ({
                source:    r.source,
                target:    r.destination,
                typ:       (r.type === 'bind' ? 'bind' : r.type === 'tmpfs' ? 'tmpfs' : 'volume') as MountConfigPayload['typ'],
                read_only: false,
            })
            const kept    = mountRows.filter(r => r.id !== original?.id).map(rowToPayload)
            const updated = draftToPayload(draft)
            await apiUpdateServiceMounts(name, [...kept, updated])
            setRefreshKey(k => k + 1)
            setEditingMount(null)
        } catch (err: any) {
            setMountsError(err?.message ?? 'Failed to update mounts')
        } finally {
            setSavingMounts(false)
        }
    }

    const handleSavePorts = async (draft: PortDraft, original: PortRow | null) => {
        setSavingPorts(true)
        setPortsError(null)
        try {
            const draftToPayload = (d: PortDraft): PortConfigPayload => ({
                host_port:      d.hostPort !== '' ? Number(d.hostPort) : null,
                container_port: Number(d.containerPort),
                protocol:       d.protocol,
                publish_mode:   d.publishMode,
            })
            const rowToPayload = (r: PortRow): PortConfigPayload => ({
                host_port:      r.host !== '' ? Number(r.host.split(':').pop()) : null,
                container_port: Number(r.container),
                protocol:       (r.protocol === 'udp' ? 'udp' : r.protocol === 'tcp+udp' ? 'tcp+udp' : 'tcp') as PortConfigPayload['protocol'],
                publish_mode:   'ingress',
            })
            const kept    = portRows.filter(r => r.id !== original?.id).map(rowToPayload)
            const updated = draftToPayload(draft)
            await apiUpdateServicePorts(name, [...kept, updated])
            refresh()
            setEditingPort(null)
        } catch (err: any) {
            setPortsError(err?.message ?? 'Failed to update ports')
        } finally {
            setSavingPorts(false)
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
                <SectionTitle action={
                    <Button variant={2} size="sm" onClick={() => setEditingPort('new')}>
                        <Plus size={12} /> Add
                    </Button>
                }>Ports</SectionTitle>
                <Table columns={portCols} data={portRows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} emptyMessage="No ports exposed." />
            </div>

            {editingPort !== null && (
                <PortEditModal
                    port={editingPort === 'new' ? null : editingPort}
                    onClose={() => { if (!savingPorts) setEditingPort(null) }}
                    onSave={handleSavePorts}
                    saving={savingPorts}
                    error={portsError}
                />
            )}

            <div style={{ marginTop: 24, borderTop: '1px solid var(--stroke-1)', paddingTop: 24 }}>
                <SectionTitle action={
                    <Button variant={2} size="sm" onClick={() => setEditingMount('new')}>
                        <Plus size={12} /> Add
                    </Button>
                }>Volumes</SectionTitle>
                <Table columns={mountCols} data={mountRows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} emptyMessage="No volumes mounted." />
            </div>

            {editingMount !== null && (
                <MountEditModal
                    mount={editingMount === 'new' ? null : editingMount}
                    onClose={() => { if (!savingMounts) setEditingMount(null) }}
                    onSave={handleSaveMounts}
                    saving={savingMounts}
                    error={mountsError}
                />
            )}

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
                            id: 'pull',
                            label: 'Pull latest',
                            value: (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                    <Button variant={2} size="sm" onClick={handlePull}>
                                        <RefreshCw size={12} /> Pull
                                    </Button>
                                    {pullError && <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{pullError}</span>}
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
