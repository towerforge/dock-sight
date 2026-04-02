import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PanelRight, Server, Trash2, FlaskConical, Info, LogOut } from 'lucide-react'
import { Cpu, CircuitBoard, HardDrive, Activity } from 'lucide-react'
import { ThemeToggle } from '@/components/ui'
import { useDashboard } from '@/context/DashboardContext'
import { useAuth } from '@/hooks/useAuth'
import { formatBytes } from '@/lib/formatters'
import { MiniSysChart } from '@/components/dashboard/MiniSysChart'
import { AboutModal } from '@/components/AboutModal'
import styles from './MainLayout.module.css'

const METRICS = [
    { key: 'cpu' as const,  label: 'CPU',     Icon: Cpu,          colorHex: '#3b82f6', colorId: 'p-cpu' },
    { key: 'ram' as const,  label: 'RAM',     Icon: CircuitBoard, colorHex: '#10b981', colorId: 'p-ram' },
    { key: 'disk' as const, label: 'Disk',    Icon: HardDrive,    colorHex: '#f59e0b', colorId: 'p-disk' },
    { key: 'net' as const,  label: 'Network', Icon: Activity,     colorHex: '#8b5cf6', colorId: 'p-net' },
] as const

function SystemPanel() {
    const { sys, sysHistory, pointCount } = useDashboard()

    const totalNet   = (sys?.network?.total_rx ?? 0) + (sys?.network?.total_tx ?? 0)
    const netLimit   = sys?.network?.max_limit ?? 125000000
    const netPercent = Math.min((totalNet / netLimit) * 100, 100)

    const values = {
        cpu:  { percent: sys?.cpu.percent ?? 0,  sub: `${sys?.cpu.active ?? 0}/${sys?.cpu.total ?? 0} cores` },
        ram:  { percent: sys?.ram.percent ?? 0,  sub: `${formatBytes(sys?.ram.used ?? 0)} / ${formatBytes(sys?.ram.total ?? 0)}` },
        disk: { percent: sys?.disk.percent ?? 0, sub: `${formatBytes(sys?.disk.used ?? 0)} / ${formatBytes(sys?.disk.total ?? 0)}` },
        net:  { percent: netPercent,              sub: `↓${formatBytes(sys?.network?.total_rx ?? 0)}/s ↑${formatBytes(sys?.network?.total_tx ?? 0)}/s` },
    }

    return (
        <aside className={styles.panel}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>System</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {METRICS.map(({ key, label, Icon, colorHex, colorId }) => {
                    const dataKey = key === 'net' ? 'network' : key
                    const { percent, sub } = values[key]
                    return (
                        <div key={key}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                                    <Icon size={12} style={{ color: colorHex }} />{label}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{percent.toFixed(0)}%</span>
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'var(--fill-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                                <div style={{ width: `${percent}%`, height: '100%', background: colorHex, borderRadius: 99, transition: 'width 0.5s' }} />
                            </div>
                            <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--text-3)' }}>{sub}</p>
                            <MiniSysChart data={sysHistory} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
                        </div>
                    )
                })}
            </div>
        </aside>
    )
}

export default function MainLayout() {
    const [panelOpen, setPanelOpen] = useState(true)
    const [aboutOpen, setAboutOpen] = useState(false)
    const { status, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <>
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
            <div className={styles.topbar}>
                <span className={styles.brand}>Dock Sight</span>
                <div className={styles.topbarEnd}>
                    <div className={styles.toggleRoot}>
                        <button
                            className={`${styles.toggleBtn} ${panelOpen ? styles.toggleActive : ''}`}
                            onClick={() => setPanelOpen(p => !p)}
                            aria-label="Toggle panel"
                            title="Toggle panel"
                        >
                            <PanelRight size={14} />
                        </button>
                    </div>
                    <ThemeToggle />
                    <div className={styles.toggleRoot}>
                        <button className={styles.toggleBtn} onClick={() => setAboutOpen(true)} title="About" aria-label="About">
                            <Info size={14} />
                        </button>
                        {status?.authenticated && (
                            <button className={styles.toggleBtn} onClick={handleLogout} title="Sign out" aria-label="Sign out">
                                <LogOut size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <nav className={styles.nav}>
                <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                    <Server size={15} />Services
                </NavLink>
                <NavLink to="/cleanup" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                    <Trash2 size={15} />Cleanup
                </NavLink>
                {import.meta.env.DEV && (
                    <NavLink to="/_dev" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                        <FlaskConical size={15} />Dev
                    </NavLink>
                )}
            </nav>
            <div className={styles.body}>
                <main className={styles.content}>
                    <Outlet />
                </main>
                {panelOpen && <SystemPanel />}
            </div>
        </>
    )
}
