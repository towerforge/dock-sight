import { get, post, put, del } from './http'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SslMode = 'none' | 'letsencrypt' | 'self_signed'

export type ProxyHost = {
    id:            string
    domain:        string
    target_url:    string
    ssl_mode:      SslMode
    force_https:   boolean
    enabled:       boolean
    custom_config: string
    created_at:    number
}

export type SslCertificate = {
    id:         string
    host_id:    string
    expires_at: number
    renewed_at: number
}

export type ProxyHostWithCert = ProxyHost & {
    certificate: SslCertificate | null
}

export type CreateProxyHostPayload = {
    domain:        string
    target_url:    string
    ssl_mode:      SslMode
    force_https:   boolean
    enabled:       boolean
    custom_config: string
}

export type UpdateProxyHostPayload = Partial<CreateProxyHostPayload>

// ── API ───────────────────────────────────────────────────────────────────────

export const apiListProxyHosts  = ()                                         => get<ProxyHostWithCert[]>('/api/proxy/hosts')
export const apiGetProxyHost    = (id: string)                               => get<ProxyHostWithCert>(`/api/proxy/hosts/${id}`)
export const apiCreateProxyHost = (body: CreateProxyHostPayload)             => post<{ id: string }>('/api/proxy/hosts', body)
export const apiUpdateProxyHost = (id: string, body: UpdateProxyHostPayload) => put<{ ok: boolean }>(`/api/proxy/hosts/${id}`, body)
export const apiDeleteProxyHost = (id: string)                               => del<void>(`/api/proxy/hosts/${id}`)
export const apiRequestSsl      = (id: string)                               => post<SslCertificate>(`/api/proxy/hosts/${id}/ssl`)
