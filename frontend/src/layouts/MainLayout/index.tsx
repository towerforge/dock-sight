import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui'

export default function MainLayout() {
  return (
    <>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderBottom: '1px solid var(--stroke-1)', background: 'var(--layer-1)', color: 'var(--text-1)' }}>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/service">Service</NavLink>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}
