import { useSearchParams, Outlet } from 'react-router-dom'
import { Page } from '@/components/ui'

export default function ServiceLayout() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    if (!name) return (
        <Page><p style={{ color: 'var(--text-3)', fontSize: 14 }}>No service selected.</p></Page>
    )

    return <Outlet />
}
