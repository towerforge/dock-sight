import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { PanelRight, Server, Trash2, FlaskConical, Box, Image as ImageIcon, FileArchive, ArrowLeft, BarChart2, LayoutDashboard, Settings, LogOut, Info, HardDrive, Activity, Globe } from 'lucide-react'
import { ThemeToggle } from '@/components/ui'
import { useAuth } from '@/hooks/use-auth'
import { AboutModal } from '@/components/about-modal'
import { SystemPanel } from './system-panel'
import styles from './MainLayout.module.css'

type Section = 'main' | 'service' | 'network' | 'volume' | 'proxy'

interface NavItem { to: string; label: string; Icon: React.ElementType; end?: boolean; dev?: boolean; separator?: boolean }

const MAIN_NAV: NavItem[] = [
    { to: '/',          label: 'Services',  Icon: Server,       end: true              },
    { to: '/network',   label: 'Network',   Icon: Activity,     end: true              },
    { to: '/volumes',   label: 'Volumes',   Icon: HardDrive                            },
    { to: '/metrics',   label: 'Metrics',   Icon: BarChart2,    separator: true        },
    { to: '/proxy',     label: 'Proxy',     Icon: Globe                                },
    { to: '/cleanup',   label: 'Cleanup',   Icon: Trash2,       separator: true        },
    { to: '/_dev',      label: 'Dev',       Icon: FlaskConical, dev: true, separator: true },
]

const SERVICE_NAV = [
    { path: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
    { path: 'containers', label: 'Containers', Icon: Box             },
    { path: 'images',     label: 'Images',     Icon: ImageIcon       },
    { path: 'logs',       label: 'Logs',       Icon: FileArchive      },
    { path: 'metrics',    label: 'Metrics',    Icon: BarChart2       },
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
                    transition: 'color 0.15s', fontSize: 18,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >
                <ArrowLeft size={18} /> <span style={{ paddingLeft: 5 }}>service</span>
            </button>
            <span style={{ paddingRight: 5, fontWeight: 100, color: 'var(--text-2)' }}>/</span> <span className={styles.brand}>{name || 'Service'}</span>
        </div>
    )
}

function MainNav() {
    return (
        <>
            {MAIN_NAV.filter(item => !item.dev || import.meta.env.DEV).map(({ to, label, Icon, end, separator }) => (
                <span key={to} className={styles.navItem}>
                    {separator && <span className={styles.navDivider} />}
                    <NavLink to={to} end={end} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                        <Icon size={15} />{label}
                    </NavLink>
                </span>
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

const NETWORK_NAV = [
    { path: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { path: 'services', label: 'Services', Icon: Server          },
] as const

const VOLUME_NAV = [
    { path: 'overview', label: 'Overview', Icon: LayoutDashboard },
] as const

const PROXY_NAV = [
    { path: 'overview', label: 'Overview',      Icon: LayoutDashboard },
    { path: 'config',   label: 'Custom config', Icon: FileArchive      },
] as const

function ProxyNav() {
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const id     = searchParams.get('id')     ?? ''
    const domain = searchParams.get('domain') ?? ''

    return (
        <>
            {PROXY_NAV.map(({ path, label, Icon }) => {
                const to       = `/proxy/${path}?id=${encodeURIComponent(id)}&domain=${encodeURIComponent(domain)}`
                const isActive = location.pathname === `/proxy/${path}`
                return (
                    <NavLink key={path} to={to} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                        <Icon size={15} />{label}
                    </NavLink>
                )
            })}
        </>
    )
}

function NetworkBrand({ onBack }: { onBack: () => void }) {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                onClick={onBack}
                title="Back to networks"
                aria-label="Back to networks"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-2)', padding: '4px', borderRadius: 'var(--radius-1)',
                    transition: 'color 0.15s', fontSize: 18,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >
                <ArrowLeft size={18} /> <span style={{ paddingLeft: 5 }}>network</span>
            </button>
            <span style={{ paddingRight: 5, fontWeight: 100, color: 'var(--text-2)' }}>/</span> <span className={styles.brand}>{name || 'Network'}</span>
        </div>
    )
}

function NetworkNav() {
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const name = searchParams.get('name') ?? ''

    return (
        <>
            {NETWORK_NAV.map(({ path, label, Icon }) => {
                const to = `/network/${path}?name=${encodeURIComponent(name)}`
                const isActive = location.pathname === `/network/${path}`
                return (
                    <NavLink key={path} to={to} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                        <Icon size={15} />{label}
                    </NavLink>
                )
            })}
        </>
    )
}


function VolumeBrand({ onBack }: { onBack: () => void }) {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                onClick={onBack}
                title="Back to volumes"
                aria-label="Back to volumes"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-2)', padding: '4px', borderRadius: 'var(--radius-1)',
                    transition: 'color 0.15s', fontSize: 18,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >
                <ArrowLeft size={18} /> <span style={{ paddingLeft: 5 }}>volume</span>
            </button>
            <span style={{ paddingRight: 5, fontWeight: 100, color: 'var(--text-2)' }}>/</span> <span className={styles.brand}>{name || 'Volume'}</span>
        </div>
    )
}

function VolumeNav() {
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const name = searchParams.get('name') ?? ''

    return (
        <>
            {VOLUME_NAV.map(({ path, label, Icon }) => {
                const to = `/volumes/${path}?name=${encodeURIComponent(name)}`
                const isActive = location.pathname === `/volumes/${path}`
                return (
                    <NavLink key={path} to={to} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                        <Icon size={15} />{label}
                    </NavLink>
                )
            })}
        </>
    )
}

function UserMenu({ username, onLogout, onAbout }: { username: string; onLogout: () => void; onAbout: () => void }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const initial = username ? username[0].toUpperCase() : '?'

    return (
        <div className={styles.userMenuRoot} ref={rootRef}>
            <button className={styles.userAvatar} onClick={() => setOpen(o => !o)} aria-label="User menu">
                {initial}
            </button>
            {open && (
                <div className={styles.userDropdown}>
                    <div className={styles.userDropdownHeader}>
                        <span className={styles.userDropdownName}>{username}</span>
                    </div>
                    <Link
                        to="/settings"
                        className={styles.userDropdownItem}
                        onClick={() => setOpen(false)}
                    >
                        <Settings size={14} /> Settings
                    </Link>
                    <button className={styles.userDropdownItem} onClick={() => { setOpen(false); onAbout() }}>
                        <Info size={14} /> About
                    </button>
                    <div className={styles.userDropdownDivider} />
                    <button className={styles.userDropdownItem} onClick={() => { setOpen(false); onLogout() }}>
                        <LogOut size={14} /> Sign out
                    </button>
                </div>
            )}
        </div>
    )
}


function ProxyBrand({ onBack }: { onBack: () => void }) {
    const [searchParams] = useSearchParams()
    const domain = searchParams.get('domain') ?? ''

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                onClick={onBack}
                title="Back to proxy"
                aria-label="Back to proxy"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-2)', padding: '4px', borderRadius: 'var(--radius-1)',
                    transition: 'color 0.15s', fontSize: 18,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >
                <ArrowLeft size={18} /> <span style={{ paddingLeft: 5 }}>proxy</span>
            </button>
            <span style={{ paddingRight: 5, fontWeight: 100, color: 'var(--text-2)' }}>/</span>
            <span className={styles.brand}>{domain || 'Host'}</span>
        </div>
    )
}

const SECTION_NAV: Record<Section, React.ComponentType> = {
    main:    MainNav,
    service: ServiceNav,
    network: NetworkNav,
    volume:  VolumeNav,
    proxy:   ProxyNav,
}

const SECTION_BRAND: Record<Section, React.ComponentType<{ onBack: () => void }>> = {
    main:    () => <span className={styles.brand}>Dock Sight</span>,
    service: ({ onBack }) => <ServiceBrand onBack={onBack} />,
    network: ({ onBack }) => <NetworkBrand onBack={onBack} />,
    volume:  ({ onBack }) => <VolumeBrand  onBack={onBack} />,
    proxy:   ({ onBack }) => <ProxyBrand   onBack={onBack} />,
}

export default function MainLayout() {
    const [panelOpen, setPanelOpen] = useState(true)
    const [aboutOpen, setAboutOpen] = useState(false)
    const { status, username, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const section: Section =
        location.pathname.startsWith('/service') ? 'service' :
        location.pathname.startsWith('/network') && location.pathname !== '/network' ? 'network' :
        location.pathname.startsWith('/volumes') && location.pathname !== '/volumes' ? 'volume' :
        location.pathname.startsWith('/proxy')   && location.pathname !== '/proxy'   ? 'proxy'   : 'main'

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const Brand  = SECTION_BRAND[section]
    const Nav    = SECTION_NAV[section]
    const onBack =
        section === 'network' ? () => navigate('/network') :
        section === 'volume'  ? () => navigate('/volumes') :
        section === 'proxy'   ? () => navigate('/proxy')   :
        () => navigate('/')

    return (
        <>
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
            <div className={styles.topbar}>
                <Brand onBack={onBack} />
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
                    {status?.authenticated && (
                        <UserMenu
                            username={username}
                            onLogout={handleLogout}
                            onAbout={() => setAboutOpen(true)}
                        />
                    )}
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
