import { useState } from 'react'
import { CircuitBoard, HardDrive, Activity } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts'
import { Page, SegmentedControl } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { formatBytes, formatTooltipTime } from '@/lib/formatters'

// ── Config ────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'cpu' | 'ram' | 'disk' | 'net'

const METRICS: { value: Exclude<Tab, 'all'>; label: string; Icon: React.ElementType; colorHex: string; colorId: string }[] = [
    { value: 'cpu',  label: 'CPU',     Icon: CircuitBoard, colorHex: '#3b82f6', colorId: 's-cpu'  },
    { value: 'ram',  label: 'RAM',     Icon: CircuitBoard, colorHex: '#10b981', colorId: 's-ram'  },
    { value: 'disk', label: 'Disk',    Icon: HardDrive,    colorHex: '#f59e0b', colorId: 's-disk' },
    { value: 'net',  label: 'Network', Icon: Activity,     colorHex: '#8b5cf6', colorId: 's-net'  },
]

const TABS = [
    { value: 'all'  as Tab, label: 'All'     },
    ...METRICS.map(m => ({ value: m.value as Tab, label: m.label })),
]

// ── Shared tooltip styles ─────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
    backgroundColor: 'var(--layer-1)',
    border: '1px solid var(--stroke-1)',
    color: 'var(--text-1)',
    fontSize: 12,
    borderRadius: 6,
}
const LABEL_STYLE = { color: 'var(--text-2)', marginBottom: 4, fontSize: 11, fontWeight: 600 }

// ── Chart ─────────────────────────────────────────────────────────────────────

interface ChartProps {
    tab:      Exclude<Tab, 'all'>
    colorHex: string
    colorId:  string
    height?:  number
    compact?: boolean   // hides x-axis labels when stacked
}

function SysChart({ tab, colorHex, colorId, height = 340, compact = false }: ChartProps) {
    const { sysHistory, pointCount } = useDashboard()
    const isNet = tab === 'net'
    const dataKey = isNet ? 'network' : tab
    const faded = `${colorHex}99`

    const limited = sysHistory.slice(0, pointCount)
    const chartData = isNet
        ? limited.map(p => ({ ...p, networkRx: p.networkRx ? -Math.abs(p.networkRx) : 0, networkTx: p.networkTx ? Math.abs(p.networkTx) : 0 }))
        : limited

    const formatter = (value: unknown) => {
        const n = typeof value === 'number' ? value : parseFloat(String(value))
        if (isNaN(n)) return ['']
        if (isNet) return [formatBytes(Math.abs(n))]
        return [`${n.toFixed(1)}%`]
    }

    return (
        <div style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId="sys">
                    <defs>
                        <linearGradient id={`grad-${colorId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={colorHex} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={colorHex} stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id={`grad-${colorId}-tx`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={faded} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={faded} stopOpacity={0.03} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-1)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={v => formatTooltipTime(v)}
                        tick={compact ? false : { fontSize: 11, fill: 'var(--text-3)' }}
                        axisLine={false}
                        tickLine={false}
                        tickCount={6}
                        height={compact ? 0 : 20}
                    />
                    <YAxis
                        domain={isNet ? undefined : [0, 100]}
                        tickFormatter={v => isNet ? formatBytes(Math.abs(v)) : `${v}%`}
                        tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                        axisLine={false}
                        tickLine={false}
                        width={isNet ? 72 : 40}
                    />
                    <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={LABEL_STYLE}
                        labelFormatter={v => formatTooltipTime(v)}
                        formatter={formatter}
                    />
                    {isNet ? (
                        <>
                            <Area type="monotone" dataKey="networkRx" name="Download" stroke={faded} strokeWidth={2}
                                fill={`url(#grad-${colorId})`} isAnimationActive={false}
                                dot={false} activeDot={{ r: 5, fill: faded, stroke: '#fff', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="networkTx" name="Upload" stroke={colorHex} strokeWidth={2}
                                fill={`url(#grad-${colorId}-tx)`} isAnimationActive={false}
                                dot={false} activeDot={{ r: 5, fill: colorHex, stroke: '#fff', strokeWidth: 2 }} />
                        </>
                    ) : (
                        <Area type="monotone" dataKey={dataKey} stroke={colorHex} strokeWidth={2.5}
                            fill={`url(#grad-${colorId})`} isAnimationActive={false}
                            dot={false} activeDot={{ r: 5, fill: colorHex, stroke: '#fff', strokeWidth: 2 }} />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

// ── Stat row (single metric) ──────────────────────────────────────────────────

function StatRow({ tab, colorHex }: { tab: Exclude<Tab, 'all'>; colorHex: string }) {
    const { sys } = useDashboard()
    const totalNet   = (sys?.network?.total_rx ?? 0) + (sys?.network?.total_tx ?? 0)
    const netPercent = Math.min((totalNet / (sys?.network?.max_limit ?? 125000000)) * 100, 100)

    const info = (() => {
        switch (tab) {
            case 'cpu':  return { percent: sys?.cpu.percent ?? 0,  details: [`${sys?.cpu.active ?? 0} / ${sys?.cpu.total ?? 0} cores`] }
            case 'ram':  return { percent: sys?.ram.percent ?? 0,  details: [`${formatBytes(sys?.ram.used ?? 0)} / ${formatBytes(sys?.ram.total ?? 0)}`, `${formatBytes(sys?.ram.free ?? 0)} free`] }
            case 'disk': return { percent: sys?.disk.percent ?? 0, details: [`${formatBytes(sys?.disk.used ?? 0)} / ${formatBytes(sys?.disk.total ?? 0)}`, `${formatBytes(sys?.disk.free ?? 0)} free`] }
            case 'net':  return { percent: netPercent, details: [`↑ ${formatBytes(sys?.network?.total_tx ?? 0)}/s`, `↓ ${formatBytes(sys?.network?.total_rx ?? 0)}/s`] }
        }
    })()

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: colorHex, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {info.percent.toFixed(0)}<span style={{ fontSize: 24, fontWeight: 400, color: 'var(--text-3)' }}>%</span>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {info.details.map((d, i) => (
                    <span key={i} style={{ fontSize: 13, color: i === 0 ? 'var(--text-2)' : 'var(--text-3)', fontFamily: 'monospace' }}>{d}</span>
                ))}
            </div>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--fill-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${info.percent}%`, background: colorHex, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
        </div>
    )
}

// ── All view — stacked charts with inline label ───────────────────────────────

function AllView() {
    const { sys } = useDashboard()
    const totalNet   = (sys?.network?.total_rx ?? 0) + (sys?.network?.total_tx ?? 0)
    const netPercent = Math.min((totalNet / (sys?.network?.max_limit ?? 125000000)) * 100, 100)

    const percents: Record<Exclude<Tab, 'all'>, number> = {
        cpu:  sys?.cpu.percent  ?? 0,
        ram:  sys?.ram.percent  ?? 0,
        disk: sys?.disk.percent ?? 0,
        net:  netPercent,
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {METRICS.map((m, i) => (
                <div key={m.value} style={{ borderBottom: i < METRICS.length - 1 ? '1px solid var(--stroke-1)' : undefined, paddingBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                            <m.Icon size={13} style={{ color: m.colorHex }} />{m.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.colorHex, fontVariantNumeric: 'tabular-nums' }}>
                            {percents[m.value].toFixed(0)}%
                        </span>
                    </div>
                    <SysChart
                        tab={m.value}
                        colorHex={m.colorHex}
                        colorId={m.colorId}
                        height={180}
                        compact={i < METRICS.length - 1}
                    />
                </div>
            ))}
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SystemPage() {
    const [tab, setTab] = useState<Tab>('all')
    const active = METRICS.find(m => m.value === tab)

    return (
        <Page>
            <div style={{ marginBottom: 20 }}>
                <SegmentedControl options={TABS} value={tab} onChange={setTab} />
            </div>

            {tab === 'all' ? (
                <AllView />
            ) : active ? (
                <>
                    <StatRow tab={active.value} colorHex={active.colorHex} />
                    <SysChart tab={active.value} colorHex={active.colorHex} colorId={active.colorId} />
                </>
            ) : null}
        </Page>
    )
}
