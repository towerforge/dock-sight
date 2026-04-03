import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

import { useDashboard } from '@/context/dashboard-context'
import { ServiceBar } from '@/pages/home/service-bar'
import { CreateServiceModal } from '@/pages/home/create-service-modal'
import { Input, Button, Page } from '@/components/ui'

export default function Home() {
    const { status: authStatus, loading: authLoading } = useAuth()
    const { dock } = useDashboard()
    const [searchTerm, setSearchTerm] = useState('')
    const [modalOpen, setModalOpen]   = useState(false)

    const filteredDocs = useMemo(() =>
        dock.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [dock, searchTerm]
    )

    if (authLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-3)', fontSize: 14 }}>
            Loading…
        </div>
    )

    if (!authStatus?.authenticated) return <Navigate to="/login" replace />

    return (
        <Page>
            <CreateServiceModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={() => window.location.reload()}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Input
                    placeholder="Search services…"
                    value={searchTerm}
                    onChange={e => setSearchTerm((e.target as HTMLInputElement).value)}
                    style={{ maxWidth: 280 }}
                />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button variant={1} size="md" onClick={() => setModalOpen(true)}>
                        <Plus size={14} /> New service
                    </Button>
                </div>
            </div>
            <ServiceBar items={filteredDocs} />
        </Page>
    )
}
