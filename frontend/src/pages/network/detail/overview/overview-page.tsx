import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Page, Table, Modal, Button, Spinner } from '@/components/ui'
import type { Column } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { apiListNetworks, apiDeleteNetwork } from '@/services/api'
import { formatBytes } from '@/lib/formatters'
import { NETWORK_COLORS as NET_COLORS } from '@/lib/colors'

type KVRow = { id: string; label: string; value: React.ReactNode }

const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</span> },
    { key: 'value', header: 'Value', render: r => r.value },
]

export default function NetworkOverviewPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const name = searchParams.get('name') ?? ''
    const { dock, refreshInterval, refresh } = useDashboard()

    const [apiNetworks, setApiNetworks] = useState<{ id: string; name: string; driver: string; scope: string }[]>([])
    const [confirmOpen,  setConfirmOpen]  = useState(false)
    const [deleting,     setDeleting]     = useState(false)
    const [deleteError,  setDeleteError]  = useState<string | null>(null)
    const [removing,     setRemoving]     = useState(false)

    useEffect(() => {
        let mounted = true
        const fetch = () =>
            apiListNetworks()
                .then(list => { if (mounted) setApiNetworks(list) })
                .catch(() => {})

        fetch()
        const id = setInterval(fetch, refreshInterval)
        return () => { mounted = false; clearInterval(id) }
    }, [refreshInterval])

    useEffect(() => {
        if (!removing) return
        const id = setInterval(() => refresh(), 1000)
        return () => clearInterval(id)
    }, [removing, refresh])

    useEffect(() => {
        if (removing && !apiNetworks.find(n => n.name === name)) navigate('/network')
    }, [apiNetworks, removing, name, navigate])

    const apiInfo = apiNetworks.find(n => n.name === name) ?? null

    const allNetworkNames = useMemo(
        () => Array.from(new Set([...apiNetworks.map(n => n.name), ...dock.flatMap(s => s.networks ?? [])])).sort(),
        [apiNetworks, dock]
    )

    const colorIdx = allNetworkNames.indexOf(name)
    const color = NET_COLORS[colorIdx % NET_COLORS.length] ?? 'var(--text-2)'

    const services = useMemo(
        () => dock.filter(s => (s.networks ?? []).includes(name)),
        [dock, name]
    )

    const running  = services.filter(s => s.containers > 0).length
    const paused   = services.length - running
    const totalRx  = services.reduce((sum, s) => sum + (s.info.net?.rx ?? 0), 0)
    const totalTx  = services.reduce((sum, s) => sum + (s.info.net?.tx ?? 0), 0)
    const totalCpu = services.reduce((sum, s) => sum + s.info.cpu.percent, 0)
    const totalRam = services.reduce((sum, s) => sum + s.info.ram.used, 0)

    const health: 'healthy' | 'degraded' | 'down' =
        services.length === 0 || running === 0 ? 'down'     :
        running < services.length               ? 'degraded' : 'healthy'

    const HEALTH_COLOR = { healthy: '#10b981', degraded: '#f59e0b', down: '#ef4444' }
    const HEALTH_LABEL = { healthy: 'Healthy', degraded: 'Degraded', down: 'Down' }

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError(null)
        try {
            await apiDeleteNetwork(name)
            setConfirmOpen(false)
            setRemoving(true)
        } catch (err: any) {
            setDeleteError(err?.message ?? 'Failed to delete network')
        } finally {
            setDeleting(false)
        }
    }

    if (removing) return <Page><Spinner label={`Removing ${name}…`} /></Page>

    const hasActiveContainers = services.some(s => s.containers > 0)

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
        {
            id: 'status', label: 'Status',
            value: (
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 10px', borderRadius: 20,
                    background: HEALTH_COLOR[health] + '18',
                    fontSize: 12, fontWeight: 600, color: HEALTH_COLOR[health],
                }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: HEALTH_COLOR[health], flexShrink: 0 }} />
                    {HEALTH_LABEL[health]}
                </span>
            ),
        },
        {
            id: 'services', label: 'Services',
            value: (
                <span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{running} running</span>
                    {paused > 0 && <span style={{ color: 'var(--text-3)', marginLeft: 10 }}>{paused} paused</span>}
                    <span style={{ color: 'var(--text-3)', marginLeft: 10, fontSize: 11 }}>({services.length} total)</span>
                </span>
            ),
        },
        {
            id: 'io', label: 'Network I/O',
            value: (
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    <span style={{ color: '#10b981' }}>↓ {formatBytes(totalRx)}/s</span>
                    <span style={{ color: 'var(--text-3)', margin: '0 8px' }}>·</span>
                    <span style={{ color: '#3b82f6' }}>↑ {formatBytes(totalTx)}/s</span>
                </span>
            ),
        },
        {
            id: 'cpu', label: 'CPU (total)',
            value: (
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: totalCpu > 80 ? '#ef4444' : totalCpu > 40 ? '#f59e0b' : '#3b82f6' }}>
                    {totalCpu.toFixed(1)}%
                </span>
            ),
        },
        {
            id: 'ram', label: 'RAM (total)',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#10b981' }}>{formatBytes(totalRam)}</span>,
        },
        apiInfo?.driver ? {
            id: 'driver', label: 'Driver',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{apiInfo.driver}</span>,
        } : null,
        apiInfo?.scope ? {
            id: 'scope', label: 'Scope',
            value: <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{apiInfo.scope}</span>,
        } : null,
        apiInfo?.id ? {
            id: 'id', label: 'ID',
            value: <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)' }}>{apiInfo.id.slice(0, 12)}</span>,
        } : null,
    ].filter(Boolean) as KVRow[]

    const actionRows: KVRow[] = [
        {
            id: 'delete',
            label: 'Delete network',
            value: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                    <Button variant={2} size="sm" onClick={() => setConfirmOpen(true)}>
                        Delete
                    </Button>
                    {hasActiveContainers && (
                        <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'monospace' }}>
                            Warning: {running} service{running !== 1 ? 's' : ''} still connected — Docker will reject the deletion
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

            <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete network">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        Are you sure you want to delete <strong>{name}</strong>?
                        {hasActiveContainers && (
                            <span style={{ display: 'block', marginTop: 8, color: '#f59e0b', fontSize: 13 }}>
                                This network has active services connected to it. Docker will only allow deletion if no containers are currently attached.
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
