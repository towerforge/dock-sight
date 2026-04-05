import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useDashboard } from '@/context/dashboard-context'
import { ServiceCard } from '@/pages/metrics/service-card'
import { Input, Page, Grid, Col } from '@/components/ui'
import type { ChartMode } from '@/pages/metrics/service-card'

const INTERVALS = [2000, 5000, 10000, 30000]
const POINTS    = [5, 10, 20, 50]

const CHART_MODES: { value: ChartMode; label: string }[] = [
    { value: 'cpu',     label: 'CPU'     },
    { value: 'ram',     label: 'RAM'     },
    { value: 'network', label: 'Network' },
]

export default function Metrics() {
    const { status: authStatus, loading: authLoading } = useAuth()
    const { dock, serviceHistory, refreshInterval, setRefreshInterval, pointCount, setPointCount } = useDashboard()
    const [searchTerm, setSearchTerm] = useState('')
    const [chartMode, setChartMode] = useState<ChartMode>('cpu')

    const filteredDocs = useMemo(() =>
        dock.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [dock, searchTerm]
    )

    if (authLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-3)', fontSize: 14 }}>
            Loading…
        </div>
    )

    if (!authStatus?.authenticated) return <Navigate to="/login" replace />

    return (
        <Page maxWidth="full" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <Input
                    placeholder="Search services…"
                    value={searchTerm}
                    onChange={e => setSearchTerm((e.target as HTMLInputElement).value)}
                    style={{ maxWidth: 280 }}
                />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChartModeSelector value={chartMode} onChange={setChartMode} />
                    <ControlSelect label="Refresh" value={refreshInterval} options={INTERVALS} format={v => `${v / 1000}s`} onChange={setRefreshInterval} />
                    <ControlSelect label="Points"  value={pointCount}      options={POINTS}    format={v => `${v}`}           onChange={setPointCount} />
                </div>
            </div>

            <Grid gap={16}>
                {filteredDocs.map(s => (
                    <Col key={s.name} span={12} md={3}>
                        <ServiceCard service={s} historyData={serviceHistory[s.name] ?? []} pointCount={pointCount} chartMode={chartMode} />
                    </Col>
                ))}
            </Grid>
        </Page>
    )
}

function ChartModeSelector({ value, onChange }: { value: ChartMode; onChange: (v: ChartMode) => void }) {
    return (
        <div style={{ display: 'flex', gap: 2, background: 'var(--layer-2)', border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-1)', padding: 2 }}>
            {CHART_MODES.map(m => (
                <button
                    key={m.value}
                    onClick={() => onChange(m.value)}
                    style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '3px 10px',
                        borderRadius: 'calc(var(--radius-1) - 1px)',
                        border: 'none',
                        cursor: 'pointer',
                        background: value === m.value ? 'var(--layer-1)' : 'transparent',
                        color: value === m.value ? 'var(--text-1)' : 'var(--text-3)',
                        boxShadow: value === m.value ? 'var(--shadow-1)' : 'none',
                        transition: 'all 0.1s',
                    }}
                >
                    {m.label}
                </button>
            ))}
        </div>
    )
}

function ControlSelect({ label, value, options, format, onChange }: { label: string; value: number; options: number[]; format: (v: number) => string; onChange: (v: number) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--text-3)' }}>{label}</span>
            <select value={value} onChange={e => onChange(Number(e.target.value))} style={{ background: 'var(--layer-1)', border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-1)', padding: '4px 8px', fontSize: 13, color: 'var(--text-1)', cursor: 'pointer' }}>
                {options.map(o => <option key={o} value={o}>{format(o)}</option>)}
            </select>
        </div>
    )
}
