import type React from 'react'
import type { LucideIcon } from 'lucide-react'
import type { SysHistoryPoint } from '@/types/dashboard'
import { ChartCard } from '@/components/dashboard/chart-card'

type DataKey = 'cpu' | 'ram' | 'disk' | 'network'

interface Props {
    label: string
    Icon: LucideIcon
    colorHex: string
    colorId: string
    dataKey: DataKey
    mainValue: React.ReactNode
    data: SysHistoryPoint[]
    pointCount?: number
}

export function MetricCard({ label, Icon, colorHex, colorId, dataKey, mainValue, data, pointCount = 10 }: Props) {
    return (
        <ChartCard
            label={label}
            labelRight={mainValue}
            Icon={Icon}
            colorHex={colorHex}
            colorId={colorId}
            dataKey={dataKey}
            data={data}
            pointCount={pointCount}
        />
    )
}
