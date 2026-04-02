import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthView } from '@/components/auth/AuthView'

export default function Login() {
    const { status, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading && status?.authenticated) navigate('/', { replace: true })
    }, [status, loading, navigate])

    if (loading) return null

    return <AuthView setupRequired={status?.setup_required ?? false} onAuthenticated={() => navigate('/', { replace: true })} />
}
