import { useState } from 'react'
import { Modal, Input, Select, Button } from '@/components/ui'
import { apiCreateVolume } from '@/services/api'

interface Props {
    open: boolean
    onClose: () => void
    onCreated: () => void
}

const DRIVER_OPTIONS = [
    { value: 'local',   label: 'local'   },
    { value: 'overlay', label: 'overlay' },
    { value: 'nfs',     label: 'nfs'     },
]

export function CreateVolumeModal({ open, onClose, onCreated }: Props) {
    const [name,    setName]    = useState('')
    const [driver,  setDriver]  = useState('local')
    const [error,   setError]   = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const reset = () => { setName(''); setDriver('local'); setError(null) }
    const handleClose = () => { reset(); onClose() }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setError(null)
        setLoading(true)
        try {
            await apiCreateVolume({ name: name.trim(), driver })
            reset()
            onCreated()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Failed to create volume')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={open} onClose={handleClose} title="New volume">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Input
                    label="Volume name"
                    required
                    placeholder="my-volume"
                    value={name}
                    onChange={e => setName((e.target as HTMLInputElement).value)}
                />

                <Select
                    label="Driver"
                    options={DRIVER_OPTIONS}
                    value={driver}
                    onChange={e => setDriver(e.target.value)}
                />

                {error && (
                    <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button type="button" variant={2} onClick={handleClose}>Cancel</Button>
                    <Button type="submit" variant={1} loading={loading}>Create</Button>
                </div>
            </form>
        </Modal>
    )
}
