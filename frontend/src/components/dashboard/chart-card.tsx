import type React from 'react'
import type { LucideIcon } from 'lucide-react'
import type { SysHistoryPoint } from '@/types/dashboard'
import { Card } from '@/components/ui/card'
import { MiniSysChart } from './mini-sys-chart'

type DataKey = 'cpu' | 'ram' | 'disk' | 'network'

interface Props {
    label: React.ReactNode
    labelRight: React.ReactNode
    Icon?: LucideIcon
    colorHex: string
    colorId: string
    dataKey: DataKey
    data: SysHistoryPoint[]
    pointCount?: number
    height?: number | string
}

export function ChartCard({ label, labelRight, Icon, colorHex, colorId, dataKey, data, pointCount = 10, height }: Props) {
    return (
        <Card variant="outlined" style={{ padding: 16, display: 'flex', flexDirection: 'column', ...(height ? { height } : {}) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, color: 'var(--text-1)', fontWeight: 600 }}>
                    {Icon && <Icon size={16} style={{ color: colorHex }} />}
                    {label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {labelRight}
                </span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
                <MiniSysChart data={data} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
            </div>
        </Card>
    )
}
