import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

import { useDashboard } from '@/context/DashboardContext'
import { ServiceBar } from '@/components/dashboard/ServiceBar'
import { ServiceCard } from '@/components/dashboard/ServiceCard'
import { Input, Page, Grid, Col } from '@/components/ui'

const INTERVALS = [2000, 5000, 10000, 30000]
const POINTS    = [5, 10, 20, 50]

export default function Home() {
    const { status: authStatus, loading: authLoading } = useAuth()
    const { dock, serviceHistory, refreshInterval, setRefreshInterval, pointCount, setPointCount } = useDashboard()
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode]     = useState<'bars' | 'chart'>('bars')

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
        <Page>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <Input
                    placeholder="Search services…"
                    value={searchTerm}
                    onChange={e => setSearchTerm((e.target as HTMLInputElement).value)}
                    style={{ maxWidth: 280 }}
                />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ControlSelect label="Refresh" value={refreshInterval} options={INTERVALS} format={v => `${v / 1000}s`} onChange={setRefreshInterval} />
                    <ControlSelect label="Points"  value={pointCount}      options={POINTS}    format={v => `${v}`}           onChange={setPointCount} />
                    <ViewToggle value={viewMode} onChange={setViewMode} />
                </div>
            </div>

            {viewMode === 'bars' ? (
                <ServiceBar items={filteredDocs} />
            ) : (
                <Grid gap={16}>
                    {filteredDocs.map(s => (
                        <Col key={s.name} span={12} md={6}>
                            <ServiceCard service={s} historyData={serviceHistory[s.name] ?? []} pointCount={pointCount} />
                        </Col>
                    ))}
                </Grid>
            )}
        </Page>
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

function ViewToggle({ value, onChange }: { value: 'bars' | 'chart'; onChange: (v: 'bars' | 'chart') => void }) {
    const btn = (v: 'bars' | 'chart', label: string) => (
        <button key={v} onClick={() => onChange(v)} style={{ padding: '4px 10px', fontSize: 13, border: 'none', borderRadius: 'calc(var(--radius-1) - 2px)', cursor: 'pointer', background: value === v ? 'var(--layer-1)' : 'transparent', color: value === v ? 'var(--text-1)' : 'var(--text-2)', boxShadow: value === v ? 'var(--shadow-1)' : undefined, transition: 'all 0.15s' }}>
            {label}
        </button>
    )
    return (
        <div style={{ display: 'inline-flex', background: 'var(--fill-1)', border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-1)', padding: 2, gap: 2 }}>
            {btn('bars', 'Table')}
            {btn('chart', 'Grid')}
        </div>
    )
}
