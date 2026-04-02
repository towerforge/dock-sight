import { useState, useEffect } from 'react'
import { apiAuthStatus, apiAuthSetup, apiAuthLogin, apiAuthLogout } from '@/services/api'

export interface AuthStatus {
    setup_required: boolean
    authenticated: boolean
}

export function useAuth() {
    const [status, setStatus] = useState<AuthStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        try {
            const data = await apiAuthStatus()
            setStatus(data)
        } catch {
            setStatus({ setup_required: true, authenticated: false })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { refresh() }, [])

    const setup = async (password: string, confirmPassword: string) => {
        await apiAuthSetup(password, confirmPassword)
        setStatus({ setup_required: false, authenticated: true })
    }

    const login = async (password: string) => {
        await apiAuthLogin(password)
        setStatus({ setup_required: false, authenticated: true })
    }

    const logout = async () => {
        await apiAuthLogout()
        setStatus({ setup_required: false, authenticated: false })
    }

    return { status, loading, setup, login, logout, refresh }
}
