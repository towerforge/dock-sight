import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cpu, MemoryStick } from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { formatBytes } from '@/lib/formatters'
import { Page } from '@/components/ui'
import { MiniSysChart } from '@/components/dashboard/MiniSysChart'
import type { ServiceHistoryPoint } from '@/types/dashboard'

const INTERVALS = [2000, 5000, 10000, 30000]
const POINTS    = [5, 10, 20, 50]

export default function MetricsPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''
    const { dock, serviceHistory, refreshInterval, setRefreshInterval, pointCount, setPointCount } = useDashboard()

    const service = useMemo(() => dock.find(s => s.name === name) ?? null, [dock, name])
    const history: ServiceHistoryPoint[] = serviceHistory[name] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartData = history.map(p => ({ time: p.time, cpu: p.cpu, ram: p.ramPercent, disk: 0 })) as any

    return (
        <Page>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                <ControlSelect label="Refresh" value={refreshInterval} options={INTERVALS} format={v => `${v / 1000}s`} onChange={setRefreshInterval} />
                <ControlSelect label="Points"  value={pointCount}      options={POINTS}    format={v => `${v}`}           onChange={setPointCount} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <MetricCard
                    label="CPU" Icon={Cpu} colorHex="#3b82f6" colorId="svc-cpu"
                    mainValue={`${(service?.info.cpu.percent ?? 0).toFixed(1)}%`}
                    data={chartData} dataKey="cpu" pointCount={pointCount}
                />
                <MetricCard
                    label="RAM" Icon={MemoryStick} colorHex="#10b981" colorId="svc-ram"
                    mainValue={`${(service?.info.ram.percent ?? 0).toFixed(1)}%`}
                    subtitle={service ? formatBytes(service.info.ram.used) : undefined}
                    data={chartData} dataKey="ram" pointCount={pointCount}
                />
            </div>
        </Page>
    )
}

function MetricCard({ label, Icon, colorHex, colorId, mainValue, subtitle, data, dataKey, pointCount }: {
    label: string
    Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
    colorHex: string; colorId: string
    mainValue: string; subtitle?: string
    data: Parameters<typeof MiniSysChart>[0]['data']
    dataKey: 'cpu' | 'ram'
    pointCount: number
}) {
    return (
        <div style={{ padding: 16, borderRadius: 'var(--radius-2)', background: 'var(--layer-1)', border: '1px solid var(--stroke-1)', boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', minHeight: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                <Icon size={14} style={{ color: colorHex }} />{label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{mainValue}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
            <div style={{ flex: 1, minHeight: 80, marginTop: 12 }}>
                <MiniSysChart data={data} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
            </div>
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
