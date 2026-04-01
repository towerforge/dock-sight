import { NavLink, Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/service">Service</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}
