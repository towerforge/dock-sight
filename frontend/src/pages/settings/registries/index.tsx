import { useState, useEffect, useCallback } from 'react'
import { Button, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiListRegistries, apiDeleteRegistry } from '@/services/api'
import type { Registry } from '@/services/api'
import { AddRegistryModal } from './add-modal'
import { PackageCheck, Plus, Trash2 } from 'lucide-react'

const COLUMNS: Column<Registry>[] = [
    {
        key: 'name',
        header: 'Name',
        render: r => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PackageCheck size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{r.name}</span>
            </span>
        ),
    },
    {
        key: 'provider',
        header: 'Provider',
        shrink: true,
        render: () => <span style={{ color: 'var(--text-2)' }}>DockerHub</span>,
    },
    {
        key: 'username',
        header: 'Username',
        shrink: true,
        render: r => <span style={{ color: 'var(--text-2)' }}>{r.username}</span>,
    },
    {
        key: 'token',
        header: 'Token',
        shrink: true,
        render: r => <span style={{ fontFamily: 'monospace', color: 'var(--text-3)' }}>{r.token_hint}</span>,
    },
    {
        key: 'actions',
        header: '',
        shrink: true,
        render: () => null, // replaced per-row below via onRowClick workaround — see RegistriesTable
    },
]

export default function RegistriesPage() {
    const [registries, setRegistries] = useState<Registry[]>([])
    const [modalOpen, setModalOpen]   = useState(false)
    const [deleting, setDeleting]     = useState<string | null>(null)

    const load = useCallback(async () => {
        try { setRegistries(await apiListRegistries()) } catch {}
    }, [])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        setDeleting(id)
        try { await apiDeleteRegistry(id); await load() }
        catch {} finally { setDeleting(null) }
    }

    const columns: Column<Registry>[] = [
        ...COLUMNS.slice(0, 4),
        {
            key: 'actions',
            header: '',
            shrink: true,
            render: r => (
                <Button
                    variant={4}
                    size="sm"
                    loading={deleting === r.id}
                    onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                    title="Remove registry"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                    <Trash2 size={13} />
                </Button>
            ),
        },
    ]

    return (
        <>
            <AddRegistryModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onAdded={() => { setModalOpen(false); load() }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Registries</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
                        Manage credentials for private container registries.
                    </p>
                </div>
                <Button variant={1} onClick={() => setModalOpen(true)}>
                    <Plus size={14} style={{ marginRight: 4 }} />
                    Add registry
                </Button>
            </div>

            <Table
                columns={columns}
                data={registries}
                keyExtractor={r => r.id}
                emptyMessage="No registries configured yet."
            />
        </>
    )
}
