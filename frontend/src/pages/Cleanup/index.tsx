import { Page } from '@/components/ui'
import { CleanupTab } from '@/components/dashboard/CleanupTab'

export default function Cleanup() {
    return (
        <Page maxWidth="full" size={2}>
            <CleanupTab />
        </Page>
    )
}
