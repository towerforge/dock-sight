import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PasswordStrength, isPasswordStrong } from './password-strength';
import { BigPasswordInput } from './big-password-input';

interface Props {
  setupRequired: boolean;
  onAuthenticated: () => void;
}

function PasswordField({ value, onChange, onKeyDown, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-card-bg border border-card-border rounded-2xl px-5 py-3.5 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function AuthView({ setupRequired, onAuthenticated }: Props) {
  const { setup, login } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = setupRequired
    ? isPasswordStrong(password) && password === confirm
    : password.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      setupRequired ? await setup(password, confirm) : await login(password);
      onAuthenticated();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && handleSubmit();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-app-bg px-6 -mt-16">

      {/* Brand */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <img src="/logo.svg" alt="Dock Sight" className="w-12 h-12" />
        <div className="text-center">
          <h1 className="text-white text-2xl font-semibold tracking-tight">Dock Sight</h1>
          <p className="text-slate-500 text-sm mt-1">
            {setupRequired ? 'Choose a password to get started' : 'Enter your password to continue'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-lg flex flex-col gap-3">

        {/* Login — big input */}
        {!setupRequired && (
          <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
            <BigPasswordInput
              value={password}
              onChange={setPassword}
              onSubmit={handleSubmit}
              disabled={loading}
            />
          </div>
        )}

        {/* Setup — two regular inputs + strength */}
        {setupRequired && (
          <>
            <PasswordField
              value={password}
              onChange={setPassword}
              onKeyDown={onEnter}
              placeholder="Password"
            />
            <PasswordStrength password={password} />
            <PasswordField
              value={confirm}
              onChange={setConfirm}
              onKeyDown={onEnter}
              placeholder="Confirm password"
            />
          </>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center px-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 mt-1"
          style={{
            background: canSubmit ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : undefined,
            backgroundColor: canSubmit ? undefined : '#1f2329',
            color: canSubmit ? 'white' : '#4b5563',
            border: canSubmit ? 'none' : '1px solid #2a2e35',
          }}
        >
          {loading
            ? setupRequired ? 'Creating…' : 'Signing in…'
            : setupRequired ? 'Create password' : 'Sign in'}
        </button>

      </div>
    </div>
  );
}
