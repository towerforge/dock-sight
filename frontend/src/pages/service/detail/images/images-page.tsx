import { useSearchParams } from 'react-router-dom'
import { Page } from '@/components/ui'
import { ImagesTab } from '@/pages/service/detail/images/images-tab'

export default function ImagesPage() {
    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') ?? ''

    return (
        <Page maxWidth="full" size={2}>
            <ImagesTab serviceName={name} />
        </Page>
    )
}
