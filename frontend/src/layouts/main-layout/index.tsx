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

type Section = 'main' | 'service'

interface NavItem { to: string; label: string; Icon: React.ElementType; end?: boolean; dev?: boolean }

const MAIN_NAV: NavItem[] = [
    { to: '/',        label: 'Services', Icon: Server,       end: true  },
    { to: '/metrics', label: 'Metrics',  Icon: BarChart2                },
    { to: '/cleanup', label: 'Cleanup',  Icon: Trash2                   },
    { to: '/_dev',    label: 'Dev',      Icon: FlaskConical, dev: true  },
]

const SERVICE_NAV = [
    { path: 'containers', label: 'Containers', Icon: Box        },
    { path: 'images',     label: 'Images',     Icon: ImageIcon  },
    { path: 'logs',       label: 'Logs',       Icon: ScrollText },
    { path: 'metrics',    label: 'Metrics',    Icon: BarChart2  },
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

function MainNav() {
    return (
        <>
            {MAIN_NAV.filter(item => !item.dev || import.meta.env.DEV).map(({ to, label, Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                    <Icon size={15} />{label}
                </NavLink>
            ))}
        </>
    )
}

function ServiceNav() {
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const name = searchParams.get('name') ?? ''

    return (
        <>
            {SERVICE_NAV.map(({ path, label, Icon }) => {
                const to = `/service/${path}?name=${encodeURIComponent(name)}`
                const isActive = location.pathname === `/service/${path}`
                return (
                    <NavLink key={path} to={to} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
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
                `↓ ${formatBytes(sys?.network?.total_rx ?? 0)}/s`,
                `↑ ${formatBytes(sys?.network?.total_tx ?? 0)}/s`,
            ],
        },
    }

    return (
        <aside className={styles.panel}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>System</p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {METRICS.map(({ key, label, Icon, colorHex, colorId }, i) => {
                    const dataKey = key === 'net' ? 'network' : key
                    const { percent, lines } = values[key]
                    return (
                        <div key={key} style={{ paddingTop: i === 0 ? 0 : 20, marginTop: i === 0 ? 0 : 20, borderTop: i === 0 ? 'none' : '1px solid var(--stroke-1)' }}>
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

const SECTION_NAV: Record<Section, React.ComponentType> = {
    main:    MainNav,
    service: ServiceNav,
}

const SECTION_BRAND: Record<Section, React.ComponentType<{ onBack: () => void }>> = {
    main:    () => <span className={styles.brand}>Dock Sight</span>,
    service: ({ onBack }) => <ServiceBrand onBack={onBack} />,
}

export default function MainLayout() {
    const [panelOpen, setPanelOpen] = useState(true)
    const [aboutOpen, setAboutOpen] = useState(false)
    const { status, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const section: Section = location.pathname.startsWith('/service') ? 'service' : 'main'

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const Brand = SECTION_BRAND[section]
    const Nav   = SECTION_NAV[section]

    return (
        <>
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
            <div className={styles.topbar}>
                <Brand onBack={() => navigate('/')} />
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
                <Nav />
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
