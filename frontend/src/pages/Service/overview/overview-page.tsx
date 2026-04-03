import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Page, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiServiceContainers } from '@/services/api'
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
    const { dock } = useDashboard()

    const go = (path: string) => navigate(`/service/${path}?name=${encodeURIComponent(name)}`)

    const [containers, setContainers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const service = useMemo(() => dock.find(s => s.name === name) ?? null, [dock, name])

    useEffect(() => {
        apiServiceContainers(name)
            .then(c => setContainers(c.containers ?? []))
            .finally(() => setLoading(false))
    }, [name])

    if (loading) return (
        <Page maxWidth="full" size={2}>
            <p style={{ color: 'var(--text-3)', fontSize: 14, padding: '32px 0', textAlign: 'center' }}>Loading…</p>
        </Page>
    )

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

    return (
        <Page>
            <Table
                columns={kvCols}
                data={infoRows}
                keyExtractor={r => r.id}
                onRowClick={r => r.onClick?.()}
                rowStyle={r => r.onClick ? {} : { cursor: 'default' }}
            />
        </Page>
    )
}
