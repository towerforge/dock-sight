import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useDashboard } from '@/context/dashboard-context'
import { ServiceCard } from '@/pages/metrics/service-card'
import { SearchBar, SegmentedControl, InlineSelect, Page, Grid, Col } from '@/components/ui'
import type { ChartMode } from '@/pages/metrics/service-card'

type ViewMode = ChartMode | 'all'

const INTERVALS = [2000, 5000, 10000, 30000]
const POINTS    = [5, 10, 20, 50]

const CHART_MODES: { value: ViewMode; label: string }[] = [
    { value: 'cpu',     label: 'CPU'     },
    { value: 'ram',     label: 'RAM'     },
    { value: 'network', label: 'Network' },
    { value: 'all',     label: 'All'     },
]

const ALL_MODES: ChartMode[] = ['cpu', 'ram', 'network']

export default function Metrics() {
    const { status: authStatus, loading: authLoading } = useAuth()
    const { dock, serviceHistory, refreshInterval, setRefreshInterval, pointCount, setPointCount } = useDashboard()
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('all')
    const [networkFilter, setNetworkFilter] = useState('')

    const networkOptions = useMemo(() => {
        const nets = Array.from(new Set(dock.flatMap(s => s.networks ?? []))).sort()
        return [{ value: '', label: 'All' }, ...nets.map(n => ({ value: n, label: n }))]
    }, [dock])

    const filteredDocs = useMemo(() =>
        dock
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(s => !networkFilter || (s.networks ?? []).includes(networkFilter))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [dock, searchTerm, networkFilter]
    )

    if (authLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-3)', fontSize: 14 }}>
            Loading…
        </div>
    )

    if (!authStatus?.authenticated) return <Navigate to="/login" replace />

    return (
        <Page maxWidth="full" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <SearchBar
                    placeholder="Search services…"
                    value={searchTerm}
                    onChange={setSearchTerm}
                />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SegmentedControl options={CHART_MODES} value={viewMode} onChange={setViewMode} />
                    <InlineSelect
                        label="Network"
                        value={networkFilter}
                        options={networkOptions}
                        onChange={setNetworkFilter}
                    />
                    <InlineSelect
                        label="Refresh"
                        value={String(refreshInterval)}
                        options={INTERVALS.map(v => ({ value: String(v), label: `${v / 1000}s` }))}
                        onChange={v => setRefreshInterval(Number(v))}
                    />
                    <InlineSelect
                        label="Points"
                        value={String(pointCount)}
                        options={POINTS.map(v => ({ value: String(v), label: String(v) }))}
                        onChange={v => setPointCount(Number(v))}
                    />
                </div>
            </div>

            {viewMode === 'all' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredDocs.map(s => (
                        <div key={s.name}>
                            <div style={{ marginBottom: 6, paddingLeft: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{s.name}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {ALL_MODES.map(mode => (
                                    <ServiceCard key={mode} service={s} historyData={serviceHistory[s.name] ?? []} pointCount={pointCount} chartMode={mode} showType />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Grid gap={16}>
                    {filteredDocs.map(s => (
                        <Col key={s.name} span={12} md={3}>
                            <ServiceCard service={s} historyData={serviceHistory[s.name] ?? []} pointCount={pointCount} chartMode={viewMode} />
                        </Col>
                    ))}
                </Grid>
            )}
        </Page>
    )
}
