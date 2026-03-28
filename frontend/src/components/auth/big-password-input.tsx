import React, { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
}

export function BigPasswordInput({ value, onChange, onSubmit, disabled }: Props) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showCaret = focused && !disabled;

  return (
    <div
      className="relative w-full cursor-text select-none"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus
        autoComplete="current-password"
        className="absolute inset-0 w-full h-full opacity-0 cursor-default"
        aria-label="Password"
      />

      {/* Visual display — single centered block */}
      <div className="w-full text-center px-12 py-4 min-h-[5rem] flex items-center justify-center">
        {value.length === 0 && !showCaret ? (
          <span className="text-slate-700 text-base tracking-widest pointer-events-none">
            Enter your password
          </span>
        ) : (
          <span
            className="pointer-events-none"
            style={{
              color: show ? '#e2e8f0' : '#8b5cf6',
              fontSize: show ? '2rem' : '3rem',
              letterSpacing: show ? '0.2em' : '0.35em',
              lineHeight: 1,
            }}
          >
            {show ? value : value.split('').map((_, i) => (
              <span key={i} style={{ verticalAlign: '-0.3em' }}>*</span>
            ))}
            {showCaret && (
              <span
                className="animate-[blink_1s_step-end_infinite]"
                style={{ fontWeight: 100, fontSize: '2.5rem', opacity: 1 }}
              >
                |
              </span>
            )}
          </span>
        )}
      </div>

      {/* Eye toggle */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); setShow(s => !s); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-violet-400 transition-colors p-1 z-10"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
