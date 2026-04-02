import { useSearchParams } from 'react-router-dom'
import { Page } from '@/components/ui'
import { ContainersTab } from '@/components/service/ContainersTab'

export default function ContainersPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <Page maxWidth="full" size={2}>
            <ContainersTab serviceName={name} />
        </Page>
    )
}
