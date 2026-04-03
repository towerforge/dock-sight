import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui'

const RULES = [
    { key: 'length',  label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'One uppercase letter',          test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'One lowercase letter',          test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'One number',                    test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'One special character (!@#$…)', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const

function isPasswordStrong(p: string) { return RULES.every(r => r.test(p)) }

function PasswordStrength({ password }: { password: string }) {
    if (!password.length) return <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Min. 8 characters, uppercase, lowercase, number and special character.</p>
    const passed = RULES.filter(r => r.test(password)).length
    const pct = (passed / RULES.length) * 100
    const barColor = pct === 100 ? '#22c55e' : pct <= 40 ? '#ef4444' : '#eab308'
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 4, background: 'var(--fill-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.2s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {RULES.map(r => {
                    const ok = r.test(password)
                    return <p key={r.key} style={{ fontSize: 12, margin: 0, color: ok ? '#22c55e' : 'var(--text-3)' }}>{ok ? '✓' : '·'} {r.label}</p>
                })}
            </div>
        </div>
    )
}

function PasswordField({ value, onChange, onKeyDown, placeholder }: { value: string; onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent) => void; placeholder: string }) {
    const [show, setShow] = useState(false)
    return (
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'} value={value}
                onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
                placeholder={placeholder}
                style={{
                    width: '100%', boxSizing: 'border-box', background: 'var(--layer-1)',
                    border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-2)',
                    padding: '12px 48px 12px 16px', fontSize: 14, color: 'var(--text-1)',
                    outline: 'none',
                }}
            />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    )
}

interface Props { setupRequired: boolean; onAuthenticated: () => void }

export function AuthView({ setupRequired, onAuthenticated }: Props) {
    const { setup, login } = useAuth()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const canSubmit = setupRequired ? isPasswordStrong(password) && password === confirm : password.length > 0

    const handleSubmit = async () => {
        if (!canSubmit || loading) return
        setError(''); setLoading(true)
        try {
            setupRequired ? await setup(password, confirm) : await login(password)
            onAuthenticated()
        } catch (err: any) {
            setError(err?.response?.data?.error ?? err?.message ?? 'Error')
        } finally {
            setLoading(false)
        }
    }

    const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && handleSubmit()

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', marginTop: -88 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.3px' }}>Dock Sight</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
                        {setupRequired ? 'Choose a password to get started' : 'Enter your password to continue'}
                    </p>
                </div>
            </div>

            <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!setupRequired && (
                    <PasswordField value={password} onChange={setPassword} onKeyDown={onEnter} placeholder="Password" />
                )}
                {setupRequired && (
                    <>
                        <PasswordField value={password} onChange={setPassword} onKeyDown={onEnter} placeholder="Password" />
                        <PasswordStrength password={password} />
                        <PasswordField value={confirm} onChange={setConfirm} onKeyDown={onEnter} placeholder="Confirm password" />
                    </>
                )}

                {error && <p style={{ fontSize: 13, color: 'var(--color-danger)', textAlign: 'center', margin: 0 }}>{error}</p>}

                <Button variant={1} onClick={handleSubmit} loading={loading} disabled={!canSubmit} style={{ width: '100%', marginTop: 4 }}>
                    {loading
                        ? (setupRequired ? 'Creating…' : 'Signing in…')
                        : (setupRequired ? 'Create password' : 'Sign in')}
                </Button>
            </div>
        </div>
    )
}
