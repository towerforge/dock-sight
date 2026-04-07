import { useState } from 'react'
import { Modal, Input, Select, Button } from '@/components/ui'
import { apiCreateNetwork } from '@/services/api'

interface Props {
    open: boolean
    onClose: () => void
    onCreated: () => void
}

const DRIVER_OPTIONS = [
    { value: 'overlay', label: 'overlay' },
    { value: 'bridge',  label: 'bridge'  },
    { value: 'host',    label: 'host'    },
    { value: 'macvlan', label: 'macvlan' },
]

export function CreateNetworkModal({ open, onClose, onCreated }: Props) {
    const [name,    setName]    = useState('')
    const [driver,  setDriver]  = useState('overlay')
    const [error,   setError]   = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const reset = () => { setName(''); setDriver('overlay'); setError(null) }
    const handleClose = () => { reset(); onClose() }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setError(null)
        setLoading(true)
        try {
            await apiCreateNetwork({ name: name.trim(), driver })
            reset()
            onCreated()
            onClose()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Failed to create network')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={open} onClose={handleClose} title="New network">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Input
                    label="Network name"
                    required
                    placeholder="my-network"
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
