async function get<T>(url: string): Promise<T> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
}

async function del<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
}

async function post<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body != null ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw Object.assign(new Error(data?.error ?? res.statusText), { response: { data } })
    }
    return res.json().catch(() => ({}) as T)
}

export const apiSysInfo        = ()               => get<any>('/sysinfo')
export const apiDockerService  = ()               => get<any>('/docker-service')
export const apiServiceContainers = (name: string) => get<any>(`/docker-service/containers?name=${encodeURIComponent(name)}`)
export const apiServiceImages  = (name: string)   => get<any>(`/docker-service/images?name=${encodeURIComponent(name)}`)
export const apiDeleteContainer = (id: string)    => del<void>(`/docker-service/containers?id=${encodeURIComponent(id)}`)
export const apiDeleteImage    = (id: string)     => del<void>(`/docker-service/images?id=${encodeURIComponent(id)}`)
export const apiCleanupPreview = ()               => get<any>('/docker-service/cleanup')
export const apiRunCleanup     = ()               => del<any>('/docker-service/cleanup')

export const apiCreateService = (body: { name: string; image: string; replicas?: number; ports?: string[]; env?: string[]; networks?: string[]; registry_id?: string }) =>
    post<{ id?: string }>('/docker-service', body)
export const apiDeleteService = (name: string) => del<void>(`/docker-service?name=${encodeURIComponent(name)}`)
export const apiScaleService  = (name: string, replicas: number) => post<void>('/docker-service/scale', { name, replicas })
export const apiPullService   = (name: string) => post<void>(`/docker-service/pull?name=${encodeURIComponent(name)}`)

export const apiListNetworks  = () => get<{ id: string; name: string; driver: string; scope: string }[]>('/docker-network')
export const apiCreateNetwork = (body: { name: string; driver?: string }) =>
    post<{ id?: string }>('/docker-network', body)
export const apiDeleteNetwork = (name: string) => del<void>(`/docker-network?name=${encodeURIComponent(name)}`)

export type DockerVolume = { name: string; driver: string; mountpoint: string; created_at: number; service: string; size: number; ref_count: number }
export type VolumesResponse = { volumes: DockerVolume[]; disk: { total: number; used: number; free: number }; volumes_total_size: number }
export const apiListDockerVolumes  = () => get<VolumesResponse>('/docker-volumes')
export const apiCreateVolume       = (body: { name: string; driver?: string }) => post<{ name?: string }>('/docker-volumes', body)
export const apiDeleteVolume       = (name: string) => del<void>(`/docker-volumes?name=${encodeURIComponent(name)}`)

export type Registry = { id: string; name: string; provider: string; username: string; token_hint: string }
export const apiListRegistries   = ()                                                          => get<Registry[]>('/registries')
export const apiCreateRegistry   = (body: { name: string; provider: string; username: string; token: string }) => post<{ id: string }>('/registries', body)
export const apiDeleteRegistry   = (id: string)                                                => del<void>(`/registries?id=${encodeURIComponent(id)}`)

export const apiAuthStatus = () => get<{ setup_required: boolean; authenticated: boolean }>('/api/auth/status')
export const apiAuthSetup  = (password: string, confirm_password: string) => post<void>('/api/auth/setup', { password, confirm_password })
export const apiAuthLogin  = (password: string) => post<void>('/api/auth/login', { password })
export const apiAuthLogout = ()                 => post<void>('/api/auth/logout')
