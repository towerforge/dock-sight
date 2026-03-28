import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/modal';

export const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => (
  <div className="flex items-start gap-1.5 text-slate-400">
    <span className="mt-0.5 shrink-0 text-slate-500">{icon}</span>
    <span className="shrink-0 text-slate-500">{label}:</span>
    <span className={`text-slate-300 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

export const Section: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1 text-[11px] text-slate-500 uppercase tracking-wider font-medium">
      <span>{icon}</span>{label}
    </div>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

export const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-card-border/60 text-slate-300 border border-card-border">
    {children}
  </span>
);

export const ConfirmModal: React.FC<{
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  warning?: string;
  maxWidth?: string;
}> = ({ title, description, onConfirm, onCancel, loading, warning, maxWidth = 'max-w-sm' }) => (
  <Modal onClose={onCancel} maxWidth={maxWidth}>
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          warning
            ? 'bg-amber-500/10 border border-amber-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {warning
            ? <AlertTriangle size={16} className="text-amber-400" />
            : <Trash2 size={16} className="text-red-400" />
          }
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-slate-400 text-xs mt-0.5 break-all">{description}</p>
        </div>
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-300 text-xs break-all">{warning}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded-lg border border-card-border text-slate-300 hover:bg-card-border/40 transition-colors disabled:opacity-50"
        >
          {warning ? 'Close' : 'Cancel'}
        </button>
        {!warning && (
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  </Modal>
);
