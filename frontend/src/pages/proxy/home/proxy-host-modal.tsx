import { useState, useEffect, useMemo } from 'react'
import { Modal, Input, Select, Button, Switch } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import { apiCreateProxyHost, apiUpdateProxyHost } from '@/services/proxy'
import type { ProxyHostWithCert, SslMode } from '@/services/proxy'

interface Props {
    open:    boolean
    host:    ProxyHostWithCert | null   // null = create mode, set = edit mode
    onClose: () => void
    onSaved: () => void
}

const SSL_OPTIONS = [
    { value: 'none',        label: 'None'           },
    { value: 'letsencrypt', label: "Let's Encrypt"  },
    { value: 'self_signed', label: 'Self-signed'    },
]

const MANUAL = '__manual__'
const EMPTY  = { domain: '', target_url: '', ssl_mode: 'none' as SslMode, force_https: false, enabled: true, custom_config: '' }

export function ProxyHostModal({ open, host, onClose, onSaved }: Props) {
    const { dock }  = useDashboard()

    const [form,      setForm]      = useState(EMPTY)
    const [service,   setService]   = useState(MANUAL)
    const [portValue, setPortValue] = useState('')
    const [error,     setError]     = useState<string | null>(null)
    const [loading,   setLoading]   = useState(false)

    // Service selector options
    const serviceOptions = useMemo(() => [
        { value: MANUAL, label: 'Custom URL' },
        ...dock.map(s => ({ value: s.name, label: s.name })),
    ], [dock])

    // Port selector options for the selected service
    const portOptions = useMemo(() => {
        if (service === MANUAL) return []
        const svc = dock.find(s => s.name === service)
        if (!svc || !svc.ports?.length) return []
        return svc.ports
            .filter(p => p.target != null)
            .map(p => {
                const label = p.published != null
                    ? `${p.target} / ${p.protocol.toUpperCase()}  (host → ${p.published})`
                    : `${p.target} / ${p.protocol.toUpperCase()}`
                return { value: String(p.target), label }
            })
    }, [dock, service])

    const selectedService = service !== MANUAL ? dock.find(s => s.name === service) : null
    const hasPorts        = portOptions.length > 0

    useEffect(() => {
        if (open) {
            setError(null)
            setService(MANUAL)
            setPortValue('')
            setForm(host
                ? { domain: host.domain, target_url: host.target_url, ssl_mode: host.ssl_mode, force_https: host.force_https, enabled: host.enabled, custom_config: host.custom_config ?? '' }
                : EMPTY
            )
        }
    }, [open, host])

    const set = (key: keyof typeof EMPTY, value: unknown) =>
        setForm(f => ({ ...f, [key]: value }))

    const buildTargetUrl = (svcName: string, port: string) =>
        port ? `http://${svcName}:${port}` : `http://${svcName}`

    const handleServiceChange = (name: string) => {
        setService(name)
        setPortValue('')
        if (name === MANUAL) return
        const svc   = dock.find(s => s.name === name)
        const ports = svc?.ports?.filter(p => p.target != null) ?? []
        const first = ports.length === 1 ? String(ports[0].target) : ''
        if (first) setPortValue(first)
        set('target_url', buildTargetUrl(name, first))
    }

    const handlePortChange = (port: string) => {
        setPortValue(port)
        set('target_url', buildTargetUrl(service, port))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.domain.trim() || !form.target_url.trim()) return
        setError(null)
        setLoading(true)
        try {
            if (host) {
                await apiUpdateProxyHost(host.id, form)
            } else {
                await apiCreateProxyHost(form)
            }
            onSaved()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const isEdit = !!host

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Proxy Host' : 'New Proxy Host'}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <Input
                    label="Domain"
                    required
                    placeholder="app.example.com"
                    value={form.domain}
                    onChange={e => set('domain', (e.target as HTMLInputElement).value)}
                    hint="The public domain that will be routed by the proxy"
                />

                {/* ── Service + Port selectors (create only) ── */}
                {!isEdit && (
                    <>
                        <Select
                            label="Service"
                            options={serviceOptions}
                            value={service}
                            onChange={e => handleServiceChange(e.target.value)}
                            searchable={dock.length > 5}
                        />

                        {service !== MANUAL && (
                            hasPorts ? (
                                <Select
                                    label="Port"
                                    options={[
                                        { value: '', label: '— select a port —' },
                                        ...portOptions,
                                    ]}
                                    value={portValue}
                                    onChange={e => handlePortChange(e.target.value)}
                                    hint="Container port to forward to"
                                />
                            ) : (
                                <div style={{
                                    padding: '10px 12px', borderRadius: 'var(--radius-1)',
                                    background: 'var(--fill-1)', border: '1px solid var(--stroke-1)',
                                    fontSize: 13, color: 'var(--text-3)',
                                }}>
                                    {selectedService
                                        ? `"${service}" has no published ports — the target URL will point directly to the service name.`
                                        : 'Select a service to see available ports.'
                                    }
                                </div>
                            )
                        )}
                    </>
                )}

                {/* ── Target URL: only shown for custom URL or in edit mode ── */}
                {(service === MANUAL || isEdit) && (
                    <Input
                        label="Target URL"
                        required
                        placeholder="http://localhost:3000"
                        value={form.target_url}
                        onChange={e => set('target_url', (e.target as HTMLInputElement).value)}
                        hint="Where to forward incoming requests"
                    />
                )}

                <Select
                    label="SSL"
                    options={SSL_OPTIONS}
                    value={form.ssl_mode}
                    onChange={e => set('ssl_mode', e.target.value as SslMode)}
                />

                {form.ssl_mode !== 'none' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 'var(--radius-1)',
                        background: 'var(--fill-1)', border: '1px solid var(--stroke-1)',
                    }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Force HTTPS</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                                Redirect all HTTP traffic to HTTPS
                            </p>
                        </div>
                        <Switch checked={form.force_https} onChange={v => set('force_https', v)} />
                    </div>
                )}

                {error && (
                    <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {error}
                    </p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button type="button" variant={2} onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant={1} loading={loading}>
                        {isEdit ? 'Save changes' : 'Create'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
