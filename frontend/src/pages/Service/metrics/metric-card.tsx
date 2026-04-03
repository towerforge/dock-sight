import type { LucideIcon } from 'lucide-react'
import type { SysHistoryPoint } from '@/types/dashboard'
import { MiniSysChart } from '../../../components/dashboard/mini-sys-chart'

type DataKey = 'cpu' | 'ram' | 'disk' | 'network'

interface Props {
    title: string
    Icon: LucideIcon
    colorHex: string
    colorId: string
    dataKey: DataKey
    percent: number
    mainValue: string | number
    subtitle?: string
    viewMode: 'bars' | 'chart'
    sysHistory: SysHistoryPoint[]
    pointCount?: number
}

export function MetricCard({ title, Icon, colorHex, colorId, dataKey, percent, mainValue, subtitle, viewMode, sysHistory, pointCount = 10 }: Props) {
    return (
        <div style={{
            padding: 12,
            borderRadius: 'var(--radius-2)',
            background: 'var(--layer-1)',
            border: '1px solid var(--stroke-1)',
            boxShadow: 'var(--shadow-1)',
            display: 'flex',
            flexDirection: 'column',
            height: 160,
            overflow: 'hidden',
            position: 'relative',
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                    <Icon size={14} style={{ color: colorHex, flexShrink: 0 }} />
                    {title}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>{mainValue}</div>
                {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
            </div>

            {viewMode === 'bars' ? (
                <div style={{ marginTop: 'auto' }}>
                    <div style={{ width: '100%', background: 'var(--fill-2)', height: 6, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: colorHex, borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                </div>
            ) : (
                <MiniSysChart data={sysHistory} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
            )}
        </div>
    )
}
