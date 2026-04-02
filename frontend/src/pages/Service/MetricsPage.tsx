import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cpu, MemoryStick } from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { formatBytes } from '@/lib/formatters'
import { Page } from '@/components/ui'
import { MiniSysChart } from '@/components/dashboard/MiniSysChart'
import type { ServiceHistoryPoint } from '@/types/dashboard'

const POINTS = [5, 10, 20, 50]

export default function MetricsPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''
    const { dock, serviceHistory } = useDashboard()
    const [viewMode, setViewMode] = useState<'bars' | 'chart'>('bars')
    const [pointCount, setPointCount] = useState(10)

    const service = useMemo(() => dock.find(s => s.name === name) ?? null, [dock, name])
    const history: ServiceHistoryPoint[] = serviceHistory[name] ?? []

    return (
        <Page>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                <ControlSelect label="Points" value={pointCount} options={POINTS} format={v => `${v}`} onChange={setPointCount} />
                <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <ServiceMetricCard
                    title="CPU" Icon={Cpu} colorHex="#3b82f6" colorId="svc-cpu"
                    percent={service?.info.cpu.percent ?? 0}
                    mainValue={`${(service?.info.cpu.percent ?? 0).toFixed(1)}%`}
                    data={history} dataKey="cpu" viewMode={viewMode} pointCount={pointCount}
                />
                <ServiceMetricCard
                    title="RAM" Icon={MemoryStick} colorHex="#10b981" colorId="svc-ram"
                    percent={service?.info.ram.percent ?? 0}
                    mainValue={`${(service?.info.ram.percent ?? 0).toFixed(1)}%`}
                    subtitle={service ? formatBytes(service.info.ram.used) : undefined}
                    data={history} dataKey="ramPercent" viewMode={viewMode} pointCount={pointCount}
                />
            </div>
        </Page>
    )
}

function ServiceMetricCard({ title, Icon, colorHex, colorId, percent, mainValue, subtitle, data, dataKey, viewMode, pointCount }: {
    title: string; Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; colorHex: string; colorId: string
    percent: number; mainValue: string; subtitle?: string
    data: ServiceHistoryPoint[]; dataKey: 'cpu' | 'ramPercent'
    viewMode: 'bars' | 'chart'; pointCount: number
}) {
    return (
        <div style={{ padding: 16, borderRadius: 'var(--radius-2)', background: 'var(--layer-1)', border: '1px solid var(--stroke-1)', boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <Icon size={14} style={{ color: colorHex }} />{title}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{mainValue}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
            {viewMode === 'bars' ? (
                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                    <div style={{ width: '100%', background: 'var(--fill-2)', height: 6, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: colorHex, borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, minHeight: 80 }}>
                    <MiniSysChart
                        data={data.map(p => ({ time: p.time, cpu: p.cpu, ram: p.ramPercent, disk: 0 }))}
                        dataKey={dataKey === 'ramPercent' ? 'ram' : 'cpu'}
                        colorHex={colorHex} colorId={colorId} pointCount={pointCount}
                    />
                </div>
            )}
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
