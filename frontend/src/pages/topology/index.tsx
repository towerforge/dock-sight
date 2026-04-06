import { useMemo, useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button, SearchBar, Page } from '@/components/ui'
import { Grid, Col } from '@/components/ui/grid'
import { useDashboard } from '@/context/dashboard-context'
import { apiListNetworks } from '@/services/api'
import NetworkGraph, { buildRows } from './network-graph'
import NetworkTable from './network-table'
import { CreateNetworkModal } from './create-network-modal'

export default function NetworkPage() {
    const { dock, refresh } = useDashboard()
    const { networks: networksFromServices } = useMemo(() => buildRows(dock), [dock])
    const [hoveredNetwork, setHoveredNetwork] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [apiNetworks, setApiNetworks] = useState<string[]>([])
    const [fetchTick, setFetchTick] = useState(0)

    useEffect(() => {
        apiListNetworks()
            .then(list => setApiNetworks(list.map(n => n.name).filter(Boolean)))
            .catch(() => {})
    }, [fetchTick])

    const allNetworks = useMemo(() => {
        const merged = new Set([...apiNetworks, ...networksFromServices])
        return Array.from(merged).sort()
    }, [apiNetworks, networksFromServices])

    const filteredNetworks = useMemo(() =>
        allNetworks.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    , [allNetworks, search])

    const handleCreated = () => {
        refresh()
        setTimeout(() => setFetchTick(t => t + 1), 500)
    }

    return (
        <Page maxWidth="full" size={2}>
            <CreateNetworkModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={handleCreated}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <SearchBar
                    placeholder="Search networks…"
                    value={search}
                    onChange={setSearch}
                />
                <div style={{ marginLeft: 'auto' }}>
                    <Button variant={1} size="md" onClick={() => setModalOpen(true)}>
                        <Plus size={14} /> New network
                    </Button>
                </div>
            </div>

            <Grid gap={32} align="start">
                <Col span={12} md={5}>
                    <NetworkTable
                        dock={dock}
                        networks={filteredNetworks}
                        allNetworks={allNetworks}
                        onHover={setHoveredNetwork}
                    />
                </Col>
                <Col span={12} md={7}>
                    <NetworkGraph dock={dock} networks={filteredNetworks} allNetworks={allNetworks} hoveredNetwork={hoveredNetwork} />
                </Col>
            </Grid>
        </Page>
    )
}
