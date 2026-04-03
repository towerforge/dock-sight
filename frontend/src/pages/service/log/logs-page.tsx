import { useSearchParams } from 'react-router-dom'
import { Page } from '@/components/ui'
import { LogsTab } from '@/pages/service/log/logs-tab'

export default function LogsPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <Page maxWidth="full" size={2}>
            <div style={{ height: 'calc(100vh - 120px)' }}>
                <LogsTab serviceName={name} />
            </div>
        </Page>
    )
}
