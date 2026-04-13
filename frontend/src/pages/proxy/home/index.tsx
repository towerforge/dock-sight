import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Plus, AlertCircle, ShieldCheck, ShieldOff, ShieldAlert, PauseCircle } from 'lucide-react'
import { Page, Table, Button, SearchBar } from '@/components/ui'
import { InlineSelect } from '@/components/ui/inline-select'
import type { Column } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { apiListProxyHosts } from '@/services/proxy'
import type { ProxyHostWithCert, SslMode } from '@/services/proxy'
import { ProxyHostModal } from './proxy-host-modal'

// ── SSL badge ─────────────────────────────────────────────────────────────────

const SSL_MODE_LABEL: Record<SslMode, string> = {
    none:        'None',
    letsencrypt: "Let's Encrypt",
    self_signed: 'Self-signed',
}

function SslBadge({ host }: { host: ProxyHostWithCert }) {
    if (host.ssl_mode === 'none') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
                color: 'var(--text-3)', background: 'var(--fill-2)', borderRadius: 4, padding: '2px 8px' }}>
                <ShieldOff size={11} /> None
            </span>
        )
    }
    const cert = host.certificate
    if (!cert) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
                color: '#6b7280', background: 'rgba(107,114,128,0.1)', borderRadius: 4, padding: '2px 8px' }}>
                <ShieldAlert size={11} /> {SSL_MODE_LABEL[host.ssl_mode]} · Pending
            </span>
        )
    }
    const now      = Math.floor(Date.now() / 1000)
    const daysLeft = Math.floor((cert.expires_at - now) / 86400)
    const expired  = daysLeft <= 0
    const expiring = !expired && daysLeft <= 14

    if (expired)  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.1)',   borderRadius: 4, padding: '2px 8px' }}><ShieldOff   size={11} /> {SSL_MODE_LABEL[host.ssl_mode]} · Expired</span>
    if (expiring) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#d97706', background: 'rgba(217,119,6,0.1)',   borderRadius: 4, padding: '2px 8px' }}><ShieldAlert size={11} /> {SSL_MODE_LABEL[host.ssl_mode]} · {daysLeft}d left</span>
    return              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#16a34a', background: 'rgba(22,163,74,0.1)',   borderRadius: 4, padding: '2px 8px' }}><ShieldCheck size={11} /> {SSL_MODE_LABEL[host.ssl_mode]} · {daysLeft}d</span>
}

// ── Network helper ────────────────────────────────────────────────────────────

function hostNetworks(targetUrl: string, dock: ReturnType<typeof useDashboard>['dock']): string[] {
    try {
        const hostname = new URL(targetUrl).hostname
        return dock.find(s => s.name === hostname)?.networks ?? []
    } catch { return [] }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProxyHome() {
    const navigate       = useNavigate()
    const { dock }       = useDashboard()
    const [hosts,     setHosts]     = useState<ProxyHostWithCert[]>([])
    const [loading,   setLoading]   = useState(true)
    const [error,     setError]     = useState(false)
    const [search,    setSearch]    = useState('')
    const [network,   setNetwork]   = useState('')
    const [modalOpen, setModalOpen] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        setError(false)
        apiListProxyHosts()
            .then(d => { setHosts(d); setLoading(false) })
            .catch(() => { setError(true); setLoading(false) })
    }, [])

    useEffect(() => { load() }, [load])

    // Collect all networks reachable via proxy hosts
    const networkOptions = useMemo(() => {
        const nets = Array.from(new Set(hosts.flatMap(h => hostNetworks(h.target_url, dock)))).sort()
        return [{ value: '', label: 'All' }, ...nets.map(n => ({ value: n, label: n }))]
    }, [hosts, dock])

    const filtered = useMemo(() =>
        hosts
            .filter(h =>
                h.domain.toLowerCase().includes(search.toLowerCase()) ||
                h.target_url.toLowerCase().includes(search.toLowerCase())
            )
            .filter(h => !network || hostNetworks(h.target_url, dock).includes(network)),
        [hosts, search, network, dock]
    )

    const columns: Column<ProxyHostWithCert>[] = [
        {
            key: 'domain',
            header: 'Domain',
            render: h => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500, color: h.enabled ? 'var(--text-1)' : 'var(--text-3)' }}>{h.domain}</span>
                    {!h.enabled && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11,
                            color: 'var(--text-3)', background: 'var(--fill-2)', borderRadius: 4, padding: '1px 6px' }}>
                            <PauseCircle size={10} /> Paused
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: 'service',
            header: 'Service',
            render: h => {
                const hostname = (() => { try { return new URL(h.target_url).hostname } catch { return null } })()
                const svc = hostname ? dock.find(s => s.name === hostname) : null
                if (svc) return <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{svc.name}</span>
                return <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{hostname ?? h.target_url}</span>
            },
        },
        {
            key: 'ssl',
            header: 'SSL',
            shrink: true,
            render: h => <SslBadge host={h} />,
        },
    ]

    if (loading) return <Page><p style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading proxy hosts…</p></Page>

    if (error) return (
        <Page>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 40, color: 'var(--text-3)' }}>
                <AlertCircle size={32} />
                <p style={{ margin: 0, fontSize: 14 }}>Failed to load proxy hosts</p>
                <Button variant={3} onClick={load}>Retry</Button>
            </div>
        </Page>
    )

    return (
        <Page>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search by domain or target…" />
                {networkOptions.length > 1 && (
                    <InlineSelect
                        label="Network"
                        value={network}
                        options={networkOptions}
                        onChange={setNetwork}
                    />
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button variant={1} size="md" onClick={() => setModalOpen(true)}>
                        <Plus size={14} /> Add host
                    </Button>
                </div>
            </div>

            <Table
                columns={columns}
                data={filtered}
                keyExtractor={h => String(h.id)}
                onRowClick={h => navigate(`/proxy/overview?id=${h.id}&domain=${encodeURIComponent(h.domain)}`)}
                emptyMessage={
                    hosts.length === 0
                        ? 'No proxy hosts yet. Click "Add host" to get started.'
                        : 'No hosts match the search.'
                }
            />

            <ProxyHostModal
                open={modalOpen}
                host={null}
                onClose={() => setModalOpen(false)}
                onSaved={() => { setModalOpen(false); load() }}
            />
        </Page>
    )
}
