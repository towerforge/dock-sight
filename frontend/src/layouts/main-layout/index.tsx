import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { PanelRight, Server, Trash2, FlaskConical, Info, LogOut, Box, Image as ImageIcon, ScrollText, ArrowLeft, BarChart2 } from 'lucide-react'
import { CircuitBoard, HardDrive, Activity } from 'lucide-react'
import { ThemeToggle } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { useAuth } from '@/hooks/use-auth'
import { formatBytes } from '@/lib/formatters'
import { MiniSysChart } from '@/components/dashboard/mini-sys-chart'
import { AboutModal } from '@/components/about-modal'
import styles from './MainLayout.module.css'

const METRICS = [
    { key: 'cpu' as const,  label: 'CPU',     Icon: CircuitBoard, colorHex: '#3b82f6', colorId: 'p-cpu' },
    { key: 'ram' as const,  label: 'RAM',     Icon: CircuitBoard, colorHex: '#10b981', colorId: 'p-ram' },
    { key: 'disk' as const, label: 'Disk',    Icon: HardDrive,    colorHex: '#f59e0b', colorId: 'p-disk' },
    { key: 'net' as const,  label: 'Network', Icon: Activity,     colorHex: '#8b5cf6', colorId: 'p-net' },
] as const

const SERVICE_TABS = [
    { path: 'containers', label: 'Containers', Icon: Box },
    { path: 'images',     label: 'Images',     Icon: ImageIcon },
    { path: 'logs',       label: 'Logs',       Icon: ScrollText },
    { path: 'metrics',    label: 'Metrics',    Icon: BarChart2 },
] as const

function ServiceBrand({ onBack }: { onBack: () => void }) {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                onClick={onBack}
                title="Back to services"
                aria-label="Back to services"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-2)', padding: '4px', borderRadius: 'var(--radius-1)',
                    transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >
                <ArrowLeft size={15} />
            </button>
            <span className={styles.brand}>{name || 'Service'}</span>
        </div>
    )
}

function ServiceNav() {
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const name = searchParams.get('name') ?? ''

    return (
        <>
            {SERVICE_TABS.map(({ path, label, Icon }) => {
                const to = `/service/${path}?name=${encodeURIComponent(name)}`
                const isActive = location.pathname === `/service/${path}`
                return (
                    <NavLink
                        key={path}
                        to={to}
                        className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                    >
                        <Icon size={15} />{label}
                    </NavLink>
                )
            })}
        </>
    )
}


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
    const location = useLocation()
    const isService = location.pathname.startsWith('/service')

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <>
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
            <div className={styles.topbar}>
                {isService
                    ? <ServiceBrand onBack={() => navigate('/')} />
                    : <span className={styles.brand}>Dock Sight</span>
                }
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
                {isService ? <ServiceNav /> : (
                    <>
                        <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                            <Server size={15} />Services
                        </NavLink>
                        <NavLink to="/metrics" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                            <BarChart2 size={15} />Metrics
                        </NavLink>
                        <NavLink to="/cleanup" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                            <Trash2 size={15} />Cleanup
                        </NavLink>
                        {import.meta.env.DEV && (
                            <NavLink to="/_dev" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                                <FlaskConical size={15} />Dev
                            </NavLink>
                        )}
                    </>
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
