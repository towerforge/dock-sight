import { get, post, del } from './http'

export type Registry = { id: string; name: string; provider: string; username: string; token_hint: string }

export const apiListRegistries  = ()                                                                       => get<Registry[]>('/registries')
export const apiCreateRegistry  = (body: { name: string; provider: string; username: string; token: string }) => post<{ id: string }>('/registries', body)
export const apiDeleteRegistry  = (id: string)                                                              => del<void>(`/registries?id=${encodeURIComponent(id)}`)
