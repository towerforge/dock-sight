import { CircuitBoard, HardDrive, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '@/context/dashboard-context'
import { formatBytes } from '@/lib/formatters'
import { MiniSysChart } from '@/components/dashboard/mini-sys-chart'
import styles from './MainLayout.module.css'

const METRICS = [
    { key: 'cpu' as const,  label: 'CPU',     Icon: CircuitBoard, colorHex: '#3b82f6', colorId: 'p-cpu' },
    { key: 'ram' as const,  label: 'RAM',     Icon: CircuitBoard, colorHex: '#10b981', colorId: 'p-ram' },
    { key: 'disk' as const, label: 'Disk',    Icon: HardDrive,    colorHex: '#f59e0b', colorId: 'p-disk' },
    { key: 'net' as const,  label: 'Network', Icon: Activity,     colorHex: '#8b5cf6', colorId: 'p-net' },
] as const

export function SystemPanel() {
    const { sys, sysHistory, pointCount } = useDashboard()

    const totalNet   = (sys?.network?.total_rx ?? 0) + (sys?.network?.total_tx ?? 0)
    const netLimit   = sys?.network?.max_limit ?? 125000000
    const netPercent = Math.min((totalNet / netLimit) * 100, 100)

    const values = {
        cpu:  {
            percent: sys?.cpu.percent ?? 0,
            lines: [`${sys?.cpu.active ?? 0} / ${sys?.cpu.total ?? 0} cores`],
        },
        ram:  {
            percent: sys?.ram.percent ?? 0,
            lines: [
                `${formatBytes(sys?.ram.used ?? 0)} / ${formatBytes(sys?.ram.total ?? 0)}`,
                ...(sys?.ram.free ? [`${formatBytes(sys.ram.free)} free`] : []),
            ],
        },
        disk: {
            percent: sys?.disk.percent ?? 0,
            lines: [
                `${formatBytes(sys?.disk.used ?? 0)} / ${formatBytes(sys?.disk.total ?? 0)}`,
                ...(sys?.disk.free ? [`${formatBytes(sys.disk.free)} free`] : []),
            ],
        },
        net: {
            percent: netPercent,
            lines: [
                `↑ ${formatBytes(sys?.network?.total_tx ?? 0)}/s`,
                `↓ ${formatBytes(sys?.network?.total_rx ?? 0)}/s`,
            ],
        },
    }

    const navigate = useNavigate()

    return (
        <aside className={styles.panel}>
            <p
                onClick={() => navigate('/system')}
                style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
                System ↗
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {METRICS.map(({ key, label, Icon, colorHex, colorId }, i) => {
                    const dataKey = key === 'net' ? 'network' : key
                    const { percent, lines } = values[key]
                    return (
                        <div key={key} style={{ paddingBottom: i === METRICS.length ? 0 : 20, marginBottom: i === METRICS.length ? 0 : 20, borderBottom: '1px solid var(--stroke-1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, color: 'var(--text-1)', fontWeight: 600 }}>
                                    <Icon size={16} style={{ color: colorHex }} />{label}
                                </span>
                                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                                    {percent.toFixed(0)}%
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                {lines.map((line, i) => (
                                    <span key={i} style={{ fontSize: 12, color: i === 0 ? 'var(--text-2)' : 'var(--text-3)', fontFamily: 'monospace' }}>{line}</span>
                                ))}
                            </div>
                            <MiniSysChart data={sysHistory} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
                        </div>
                    )
                })}
            </div>
        </aside>
    )
}
