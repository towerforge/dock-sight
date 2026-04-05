import { Link } from 'react-router-dom'
import { formatBytes } from '@/lib/formatters'
import type { DockerService, ServiceHistoryPoint } from '@/types/dashboard'
import { ChartCard } from '@/components/dashboard/chart-card'

export type ChartMode = 'cpu' | 'ram' | 'network'

interface Props {
    service: DockerService
    historyData: ServiceHistoryPoint[]
    pointCount?: number
    chartMode?: ChartMode
    showType?: boolean
}

export function ServiceCard({ service, historyData, pointCount = 10, chartMode = 'cpu', showType = false }: Props) {
    const isHighLoad = service.info.cpu.percent > 70

    const chartData = historyData.slice(-pointCount).map(p => ({
        time:      p.time,
        cpu:       p.cpu,
        ram:       p.ramPercent,
        disk:      0,
        networkRx: p.networkRx ?? 0,
        networkTx: p.networkTx ?? 0,
    }))

    const color   = chartMode === 'cpu' ? '#3b82f6' : chartMode === 'ram' ? '#10b981' : '#8b5cf6'
    const colorId = chartMode === 'cpu' ? 'sc-cpu'  : chartMode === 'ram' ? 'sc-ram'  : 'sc-net'

    const label = showType
        ? <span style={{ fontSize: 15, fontWeight: 600, color }}>
            {chartMode === 'cpu' ? 'CPU' : chartMode === 'ram' ? 'RAM' : 'Network'}
          </span>
        : <Link
            to={`/service/overview?name=${encodeURIComponent(service.name)}`}
            style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}
          >
            {service.name}
          </Link>

    const labelRight = chartMode === 'cpu' ? (
        <span style={{ fontFamily: 'monospace', color: isHighLoad ? '#ef4444' : '#3b82f6' }}>
            {service.info.cpu.percent.toFixed(1)}%
        </span>
    ) : chartMode === 'ram' ? (
        <span style={{ fontFamily: 'monospace' }}>
            <span style={{ color: '#10b981' }}>{formatBytes(service.info.ram.used)}</span>
            <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>·</span>
            <span style={{ color: '#10b981' }}>{service.info.ram.percent.toFixed(1)}%</span>
        </span>
    ) : (
        <span style={{ fontFamily: 'monospace' }}>
            <span style={{ color: '#8b5cf6' }}>↓ {formatBytes(service.info.net.rx)}/s</span>
            <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>·</span>
            <span style={{ color: '#a78bfa' }}>↑ {formatBytes(service.info.net.tx)}/s</span>
        </span>
    )

    return (
        <ChartCard
            label={label}
            labelRight={labelRight}
            colorHex={color}
            colorId={colorId}
            dataKey={chartMode}
            data={chartData}
            pointCount={pointCount}
            height={220}
        />
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
