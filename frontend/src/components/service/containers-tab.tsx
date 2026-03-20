import React, { useState, useEffect } from 'react';
import { Box, Info, HardDrive, Network, RotateCcw } from 'lucide-react';
import { apiServiceContainers } from '@/services/sysinfo';
import { Row, Section, Chip } from './ui';

export const InfoTab: React.FC<{ serviceName: string }> = ({ serviceName }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiServiceContainers(serviceName)
      .then((d: any) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serviceName]);

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>;
  if (!data?.containers?.length) return <div className="text-slate-500 text-sm py-8 text-center">No containers found.</div>;

  return (
    <div className="flex flex-col divide-y divide-slate-600/60">
      {data.containers.map((c: any) => (
        <div key={c.id} className="w-full flex flex-col gap-4 py-5 first:pt-1">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${c.running ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-white font-bold text-base">{c.name}</span>
              <span className="text-slate-500 font-mono text-xs">{c.id}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
              c.running
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>{c.status}</span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Row icon={<Box size={12} />}       label="Image"   value={c.image}          mono />
            <Row icon={<RotateCcw size={12} />} label="Restart" value={c.restart_policy || '—'} />
            <Row icon={<Info size={12} />}      label="Created" value={c.created ? new Date(c.created).toLocaleString() : '—'} />
          </div>

          {/* Ports / Networks / Mounts */}
          {(c.ports?.length > 0 || c.networks?.length > 0 || c.mounts?.length > 0) && (
            <div className="flex flex-wrap gap-4 pt-1 border-t border-card-border/50">
              {c.ports?.length > 0 && (
                <Section icon={<Network size={12} />} label="Ports">
                  {c.ports.map((p: string) => <Chip key={p}>{p}</Chip>)}
                </Section>
              )}
              {c.networks?.length > 0 && (
                <Section icon={<Network size={12} />} label="Networks">
                  {c.networks.map((n: string) => <Chip key={n}>{n}</Chip>)}
                </Section>
              )}
              {c.mounts?.length > 0 && (
                <Section icon={<HardDrive size={12} />} label="Mounts">
                  {c.mounts.map((m: any, i: number) => (
                    <div key={i} className="text-[11px] font-mono text-slate-400 bg-card-border/40 rounded px-2 py-1">
                      <span className="text-slate-500">{m.type} </span>
                      <span className="text-slate-300">{m.source}</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-slate-300">{m.destination}</span>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

        </div>
      ))}
    </div>
  );
};
