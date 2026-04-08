import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Page, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiListDockerVolumes } from '@/services/api'
import type { DockerVolume, VolumesResponse } from '@/services/api'
import { formatBytes, formatRelativeTime } from '@/lib/formatters'
import { NETWORK_COLORS as PALETTE } from '@/lib/colors'

// ── Colour palette (deterministic by index) ──────────────────────────────────
function serviceColor(index: number) { return PALETTE[index % PALETTE.length] }

// ── Disk bar ─────────────────────────────────────────────────────────────────
interface BarSegment { label: string; bytes: number; color: string }

function DiskBar({ total, used, free, segments }: { total: number; used: number; free: number; segments: BarSegment[] }) {
    const [tooltip, setTooltip] = useState<string | null>(null)

    if (!total) return null

    // If we have volume sizes, split "used" into: [docker-by-service...] + [other]
    const dockerTotal = segments.reduce((s, b) => s + b.bytes, 0)
    const otherUsed = Math.max(0, used - dockerTotal)

    const allSegments: BarSegment[] = [
        ...segments.filter(s => s.bytes > 0),
        ...(otherUsed > 0 ? [{ label: 'System', bytes: otherUsed, color: 'var(--accent)' }] : []),
        { label: 'Free', bytes: free, color: 'var(--fill-2)' },
    ]

    // If no volume sizes known, fallback to simple used/free bar
    const simple = dockerTotal === 0
    const simpleSegs: BarSegment[] = [
        { label: 'Used', bytes: used, color: 'var(--accent)' },
        { label: 'Free', bytes: free, color: 'var(--fill-2)' },
    ]

    const segs = simple ? simpleSegs : allSegments

    return (
        <div>
            {/* Bar */}
            <div style={{ position: 'relative', height: 32, borderRadius: 50, overflow: 'hidden', background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', display: 'flex' }}>
                {segs.map((seg, i) => {
                    const pct = (seg.bytes / total) * 100
                    if (pct < 0.2) return null
                    return (
                        <div
                            key={i}
                            style={{ width: `${pct}%`, background: seg.color, transition: 'width 0.3s', cursor: 'default' }}
                            onMouseEnter={() => setTooltip(`${seg.label}: ${formatBytes(seg.bytes)}`)}
                            onMouseLeave={() => setTooltip(null)}
                        />
                    )
                })}
                {tooltip && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        fontSize: 11, fontWeight: 600, color: 'var(--text-1)',
                        pointerEvents: 'none', whiteSpace: 'nowrap',
                        background: 'var(--bg-1)', padding: '2px 8px', borderRadius: 4,
                        border: '1px solid var(--stroke-1)',
                    }}>
                        {tooltip}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                {segs.filter(s => s.label !== 'Free').map((seg, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                        {seg.label}
                        <span style={{ color: 'var(--text-3)', fontFamily: 'monospace' }}>{formatBytes(seg.bytes)}</span>
                    </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', flexShrink: 0 }} />
                    Free
                    <span style={{ color: 'var(--text-3)', fontFamily: 'monospace' }}>{formatBytes(free)}</span>
                </span>
            </div>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VolumesPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<VolumesResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const load = () => {
        setLoading(true); setError(false)
        apiListDockerVolumes()
            .then(d => { setData(d); setLoading(false) })
            .catch(() => { setError(true); setLoading(false) })
    }

    useEffect(() => { load() }, [])

    // Assign a deterministic color per service
    const { serviceMap, colorMap } = useMemo(() => {
        const svcMap = new Map<string, DockerVolume[]>()
        if (!data) return { serviceMap: svcMap, colorMap: new Map<string, string>() }
        for (const v of data.volumes) {
            const key = v.service || ''
            if (!svcMap.has(key)) svcMap.set(key, [])
            svcMap.get(key)!.push(v)
        }
        const colorMap = new Map<string, string>()
        Array.from(svcMap.keys()).forEach((svc, i) => colorMap.set(svc, serviceColor(i)))
        return { serviceMap: svcMap, colorMap }
    }, [data])

    // Bar segments: one per service (only if sizes are known)
    const barSegments: BarSegment[] = useMemo(() => {
        if (!data) return []
        return Array.from(serviceMap.entries())
            .map(([svc, vols]) => {
                const total = vols.reduce((s, v) => v.size >= 0 ? s + v.size : s, 0)
                return { label: svc || 'Unknown', bytes: total, color: colorMap.get(svc) ?? '#888' }
            })
            .filter(s => s.bytes > 0)
    }, [serviceMap, colorMap, data])

    const columns: Column<DockerVolume>[] = useMemo(() => {
        const hasSizes = data?.volumes.some(v => v.size >= 0) ?? false
        return [
            {
                key: 'name',
                header: 'Name',
                render: v => (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                            background: colorMap.get(v.service) ?? 'var(--text-3)',
                        }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{v.name}</span>
                    </span>
                ),
            },
            {
                key: 'service',
                header: 'Service',
                shrink: true,
                render: v => v.service
                    ? <span style={{ color: 'var(--text-3)' }}>{v.service}</span>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>,
            },
            {
                key: 'driver',
                header: 'Driver',
                shrink: true,
                render: v => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.driver}</span>,
            },
            ...(hasSizes ? [{
                key: 'size' as keyof DockerVolume,
                header: 'Size',
                shrink: true,
                render: (v: DockerVolume) => v.size >= 0
                    ? <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{formatBytes(v.size)}</span>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>,
            }] : []),
            {
                key: 'created_at',
                header: 'Created',
                shrink: true,
                render: v => <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{formatRelativeTime(v.created_at)}</span>,
            },
        ]
    }, [colorMap, navigate, data])

    if (loading) return (
        <Page>
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
        </Page>
    )

    if (error) return (
        <Page>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-3)' }}>
                <AlertCircle size={28} />
                <p style={{ fontSize: 14, margin: 0 }}>Could not load volumes</p>
                <button onClick={load} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
            </div>
        </Page>
    )

    const { disk, volumes } = data!

    return (
        <Page>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Disk bar section */}
                {/* <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>System disk</span>
                        <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{formatBytes(disk.total)}</span>
                    </div>
                    <Button variant={4} size="sm" onClick={load}><RefreshCw size={13} /></Button>
                </div> */}
                <DiskBar total={disk.total} used={disk.used} free={disk.free} segments={barSegments} />

                {/* Volumes table */}
                <Table
                    columns={columns}
                    data={volumes}
                    keyExtractor={v => v.name}
                    emptyMessage="No Docker volumes found."
                />

            </div>
        </Page>
    )
}
