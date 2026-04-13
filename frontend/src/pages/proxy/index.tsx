import { useSearchParams, Outlet } from 'react-router-dom'
import { Page } from '@/components/ui'

export default function ProxyDetailLayout() {
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id') ?? ''

    if (!id) return (
        <Page><p style={{ color: 'var(--text-3)', fontSize: 14 }}>No proxy host selected.</p></Page>
    )

    return <Outlet />
}
