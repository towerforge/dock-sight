const RULES = [
  { key: 'length',  label: 'At least 8 characters',         test: (p: string) => p.length >= 8 },
  { key: 'upper',   label: 'One uppercase letter',           test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'One lowercase letter',           test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',  label: 'One number',                     test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character (!@#$…)',  test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

export function isPasswordStrong(password: string) {
  return RULES.every(r => r.test(password));
}

export function PasswordStrength({ password }: { password: string }) {
  if (password.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Min. 8 characters, uppercase, lowercase, number and special character.
      </p>
    );
  }

  const passed = RULES.filter(r => r.test(password)).length;
  const pct = (passed / RULES.length) * 100;

  const barColor =
    pct === 100 ? 'bg-green-500' :
    pct <= 40   ? 'bg-red-500'   :
                  'bg-yellow-500';

  return (
    <div className="flex flex-col gap-2">
      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-card-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Rule list */}
      <div className="flex flex-col gap-0.5">
        {RULES.map(r => {
          const ok = r.test(password);
          return (
            <p
              key={r.key}
              className={`text-xs transition-colors ${ok ? 'text-green-400' : 'text-slate-500'}`}
            >
              {ok ? '✓' : '·'} {r.label}
            </p>
          );
        })}
      </div>
    </div>
  );
}
