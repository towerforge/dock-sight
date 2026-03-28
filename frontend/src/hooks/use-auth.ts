import { useState, useEffect } from 'react';
import axios from 'axios';

export interface AuthStatus {
  setup_required: boolean;
  authenticated: boolean;
}

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await axios.get<AuthStatus>('/api/auth/status');
      setStatus(res.data);
    } catch {
      setStatus({ setup_required: true, authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const setup = async (password: string, confirmPassword: string) => {
    await axios.post('/api/auth/setup', {
      password,
      confirm_password: confirmPassword,
    });
    setStatus({ setup_required: false, authenticated: true });
  };

  const login = async (password: string) => {
    await axios.post('/api/auth/login', { password });
    setStatus({ setup_required: false, authenticated: true });
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setStatus({ setup_required: false, authenticated: false });
  };

  return { status, loading, setup, login, logout, refresh };
}
