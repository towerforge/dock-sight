import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Wifi } from 'lucide-react'
import { Button, Table, Switch } from '@/components/ui'
import type { Column } from '@/components/ui'
import { apiSecurityStatus, apiSecurityClearIp, apiSecuritySetRateLimit } from '@/services/api'
import type { RateLimitEntry, LoginEvent } from '@/services/api'

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ blocked }: { blocked: boolean }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 99,
            background: blocked ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
            color:      blocked ? '#ef4444'               : '#ca8a04',
        }}>
            <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: blocked ? '#ef4444' : '#ca8a04',
                flexShrink: 0,
            }} />
            {blocked ? 'Blocked' : 'Attempt'}
        </span>
    )
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
    return (
        <div style={{
            flex: 1,
            background: 'var(--layer-1)',
            border: '1px solid var(--stroke-1)',
            borderRadius: 'var(--radius-2)',
            padding: '16px 20px',
        }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: danger && value > 0 ? '#ef4444' : 'var(--text-1)' }}>
                {value}
            </p>
        </div>
    )
}

// ── Section title ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            {children}
        </p>
    )
}

// ── Format helpers ────────────────────────────────────────────────────────────

function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleString(undefined, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SecurityPage() {
    const [entries, setEntries]               = useState<RateLimitEntry[]>([])
    const [events, setEvents]                 = useState<LoginEvent[]>([])
    const [loading, setLoading]               = useState(false)
    const [clearing, setClearing]             = useState<string | null>(null)
    const [rateLimitEnabled, setRateLimitEnabled] = useState(true)
    const [togglingRateLimit, setTogglingRateLimit] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await apiSecurityStatus()
            setEntries(data.entries)
            setEvents(data.events)
            setRateLimitEnabled(data.rate_limit_enabled)
        } catch { /* ignore */ } finally {
            setLoading(false)
        }
    }, [])

    const handleToggleRateLimit = async (enabled: boolean) => {
        setTogglingRateLimit(true)
        try {
            await apiSecuritySetRateLimit(enabled)
            setRateLimitEnabled(enabled)
        } catch { /* ignore */ } finally {
            setTogglingRateLimit(false)
        }
    }

    useEffect(() => { load() }, [load])

    const handleClear = async (ip: string) => {
        setClearing(ip)
        try { await apiSecurityClearIp(ip); await load() }
        catch {} finally { setClearing(null) }
    }

    const blocked = entries.filter(e => e.blocked).length

    const rateLimitColumns: Column<RateLimitEntry>[] = [
        {
            key: 'ip',
            header: 'IP address',
            render: e => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wifi size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, fontFamily: 'monospace', color: 'var(--text-1)' }}>{e.ip}</span>
                </span>
            ),
        },
        {
            key: 'attempts',
            header: 'Attempts',
            shrink: true,
            render: e => (
                <span style={{ fontWeight: 600, color: e.blocked ? '#ef4444' : 'var(--text-2)' }}>
                    {e.attempts} / 10
                </span>
            ),
        },
        {
            key: 'blocked',
            header: 'Status',
            shrink: true,
            render: e => <Badge blocked={e.blocked} />,
        },
        {
            key: 'reset_at',
            header: 'Resets at',
            shrink: true,
            render: e => (
                <span style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(e.reset_at)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            shrink: true,
            render: e => (
                <Button
                    variant={4} size="sm"
                    loading={clearing === e.ip}
                    onClick={ev => { ev.stopPropagation(); handleClear(e.ip) }}
                    style={{ color: 'var(--text-3)', fontSize: 11 }}
                >
                    Unblock
                </Button>
            ),
        },
    ]

    const eventColumns: Column<LoginEvent>[] = [
        {
            key: 'created_at',
            header: 'Date',
            shrink: true,
            render: e => (
                <span style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(e.created_at)}
                </span>
            ),
        },
        {
            key: 'ip',
            header: 'IP address',
            shrink: true,
            render: e => (
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{e.ip}</span>
            ),
        },
        {
            key: 'username',
            header: 'Username attempted',
            render: e => (
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{e.username ?? '—'}</span>
            ),
        },
        {
            key: 'blocked',
            header: 'Status',
            shrink: true,
            render: e => <Badge blocked={e.blocked} />,
        },
    ]

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Security</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
                        Brute-force login attempt tracking by IP. Blocked after 10 failed attempts in 15 minutes.
                    </p>
                </div>
                <Button variant={2} loading={loading} onClick={load}>
                    <RefreshCw size={13} style={{ marginRight: 4 }} />
                    Refresh
                </Button>
            </div>

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--layer-1)', border: '1px solid var(--stroke-1)',
                borderRadius: 'var(--radius-2)', padding: '14px 20px', marginBottom: 24,
            }}>
                <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        Brute-force protection
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                        Block an IP after 10 failed login attempts within 15 minutes.
                    </p>
                </div>
                <Switch
                    checked={rateLimitEnabled}
                    onChange={handleToggleRateLimit}
                    disabled={togglingRateLimit}
                />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <SummaryCard label="Blocked IPs"       value={blocked}        danger />
                <SummaryCard label="IPs with attempts" value={entries.length} />
                <SummaryCard label="Events logged"     value={events.length}  />
            </div>

            <div style={{ marginBottom: 32 }}>
                <SectionTitle>Active blocks</SectionTitle>
                <Table
                    columns={rateLimitColumns}
                    data={entries}
                    keyExtractor={e => e.ip}
                    emptyMessage="No suspicious activity detected."
                />
            </div>

            <div>
                <SectionTitle>Event log (last 50)</SectionTitle>
                <Table
                    columns={eventColumns}
                    data={events}
                    keyExtractor={e => String(e.id)}
                    emptyMessage="No login events recorded."
                />
            </div>
        </>
    )
}
