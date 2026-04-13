import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldOff, ShieldAlert, RefreshCw, Trash2, Pencil } from 'lucide-react'
import { Page, Table, Button, Select, Switch, Modal, Spinner } from '@/components/ui'
import type { Column } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { apiGetProxyHost, apiUpdateProxyHost, apiDeleteProxyHost, apiRequestSsl } from '@/services/proxy'
import type { ProxyHostWithCert, SslMode } from '@/services/proxy'

// ── Shared helpers ────────────────────────────────────────────────────────────

type KVRow = { id: string; label: string; value: React.ReactNode }

const kvCols: Column<KVRow>[] = [
    { key: 'label', header: 'Field', shrink: true, render: r => <span style={{ color: 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.label}</span> },
    { key: 'value', header: 'Value', render: r => r.value },
]

const SSL_OPTIONS = [
    { value: 'none',        label: 'None'          },
    { value: 'letsencrypt', label: "Let's Encrypt" },
    { value: 'self_signed', label: 'Self-signed'   },
]

const SSL_MODE_LABEL: Record<SslMode, string> = {
    none:        'None',
    letsencrypt: "Let's Encrypt",
    self_signed: 'Self-signed',
}

function SslStatus({ host }: { host: ProxyHostWithCert }) {
    if (host.ssl_mode === 'none') return <span style={{ fontSize: 13, color: 'var(--text-3)' }}>—</span>
    const cert = host.certificate
    if (!cert) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}><ShieldAlert size={13} /> {SSL_MODE_LABEL[host.ssl_mode]} · No certificate yet</span>
    const daysLeft = Math.floor((cert.expires_at - Math.floor(Date.now() / 1000)) / 86400)
    if (daysLeft <= 0)  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#dc2626' }}><ShieldOff   size={13} /> {SSL_MODE_LABEL[host.ssl_mode]} · Expired</span>
    if (daysLeft <= 14) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#d97706' }}><ShieldAlert size={13} /> {SSL_MODE_LABEL[host.ssl_mode]} · Expires in {daysLeft} days</span>
    return                     <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#16a34a' }}><ShieldCheck size={13} /> {SSL_MODE_LABEL[host.ssl_mode]} · Valid for {daysLeft} days</span>
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{children}</p>
            {action}
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
    borderRadius: 'var(--radius-1)', padding: '7px 10px',
    fontSize: 13, color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit',
}

// ── Edit config modal ─────────────────────────────────────────────────────────

interface EditConfigModalProps {
    host:    ProxyHostWithCert
    onClose: () => void
    onSaved: (updated: Partial<ProxyHostWithCert>) => void
}

function EditConfigModal({ host, onClose, onSaved }: EditConfigModalProps) {
    const { dock } = useDashboard()

    const [domain,     setDomain]     = useState(host.domain)
    const [targetUrl,  setTargetUrl]  = useState(host.target_url)
    const [sslMode,    setSslMode]    = useState<SslMode>(host.ssl_mode)
    const [forceHttps, setForceHttps] = useState(host.force_https)
    const [saving,     setSaving]     = useState(false)
    const [error,      setError]      = useState<string | null>(null)

    const matchedService = useMemo(() => {
        try { return dock.find(s => s.name === new URL(targetUrl).hostname) ?? null }
        catch { return null }
    }, [targetUrl, dock])

    const handleSave = async () => {
        setSaving(true); setError(null)
        try {
            await apiUpdateProxyHost(host.id, { domain, target_url: targetUrl, ssl_mode: sslMode, force_https: forceHttps })
            onSaved({ domain, target_url: targetUrl, ssl_mode: sslMode, force_https: forceHttps })
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Failed to save')
        } finally { setSaving(false) }
    }

    return (
        <Modal open onClose={onClose} title="Edit configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 380 }}>

                <div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Domain</p>
                    <input style={inputStyle} value={domain} onChange={e => setDomain(e.target.value)} placeholder="app.example.com" />
                </div>

                <div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Target URL</p>
                    <input style={inputStyle} value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="http://service:3000" />
                    {matchedService && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--accent)' }}>
                            Routing to service <strong>{matchedService.name}</strong>
                        </p>
                    )}
                </div>

                <Select
                    label="SSL"
                    options={SSL_OPTIONS}
                    value={sslMode}
                    onChange={e => setSslMode(e.target.value as SslMode)}
                />

                {sslMode !== 'none' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-1)', background: 'var(--fill-1)', border: '1px solid var(--stroke-1)' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Force HTTPS</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Redirect all HTTP traffic to HTTPS</p>
                        </div>
                        <Switch checked={forceHttps} onChange={setForceHttps} />
                    </div>
                )}

                {error && <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace' }}>{error}</p>}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant={2} onClick={onClose}>Cancel</Button>
                    <Button variant={1} loading={saving} onClick={handleSave}>Save changes</Button>
                </div>
            </div>
        </Modal>
    )
}

// ── Hook: load host ───────────────────────────────────────────────────────────

export function useProxyHost(id: string) {
    const [host,    setHost]    = useState<ProxyHostWithCert | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        apiGetProxyHost(id)
            .then(h => { setHost(h); setLoading(false) })
            .catch(() => setLoading(false))
    }, [id])

    return { host, loading, setHost }
}

// ── Overview page ─────────────────────────────────────────────────────────────

export default function ProxyOverviewPage() {
    const [searchParams] = useSearchParams()
    const navigate       = useNavigate()
    const id             = searchParams.get('id') ?? ''

    const { dock }                   = useDashboard()
    const { host, loading, setHost } = useProxyHost(id)
    const [editOpen,    setEditOpen]    = useState(false)
    const [sslLoading,  setSslLoading]  = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleting,    setDeleting]    = useState(false)

    const handleToggleEnabled = async () => {
        if (!host) return
        const next = !host.enabled
        try {
            await apiUpdateProxyHost(id, { enabled: next })
            setHost(h => h ? { ...h, enabled: next } : h)
        } catch { /* silent */ }
    }

    const handleRequestSsl = async () => {
        setSslLoading(true)
        try {
            const cert = await apiRequestSsl(id)
            setHost(h => h ? { ...h, certificate: cert } : h)
        } catch { } finally { setSslLoading(false) }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try { await apiDeleteProxyHost(id); navigate('/proxy') }
        catch { setDeleting(false) }
    }

    if (loading) return <Page><Spinner /></Page>
    if (!host)   return <Page><p style={{ color: 'var(--text-3)', fontSize: 14 }}>Proxy host not found.</p></Page>

    const linkedService = (() => {
        try { return dock.find(s => s.name === new URL(host.target_url).hostname) ?? null }
        catch { return null }
    })()

    const configRows: KVRow[] = [
        { id: 'domain',  label: 'Domain',     value: <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{host.domain}</span> },
        { id: 'service', label: 'Service',    value: linkedService
            ? <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{linkedService.name}</span>
            : <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'monospace' }}>{host.target_url}</span> },
        { id: 'forward', label: 'Forward to', value: <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'monospace' }}>{host.target_url}</span> },
        { id: 'ssl',     label: 'SSL',        value: <SslStatus host={host} /> },
        { id: 'force',   label: 'Force HTTPS', value: <span style={{ fontSize: 13, color: host.force_https ? 'var(--accent)' : 'var(--text-3)' }}>{host.force_https ? 'Yes' : '—'}</span> },
        { id: 'created', label: 'Created',    value: <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{new Date(host.created_at * 1000).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
    ]

    return (
        <Page>
            {/* ── Configuration ── */}
            <div style={{ marginBottom: 24 }}>
                <SectionTitle action={
                    <Button variant={2} size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil size={12} /> Edit
                    </Button>
                }>
                    Configuration
                </SectionTitle>
                <Table columns={kvCols} data={configRows} keyExtractor={r => r.id} rowStyle={() => ({ cursor: 'default' })} />
            </div>

            {/* ── SSL Certificate ── */}
            {host.ssl_mode !== 'none' && (
                <div style={{ borderTop: '1px solid var(--stroke-1)', paddingTop: 24, marginBottom: 24 }}>
                    <SectionTitle>SSL Certificate</SectionTitle>
                    <Table
                        columns={kvCols}
                        keyExtractor={r => r.id}
                        rowStyle={() => ({ cursor: 'default' })}
                        data={[
                            { id: 'cert-status', label: 'Status', value: <SslStatus host={host} /> },
                            ...(host.certificate ? [
                                { id: 'cert-expiry',  label: 'Expires',      value: <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{new Date(host.certificate.expires_at * 1000).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
                                { id: 'cert-renewed', label: 'Last renewed', value: <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{new Date(host.certificate.renewed_at * 1000).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
                            ] : []),
                            {
                                id: 'cert-action', label: 'Action',
                                value: (
                                    <Button variant={2} size="sm" loading={sslLoading} onClick={handleRequestSsl}>
                                        <RefreshCw size={12} /> {host.certificate ? 'Renew certificate' : 'Issue certificate'}
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            {/* ── Power ── */}
            <div style={{ borderTop: '1px solid var(--stroke-1)', paddingTop: 24, marginBottom: 24 }}>
                <Table
                    columns={kvCols}
                    keyExtractor={r => r.id}
                    rowStyle={() => ({ cursor: 'default' })}
                    data={[{
                        id: 'active',
                        label: 'Active',
                        value: (
                            <Switch
                                checked={host.enabled}
                                onChange={handleToggleEnabled}
                                label={host.enabled ? 'Routing enabled' : 'Paused'}
                            />
                        ),
                    }]}
                />
            </div>

            {/* ── Danger zone ── */}
            <div style={{ borderTop: '1px solid var(--stroke-1)', paddingTop: 24 }}>
                <Table
                    columns={kvCols}
                    keyExtractor={r => r.id}
                    rowStyle={() => ({ cursor: 'default' })}
                    data={[{
                        id: 'delete',
                        label: 'Delete host',
                        value: <Button variant={2} size="sm" onClick={() => setConfirmOpen(true)}><Trash2 size={12} /> Delete</Button>,
                    }]}
                />
            </div>

            {/* ── Edit modal ── */}
            {editOpen && (
                <EditConfigModal
                    host={host}
                    onClose={() => setEditOpen(false)}
                    onSaved={updated => { setHost(h => h ? { ...h, ...updated } : h); setEditOpen(false) }}
                />
            )}

            {/* ── Delete confirm ── */}
            <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete proxy host">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        Are you sure you want to delete <strong>{host.domain}</strong>? This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button variant={2} onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button variant={5} loading={deleting} onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </Page>
    )
}
