import React, { useState, useEffect } from 'react';
import { HardDrive, Info, Trash2 } from 'lucide-react';
import { apiServiceImages, apiDeleteImage } from '@/services/sysinfo';
import { formatBytes } from '@/lib/formatters';
import { Row, ConfirmModal } from './ui';

export const ImagesTab: React.FC<{ serviceName: string }> = ({ serviceName }) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiServiceImages(serviceName)
      .then((d) => { setImages(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serviceName]);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await apiDeleteImage(confirmId);
      setImages((prev) => prev.filter((img) => img.delete_id !== confirmId));
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>;
  if (!images.length) return <div className="text-slate-500 text-sm py-8 text-center">No images found.</div>;

  const sorted = [...images].sort((a, b) => Number(b.in_use) - Number(a.in_use));

  return (
    <>
      {confirmId && (
        <ConfirmModal
          title="Delete image"
          description={`Remove "${confirmName}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
          loading={deleting}
        />
      )}

      <div className="flex flex-col divide-y divide-slate-600/60">
        {sorted.map((img) => (
          <div key={img.id} className={`w-full flex flex-col gap-4 py-5 first:pt-1 ${!img.in_use ? 'opacity-50' : ''}`}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base">{img.name}</span>
                <span className="text-slate-500 font-mono text-xs">{img.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">
                  {img.tag}
                </span>
                {!img.in_use && (
                  <button
                    onClick={() => {
                      setConfirmId(img.delete_id);
                      setConfirmName(`${img.name}:${img.tag}`);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete image"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Row icon={<HardDrive size={12} />} label="Size"    value={formatBytes(img.size)} />
              <Row icon={<Info size={12} />}      label="Created" value={img.created ? new Date(img.created).toLocaleString() : '—'} />
              <Row icon={<Info size={12} />}      label="Arch"    value={img.architecture || '—'} />
              <Row icon={<Info size={12} />}      label="OS"      value={img.os || '—'} />
            </div>

          </div>
        ))}
      </div>
    </>
  );
};
