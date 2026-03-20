import React from 'react';

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
