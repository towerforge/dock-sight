import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Input, Button } from '@/components/ui'
import { apiCreateService } from '@/services/api'

interface Props {
    open: boolean
    onClose: () => void
    onCreated: () => void
}

export function CreateServiceModal({ open, onClose, onCreated }: Props) {
    const navigate = useNavigate()
    const [name, setName]       = useState('')
    const [image, setImage]     = useState('')
    const [error, setError]     = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const reset = () => { setName(''); setImage(''); setError(null) }

    const handleClose = () => { reset(); onClose() }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !image.trim()) return
        setError(null)
        setLoading(true)
        try {
            const serviceName = name.trim()
            await apiCreateService({ name: serviceName, image: image.trim() })
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

                <Input
                    label="Image"
                    required
                    placeholder="nginx:latest"
                    hint="Docker Hub image name and tag, e.g. nginx:latest, postgres:16, redis:alpine"
                    value={image}
                    onChange={e => setImage((e.target as HTMLInputElement).value)}
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
