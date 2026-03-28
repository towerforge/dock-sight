import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PasswordStrength, isPasswordStrong } from './password-strength';
import { BigPasswordInput } from './big-password-input';

interface Props {
  setupRequired: boolean;
  onAuthenticated: () => void;
}

export function AuthView({ setupRequired, onAuthenticated }: Props) {
  const { setup, login } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordOk = setupRequired ? isPasswordStrong(password) : password.length > 0;
  const canSubmit = passwordOk && (!setupRequired || password === confirmPassword);

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      if (setupRequired) {
        await setup(password, confirmPassword);
      } else {
        await login(password);
      }
      onAuthenticated();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN VIEW ────────────────────────────────────────────────────────────
  if (!setupRequired) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-app-bg gap-10">
        {/* Title */}
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Dock Sight" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Dock Sight</h1>
            <p className="text-slate-500 text-xs mt-0.5">Enter your password to continue</p>
          </div>
        </div>

        {error && (
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 w-full text-center">
              {error}
            </p>
          </div>
        )}

        {/* Big input area */}
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="w-full bg-card-bg border border-card-border focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 rounded-2xl transition-all">
            <BigPasswordInput
              value={password}
              onChange={setPassword}
              onSubmit={handleSubmit}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="px-10 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  // ── SETUP VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-app-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Dock Sight" className="w-14 h-14 mb-4 mx-auto block" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Dock Sight</h1>
          <p className="text-slate-400 mt-1 text-sm">Create a password to protect your dashboard</p>
        </div>

        <div className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-5">
            <Lock size={16} className="text-violet-400 mt-0.5 shrink-0" />
            <p className="text-violet-300 text-xs leading-relaxed">
              First-time setup. Choose a strong password — you'll need it every time you open the portal.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Choose a password"
                  className="w-full bg-app-bg border border-card-border rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="mt-2">
                <PasswordStrength password={password} />
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat password"
                  className={`w-full bg-app-bg border rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors ${
                    confirmPassword.length > 0 && confirmPassword !== password
                      ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/30'
                      : 'border-card-border focus:border-violet-500/60 focus:ring-violet-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors mt-1"
            >
              {loading ? 'Setting up…' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
