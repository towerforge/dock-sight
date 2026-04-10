import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Input, Button, Select } from '@/components/ui'
import { apiCreateService, apiListNetworks, apiListRegistries } from '@/services/api'
import type { Registry } from '@/services/api'

interface Props {
    open: boolean
    onClose: () => void
    onCreated: () => void
}

export function CreateServiceModal({ open, onClose, onCreated }: Props) {
    const navigate = useNavigate()
    const [name,       setName]       = useState('')
    const [image,      setImage]      = useState('')
    const [network,    setNetwork]    = useState('')
    const [registryId, setRegistryId] = useState('')
    const [error,      setError]      = useState<string | null>(null)
    const [loading,    setLoading]    = useState(false)
    const [networks,   setNetworks]   = useState<{ value: string; label: string }[]>([])
    const [registries, setRegistries] = useState<Registry[]>([])

    useEffect(() => {
        if (!open) return
        apiListNetworks()
            .then(list => setNetworks(list.map(n => ({ value: n.name, label: n.name }))))
            .catch(() => {})
        apiListRegistries()
            .then(setRegistries)
            .catch(() => {})
    }, [open])

    const reset = () => { setName(''); setImage(''); setNetwork(''); setRegistryId(''); setError(null) }

    const handleClose = () => { reset(); onClose() }

    const selectedRegistry = registries.find(r => r.id === registryId)

    const imageHint = selectedRegistry
        ? `Use the full image path for this registry: ${selectedRegistry.username}/image:tag`
        : 'Docker Hub image name and tag, e.g. nginx:latest, postgres:16, redis:alpine'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !image.trim()) return
        setError(null)
        setLoading(true)
        try {
            const serviceName = name.trim()
            await apiCreateService({
                name:  serviceName,
                image: image.trim(),
                ...(network    ? { networks:    [network]    } : {}),
                ...(registryId ? { registry_id: registryId  } : {}),
            })
            reset()
            onCreated()
            onClose()
            navigate(`/service/overview?name=${encodeURIComponent(serviceName)}`)
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Failed to create service')
        } finally {
            setLoading(false)
        }
    }

    const registryOptions = [
        { value: '', label: 'Public (Docker Hub)' },
        ...registries.map(r => ({ value: r.id, label: `${r.name} · ${r.username}` })),
    ]

    return (
        <Modal open={open} onClose={handleClose} title="New service">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Input
                    label="Service name"
                    required
                    placeholder="my-service"
                    value={name}
                    onChange={e => setName((e.target as HTMLInputElement).value)}
                />

                <Select
                    label="Registry"
                    options={registryOptions}
                    value={registryId}
                    onChange={e => setRegistryId(e.target.value)}
                    hint="Select a registry to use private image credentials"
                />

                <Input
                    label="Image"
                    required
                    placeholder={selectedRegistry ? `${selectedRegistry.username}/image:tag` : 'nginx:latest'}
                    hint={imageHint}
                    value={image}
                    onChange={e => setImage((e.target as HTMLInputElement).value)}
                />

                <Select
                    label="Network"
                    placeholder="None (default)"
                    searchable
                    options={networks}
                    value={network}
                    onChange={e => setNetwork(e.target.value)}
                    hint="Attach this service to an existing network"
                />

                {error && (
                    <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button type="button" variant={2} onClick={handleClose}>Cancel</Button>
                    <Button type="submit" variant={1} loading={loading}>Deploy</Button>
                </div>
            </form>
        </Modal>
    )
}
