import React, { useState, useEffect } from 'react';
import { Box, Info, HardDrive, Network, RotateCcw, Trash2 } from 'lucide-react';
import { apiServiceContainers, apiDeleteContainer, apiServiceImages } from '@/services/sysinfo';
import { Row, Section, Chip, ConfirmModal } from './ui';

export const InfoTab: React.FC<{ serviceName: string }> = ({ serviceName }) => {
  const [data, setData] = useState<any>(null);
  const [serviceImageNames, setServiceImageNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState<string>('');
  const [confirmImage, setConfirmImage] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiServiceContainers(serviceName),
      apiServiceImages(serviceName),
    ]).then(([containers, images]: [any, any[]]) => {
      setData(containers);
      setServiceImageNames(new Set(images.map((img: any) => `${img.name}:${img.tag}`)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [serviceName]);

  const getLinkedServiceImage = (containerImage: string): string => {
    // Strip digest hash (e.g. "name:tag@sha256:...") to get "name:tag"
    const normalized = containerImage.split('@')[0];
    return serviceImageNames.has(normalized) ? normalized : '';
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await apiDeleteContainer(confirmId);
      setData((prev: any) => ({
        ...prev,
        containers: prev.containers.filter((c: any) => c.id !== confirmId),
      }));
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>;
  if (!data?.containers?.length) return <div className="text-slate-500 text-sm py-8 text-center">No containers found.</div>;

  const sorted = [...data.containers].sort((a: any, b: any) => Number(b.running) - Number(a.running));
  const stoppedCount = sorted.filter((c: any) => !c.running).length;

  return (
    <>
      {confirmId && (
        <ConfirmModal
          title="Delete container"
          description={`Remove "${confirmName}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
          loading={deleting}
          warning={confirmImage ? `This container has a linked image "${confirmImage}". Delete the image first before removing the container.` : undefined}
          maxWidth={confirmImage ? 'max-w-md' : 'max-w-sm'}
        />
      )}

      <div className="flex flex-col divide-y divide-slate-600/60">
        {sorted.map((c: any) => (
          <div key={c.id} className={`w-full flex flex-col gap-4 py-5 first:pt-1 ${!c.running ? 'opacity-50' : ''}`}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base">{c.name}</span>
                <span className="text-slate-500 font-mono text-xs">{c.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  c.running
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>{c.status}</span>
                {!c.running && (
                  <button
                    onClick={() => { setConfirmId(c.id); setConfirmName(c.name); setConfirmImage(getLinkedServiceImage(c.image || '')); }}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete container"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
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
    </>
  );
};
