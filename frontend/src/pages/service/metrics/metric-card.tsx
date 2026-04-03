import type { LucideIcon } from 'lucide-react'
import type { SysHistoryPoint } from '@/types/dashboard'
import { MiniSysChart } from '@/components/dashboard/mini-sys-chart'

type DataKey = 'cpu' | 'ram' | 'disk' | 'network'

interface Props {
    label: string
    Icon: LucideIcon
    colorHex: string
    colorId: string
    dataKey: DataKey
    mainValue: string
    lines?: string[]
    data: SysHistoryPoint[]
    pointCount?: number
}

export function MetricCard({ label, Icon, colorHex, colorId, dataKey, mainValue, lines, data, pointCount = 10 }: Props) {
    return (
        <div style={{
            padding: 16,
            borderRadius: 'var(--radius-2)',
            background: 'var(--layer-1)',
            border: '1px solid var(--stroke-1)',
            boxShadow: 'var(--shadow-1)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, color: 'var(--text-1)', fontWeight: 600 }}>
                    <Icon size={16} style={{ color: colorHex }} />{label}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                    {mainValue}
                </span>
            </div>
            {lines && lines.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    {lines.map((line, i) => (
                        <span key={i} style={{ fontSize: 12, color: i === 0 ? 'var(--text-2)' : 'var(--text-3)', fontFamily: 'monospace' }}>{line}</span>
                    ))}
                </div>
            )}
            <MiniSysChart data={data} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
        </div>
    )
}
