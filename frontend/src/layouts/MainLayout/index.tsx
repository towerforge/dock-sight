import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PanelRight, Home, Server, FlaskConical } from 'lucide-react'
import { ThemeToggle } from '@/components/ui'
import styles from './MainLayout.module.css'

function AppPanel() {
    return (
        <aside className={styles.panel}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>Panel</p>
        </aside>
    )
}

export default function MainLayout() {
    const [panelOpen, setPanelOpen] = useState(true)

    return (
        <>
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
                </div>
            </div>
            <nav className={styles.nav}>
                <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}>
                    <Home size={15} />Home
                </NavLink>
                <NavLink to="/service" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}>
                    <Server size={15} />Service
                </NavLink>
                {import.meta.env.DEV && (
                    <NavLink to="/_dev" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}>
                        <FlaskConical size={15} />Dev
                    </NavLink>
                )}
            </nav>
            <div className={styles.body}>
                <main className={styles.content}>
                    <Outlet />
                </main>
                {panelOpen && <AppPanel />}
            </div>
        </>
    )
}
