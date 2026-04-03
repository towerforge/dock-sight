import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts'
import { formatTooltipTime, formatBytes } from '@/lib/formatters'
import type { SysHistoryPoint } from '@/types/dashboard'

type DataKey = 'cpu' | 'ram' | 'disk' | 'network'

interface Props {
    data: SysHistoryPoint[]
    dataKey: DataKey
    colorHex: string
    colorId: string
    pointCount?: number
}

const TOOLTIP_STYLE = {
    backgroundColor: 'var(--layer-1)',
    border: '1px solid var(--stroke-1)',
    color: 'var(--text-1)',
    fontSize: 12,
    borderRadius: 6,
}
const LABEL_STYLE = { color: 'var(--text-2)', marginBottom: 4, fontSize: 11, fontWeight: 600 }

export function MiniSysChart({ data, dataKey, colorHex, colorId, pointCount = 10 }: Props) {
    const isNetwork = dataKey === 'network'
    const faded = `${colorHex}99`
    const limited = data.slice(0, pointCount)

    const chartData = isNetwork
        ? limited.map(p => ({ ...p, networkRx: p.networkRx ? -Math.abs(p.networkRx) : 0, networkTx: p.networkTx ? Math.abs(p.networkTx) : 0 }))
        : limited

    return (
        <div style={{ height: 128, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`grad-${colorId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={colorHex} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={colorHex} stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id={`grad-${colorId}-tx`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={faded} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={faded} stopOpacity={0.7} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="time" domain={['dataMin', 'dataMax']} type="number" hide />
                    <YAxis domain={isNetwork ? undefined : [0, 'auto']} hide />
                    <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={LABEL_STYLE}
                        labelFormatter={(v) => formatTooltipTime(v)}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => {
                            const n = typeof value === 'number' ? value : parseFloat(value)
                            if (isNaN(n)) return ['']
                            if (isNetwork) return [formatBytes(Math.abs(n))]
                            return [`${n.toFixed(1)}%`]
                        }}
                    />
                    {isNetwork ? (
                        <>
                            <Area type="monotone" dataKey="networkRx" name="Download" stroke={faded} strokeWidth={2}
                                fill={`url(#grad-${colorId})`} isAnimationActive={false}
                                dot={{ r: 2.5, fill: 'var(--layer-1)', stroke: faded, strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: faded, stroke: '#fff', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="networkTx" name="Upload" stroke={colorHex} strokeWidth={2}
                                fill={`url(#grad-${colorId}-tx)`} isAnimationActive={false}
                                dot={{ r: 2.5, fill: 'var(--layer-1)', stroke: colorHex, strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: colorHex, stroke: '#fff', strokeWidth: 2 }} />
                        </>
                    ) : (
                        <Area type="monotone" dataKey={dataKey} stroke={colorHex} strokeWidth={3}
                            fill={`url(#grad-${colorId})`} isAnimationActive={false}
                            dot={{ r: 2.5, fill: 'var(--layer-1)', stroke: colorHex, strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: colorHex, stroke: '#fff', strokeWidth: 2 }} />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
