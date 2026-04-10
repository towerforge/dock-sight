import { useSearchParams } from 'react-router-dom'
import { Page } from '@/components/ui'
import { ContainersTab } from '@/pages/service/detail/containers/containers-tab'

export default function ContainersPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <Page maxWidth="full" size={2}>
            <ContainersTab serviceName={name} />
        </Page>
    )
}
