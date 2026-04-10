import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Page } from '@/components/ui'
import { PackageCheck, ShieldAlert, UserCog, Users } from 'lucide-react'

type SettingsNavItem = {
    to: string
    label: string
    Icon: React.ComponentType<{ size?: number }>
}

type SettingsNavGroup = {
    group: string
    items: SettingsNavItem[]
}

const SETTINGS_NAV: SettingsNavGroup[] = [
    {
        group: 'System',
        items: [
            { to: '/settings/registries', label: 'Registries', Icon: PackageCheck },
        ]
    },
    {
        group: 'Access',
        items: [
            { to: '/settings/users', label: 'Users', Icon: Users },
            { to: '/settings/security', label: 'Security', Icon: ShieldAlert },
        ]
    },
    {
        group: 'Personal',
        items: [
            { to: '/settings/account', label: 'Account', Icon: UserCog },
        ]
    }
]

export default function SettingsLayout() {
    const { status, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                color: 'var(--text-3)',
                fontSize: 14
            }}>
                Loading…
            </div>
        )
    }

    if (!status?.authenticated) {
        return <Navigate to="/login" replace />
    }

    if (location.pathname === '/settings') {
        return <Navigate to="/settings/registries" replace />
    }

    return (
        <Page size={2}>
            <div style={{ display: 'flex', gap: 0 }}>
                
                <aside style={{
                    width: 220,
                    flexShrink: 0,
                    borderRight: '1px solid var(--stroke-1)',
                    paddingRight: 24,
                    marginRight: 32,
                    marginTop: "-15px",
                }}>
                    {SETTINGS_NAV.map(({ group, items }) => (
                        <div key={group} style={{ marginBottom: 16 }}>
                            
                            <p style={{
                                margin: '12px 0 6px',
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--text-3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em'
                            }}>
                                {group}
                            </p>

                            {items.map(({ to, label, Icon }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    style={({ isActive }) => ({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '7px 12px',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                                        background: isActive ? 'var(--fill-2)' : 'transparent',
                                        borderRadius: 'var(--radius-1)',
                                        textDecoration: 'none',
                                        transition: 'background 0.1s, color 0.1s',
                                    })}
                                >
                                    <Icon size={14} />
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </aside>

                <main style={{ flex: 1, minWidth: 0 }}>
                    <Outlet />
                </main>
            </div>
        </Page>
    )
}