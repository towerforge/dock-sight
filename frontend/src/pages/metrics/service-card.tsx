import { Link } from 'react-router-dom'
import { Box } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, CartesianGrid, XAxis } from 'recharts'
import { formatBytes, formatTooltipTime } from '@/lib/formatters'
import type { DockerService, ServiceHistoryPoint } from '@/types/dashboard'

interface Props {
    service: DockerService
    historyData: ServiceHistoryPoint[]
    pointCount?: number
}

const TOOLTIP_STYLE = {
    backgroundColor: 'var(--layer-1)',
    border: '1px solid var(--stroke-1)',
    borderRadius: 8,
    fontSize: 12,
}
const LABEL_STYLE = { color: 'var(--text-2)', marginBottom: 6, fontSize: 11, fontFamily: 'monospace' }

export function ServiceCard({ service, historyData, pointCount = 10 }: Props) {
    const isHighLoad = service.info.cpu.percent > 70
    const limited = historyData.slice(-pointCount)

    return (
        <div style={{
            background: 'var(--layer-1)',
            border: '1px solid var(--stroke-1)',
            borderRadius: 'var(--radius-2)',
            padding: 16,
            boxShadow: 'var(--shadow-1)',
            display: 'flex',
            flexDirection: 'column',
            height: 256,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <Link
                    to={`/service/overview?name=${encodeURIComponent(service.name)}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}
                >
                    <Box size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    {service.name}
                </Link>
                <StatusBadge highLoad={isHighLoad} />
            </div>

            {/* Detail lines */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{service.containers} containers</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{formatBytes(service.info.ram.used)} RAM</span>
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={limited}>
                        <defs>
                            <linearGradient id="svcCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="svcRam" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-1)" vertical={false} />
                        <XAxis dataKey="time" domain={['dataMin', 'dataMax']} type="number" hide />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            labelStyle={LABEL_STYLE}
                            itemStyle={{ padding: 0, fontWeight: 500 }}
                            labelFormatter={(v) => formatTooltipTime(v)}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(val: any, name: any) => {
                                if (val == null) return ['', name === 'cpu' ? 'CPU' : 'RAM']
                                return [`${Number(val).toFixed(1)}%`, name === 'cpu' ? 'CPU' : 'RAM']
                            }}
                        />
                        <Area type="monotone" dataKey="ramPercent" stroke="#10b981" strokeWidth={2.5}
                            fill="url(#svcRam)" isAnimationActive={false}
                            dot={{ r: 2, fill: 'var(--layer-1)', stroke: '#10b981', strokeWidth: 1.5 }}
                            activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2.5}
                            fill="url(#svcCpu)" isAnimationActive={false}
                            dot={{ r: 2, fill: 'var(--layer-1)', stroke: '#3b82f6', strokeWidth: 1.5 }}
                            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'monospace', color: '#3b82f6' }}>
                    <span style={{ width: 8, height: 2, background: '#3b82f6', display: 'inline-block', borderRadius: 1 }} />
                    CPU {service.info.cpu.percent.toFixed(1)}%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'monospace', color: '#10b981' }}>
                    <span style={{ width: 8, height: 2, background: '#10b981', display: 'inline-block', borderRadius: 1 }} />
                    RAM {service.info.ram.percent.toFixed(1)}%
                </span>
            </div>
        </div>
    )
}

export function StatusBadge({ highLoad, paused }: { highLoad?: boolean; paused?: boolean }) {
    if (paused) return (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
            PAUSED
        </span>
    )
    return highLoad ? (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            HIGH LOAD
        </span>
    ) : (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            OK
        </span>
    )
}
