import { useState, useEffect } from 'react'
import { apiAuthStatus, apiAuthSetup, apiAuthLogin, apiAuthLogout, apiAuthMe } from '@/services/api'

export interface AuthStatus {
    setup_required: boolean
    authenticated: boolean
}

export function useAuth() {
    const [status, setStatus]     = useState<AuthStatus | null>(null)
    const [username, setUsername] = useState<string>('')
    const [loading, setLoading]   = useState(true)

    const refresh = async () => {
        try {
            const data = await apiAuthStatus()
            setStatus(data)
            if (data.authenticated) {
                apiAuthMe().then(me => setUsername(me.username)).catch(() => {})
            }
        } catch {
            setStatus({ setup_required: true, authenticated: false })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { refresh() }, [])

    const setup = async (username: string, password: string, confirmPassword: string) => {
        await apiAuthSetup(username, password, confirmPassword)
        setStatus({ setup_required: false, authenticated: true })
    }

    const login = async (u: string, password: string) => {
        await apiAuthLogin(u, password)
        setStatus({ setup_required: false, authenticated: true })
        apiAuthMe().then(me => setUsername(me.username)).catch(() => {})
    }

    const logout = async () => {
        await apiAuthLogout()
        setStatus({ setup_required: false, authenticated: false })
        setUsername('')
    }

    return { status, username, loading, setup, login, logout, refresh }
}
