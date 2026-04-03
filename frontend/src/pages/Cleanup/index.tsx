import { Page } from '@/components/ui'
import { CleanupTab } from '@/pages/cleanup/cleanup-tab'

export default function Cleanup() {
    return (
        <Page maxWidth="full" size={2}>
            <CleanupTab />
        </Page>
    )
}
