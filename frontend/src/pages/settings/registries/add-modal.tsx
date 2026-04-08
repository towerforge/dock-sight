import { useState } from 'react'
import { Modal, Input, Button } from '@/components/ui'
import { apiCreateRegistry } from '@/services/api'

interface Props {
    open: boolean
    onClose: () => void
    onAdded: () => void
}

const EMPTY = { name: '', username: '', token: '' }

export function AddRegistryModal({ open, onClose, onAdded }: Props) {
    const [form, setForm]     = useState(EMPTY)
    const [errors, setErrors] = useState<Partial<typeof EMPTY>>({})
    const [saving, setSaving] = useState(false)
    const [apiError, setApiError] = useState('')

    const reset = () => { setForm(EMPTY); setErrors({}); setApiError('') }

    const handleClose = () => { reset(); onClose() }

    const validate = () => {
        const e: Partial<typeof EMPTY> = {}
        if (!form.name.trim())     e.name     = 'Required'
        if (!form.username.trim()) e.username  = 'Required'
        if (!form.token.trim())    e.token     = 'Required'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setSaving(true)
        setApiError('')
        try {
            await apiCreateRegistry({
                name:     form.name.trim(),
                provider: 'dockerhub',
                username: form.username.trim(),
                token:    form.token.trim(),
            })
            reset()
            onAdded()
        } catch (err: any) {
            setApiError(err?.message ?? 'Failed to add registry')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal open={open} onClose={handleClose} title="Add DockerHub registry">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 420 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
                    To generate a DockerHub access token follow the{' '}
                    <a
                        href="https://docs.docker.com/security/for-developers/access-tokens/"
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#3b82f6' }}
                    >
                        official guide
                    </a>.
                </p>

                <Input
                    label="Name"
                    required
                    placeholder="e.g. dockerhub-prod"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    error={errors.name}
                />
                <Input
                    label="DockerHub username"
                    required
                    placeholder="your-username"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    error={errors.username}
                />
                <Input
                    label="Access token"
                    required
                    type="password"
                    placeholder="dckr_pat_…"
                    value={form.token}
                    onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                    error={errors.token}
                />

                {apiError && (
                    <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{apiError}</p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <Button variant={2} onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button variant={1} loading={saving} onClick={handleSubmit}>Add registry</Button>
                </div>
            </div>
        </Modal>
    )
}
