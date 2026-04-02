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

export const apiAuthStatus = () => get<{ setup_required: boolean; authenticated: boolean }>('/api/auth/status')
export const apiAuthSetup  = (password: string, confirm_password: string) => post<void>('/api/auth/setup', { password, confirm_password })
export const apiAuthLogin  = (password: string) => post<void>('/api/auth/login', { password })
export const apiAuthLogout = ()                 => post<void>('/api/auth/logout')
