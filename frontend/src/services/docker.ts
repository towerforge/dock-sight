import { get, post, put, del } from './http'

// ── System ────────────────────────────────────────────────────────────────────

export const apiSysInfo = () => get<any>('/sysinfo')

// ── Services ──────────────────────────────────────────────────────────────────

export const apiDockerService     = ()               => get<any>('/docker-service')
export const apiServiceContainers = (name: string)   => get<any>(`/docker-service/containers?name=${encodeURIComponent(name)}`)
export const apiServiceImages     = (name: string)   => get<any>(`/docker-service/images?name=${encodeURIComponent(name)}`)
export const apiDeleteContainer   = (id: string)     => del<void>(`/docker-service/containers?id=${encodeURIComponent(id)}`)
export const apiDeleteImage       = (id: string)     => del<void>(`/docker-service/images?id=${encodeURIComponent(id)}`)
export const apiCleanupPreview    = ()               => get<any>('/docker-service/cleanup')
export const apiRunCleanup        = ()               => del<any>('/docker-service/cleanup')

export const apiCreateService = (body: {
    name: string; image: string; replicas?: number
    ports?: string[]; env?: string[]; networks?: string[]; registry_id?: string
}) => post<{ id?: string }>('/docker-service', body)
export const apiDeleteService = (name: string)              => del<void>(`/docker-service?name=${encodeURIComponent(name)}`)
export const apiScaleService  = (name: string, replicas: number) => post<void>('/docker-service/scale', { name, replicas })
export const apiPullService          = (name: string) => post<void>(`/docker-service/pull?name=${encodeURIComponent(name)}`)

export type PortConfigPayload = {
    host_port:      number | null
    container_port: number
    protocol:       'tcp' | 'udp' | 'tcp+udp'
    publish_mode:   'ingress' | 'host'
}
export const apiUpdateServicePorts = (name: string, ports: PortConfigPayload[]) =>
    put<{ ok: boolean }>('/docker-service/ports', { name, ports })

export type MountConfigPayload = {
    source:    string
    target:    string
    typ:       'bind' | 'volume' | 'tmpfs'
    read_only: boolean
}
export const apiUpdateServiceMounts = (name: string, mounts: MountConfigPayload[]) =>
    put<{ ok: boolean }>('/docker-service/mounts', { name, mounts })

// ── Networks ──────────────────────────────────────────────────────────────────

export const apiListNetworks  = () => get<{ id: string; name: string; driver: string; scope: string }[]>('/docker-network')
export const apiCreateNetwork = (body: { name: string; driver?: string }) => post<{ id?: string }>('/docker-network', body)
export const apiDeleteNetwork = (name: string) => del<void>(`/docker-network?name=${encodeURIComponent(name)}`)

// ── Volumes ───────────────────────────────────────────────────────────────────

export type DockerVolume    = { name: string; driver: string; mountpoint: string; created_at: number; service: string; size: number; ref_count: number }
export type VolumesResponse = { volumes: DockerVolume[]; disk: { total: number; used: number; free: number }; volumes_total_size: number }

export const apiListDockerVolumes = ()                              => get<VolumesResponse>('/docker-volumes')
export const apiCreateVolume      = (body: { name: string; driver?: string }) => post<{ name?: string }>('/docker-volumes', body)
export const apiDeleteVolume      = (name: string)                  => del<void>(`/docker-volumes?name=${encodeURIComponent(name)}`)
