import { useMemo, useState } from 'react'
import { Page } from '@/components/ui'
import { Grid, Col } from '@/components/ui/grid'
import { useDashboard } from '@/context/dashboard-context'
import NetworkGraph, { buildRows } from './network-graph'
import NetworkTable from './network-table'

export default function NetworkPage() {
    const { dock } = useDashboard()
    const { networks } = useMemo(() => buildRows(dock), [dock])
    const [hoveredNetwork, setHoveredNetwork] = useState<string | null>(null)

    if (dock.length === 0) return (
        <Page>
            <p style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>
                No services
            </p>
        </Page>
    )

    return (
        <Page maxWidth="full" size={2}>
            <Grid gap={32} align="start">
                <Col span={12} lg={7}>
                    <NetworkTable
                        dock={dock}
                        networks={networks}
                        onHover={setHoveredNetwork}
                    />
                </Col>
                <Col span={12} lg={5}>
                    <NetworkGraph dock={dock} hoveredNetwork={hoveredNetwork} />
                </Col>
            </Grid>
        </Page>
    )
}
