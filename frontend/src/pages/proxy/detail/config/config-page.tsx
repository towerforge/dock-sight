import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Page, Table, Button, Modal, Spinner } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiUpdateProxyHost } from '@/services/proxy'
import { useProxyHost } from '../overview/overview-page'

// ── Shared helpers ────────────────────────────────────────────────────────────

type KVRow = { id: string; label: string; value: React.ReactNode }

const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.label}</span> },
    { key: 'value', header: 'Value', render: r => r.value },
]

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{children}</p>
            {action}
        </div>
    )
}

const PLACEHOLDER = '# Examples:\nclient_max_body_size 50m;\nproxy_read_timeout 120s;\nproxy_set_header X-Custom-Header "value";'

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditConfigModalProps {
    id:       string
    domain:   string
    initial:  string
    onClose:  () => void
    onSaved:  (config: string) => void
}

function EditConfigModal({ id, domain, initial, onClose, onSaved }: EditConfigModalProps) {
    const [config,    setConfig]    = useState(initial)
    const [saving,    setSaving]    = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const handleSave = async () => {
        setSaving(true); setSaveError(null)
        try {
            await apiUpdateProxyHost(id, { custom_config: config })
            onSaved(config)
        } catch (err: any) {
            setSaveError(err?.response?.data?.error ?? err?.message ?? 'Failed to save')
        } finally { setSaving(false) }
    }

    return (
        <Modal open onClose={onClose} title="Edit custom config">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 480 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
                    Raw nginx directives injected inside the <code style={{ fontFamily: 'monospace', fontSize: 12 }}>location /</code> block for <strong>{domain}</strong>.
                </p>
                <textarea
                    value={config}
                    onChange={e => setConfig(e.target.value)}
                    placeholder={PLACEHOLDER}
                    rows={16}
                    spellCheck={false}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
                        borderRadius: 'var(--radius-1)', padding: '10px 12px',
                        fontSize: 13, fontFamily: 'monospace', color: 'var(--text-1)',
                        lineHeight: 1.7, resize: 'vertical', outline: 'none',
                    }}
                />
                {saveError && <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace' }}>{saveError}</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant={2} onClick={onClose}>Cancel</Button>
                    <Button variant={1} loading={saving} onClick={handleSave}>Save changes</Button>
                </div>
            </div>
        </Modal>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProxyConfigPage() {
    const [searchParams] = useSearchParams()
    const id             = searchParams.get('id') ?? ''

    const { host, loading, setHost } = useProxyHost(id)
    const [editOpen, setEditOpen]    = useState(false)

    if (loading) return <Page><Spinner /></Page>
    if (!host)   return <Page><p style={{ color: 'var(--text-3)', fontSize: 14 }}>Proxy host not found.</p></Page>

    const config = host.custom_config ?? ''

    const rows: KVRow[] = [
        {
            id: 'config',
            label: 'Directives',
            value: config
                ? <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{config}</pre>
                : <span style={{ fontSize: 13, color: 'var(--text-3)' }}>—</span>,
        },
    ]

    return (
        <Page>
            <SectionTitle action={
                <Button variant={2} size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil size={12} /> Edit
                </Button>
            }>
                Custom config
            </SectionTitle>
            <Table columns={kvCols} data={rows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} />

            {editOpen && (
                <EditConfigModal
                    id={id}
                    domain={host.domain}
                    initial={config}
                    onClose={() => setEditOpen(false)}
                    onSaved={updated => { setHost(h => h ? { ...h, custom_config: updated } : h); setEditOpen(false) }}
                />
            )}
        </Page>
    )
}
