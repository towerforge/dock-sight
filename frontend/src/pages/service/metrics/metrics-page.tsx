import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cpu, MemoryStick, Network } from 'lucide-react'
import { useDashboard } from '@/context/dashboard-context'
import { formatBytes } from '@/lib/formatters'
import { Page, Grid, Col } from '@/components/ui'
import { MetricCard } from './metric-card'
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
    const chartData = history.map(p => ({ time: p.time, cpu: p.cpu, ram: p.ramPercent, disk: 0, networkRx: p.networkRx ?? 0, networkTx: p.networkTx ?? 0 })) as any

    return (
        <Page maxWidth="full" size={2}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                <ControlSelect label="Refresh" value={refreshInterval} options={INTERVALS} format={v => `${v / 1000}s`} onChange={setRefreshInterval} />
                <ControlSelect label="Points"  value={pointCount}      options={POINTS}    format={v => `${v}`}           onChange={setPointCount} />
            </div>

            <Grid>
                <Col span={6}>
                <MetricCard
                    label="CPU" Icon={Cpu} colorHex="#3b82f6" colorId="svc-cpu"
                    mainValue={<span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{(service?.info.cpu.percent ?? 0).toFixed(1)}%</span>}
                    data={chartData} dataKey="cpu" pointCount={pointCount}
                />
                </Col>
                <Col span={6}>
                <MetricCard
                    label="RAM" Icon={MemoryStick} colorHex="#10b981" colorId="svc-ram"
                    mainValue={
                        <span style={{ fontFamily: 'monospace' }}>
                            <span style={{ color: '#10b981' }}>{service ? formatBytes(service.info.ram.used) : '—'}</span>
                            <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>·</span>
                            <span style={{ color: '#10b981' }}>{(service?.info.ram.percent ?? 0).toFixed(1)}%</span>
                        </span>
                    }
                    data={chartData} dataKey="ram" pointCount={pointCount}
                />
                </Col>
                <Col span={12}>
                    <MetricCard
                        label="Network" Icon={Network} colorHex="#8b5cf6" colorId="svc-net"
                        mainValue={
                            <span style={{ fontFamily: 'monospace' }}>
                                <span style={{ color: '#8b5cf6' }}>↓ {service ? formatBytes(service.info.net.rx) : '0 B'}/s</span>
                                <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>·</span>
                                <span style={{ color: '#a78bfa' }}>↑ {service ? formatBytes(service.info.net.tx) : '0 B'}/s</span>
                            </span>
                        }
                        data={chartData} dataKey="network" pointCount={pointCount}
                    />
                </Col>
            </Grid>
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
