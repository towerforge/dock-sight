import React, { useState, useEffect } from 'react';
import { Image, HardDrive, Info } from 'lucide-react';
import { apiServiceImages } from '@/services/sysinfo';
import { formatBytes } from '@/lib/formatters';
import { Row } from './ui';

export const ImagesTab: React.FC<{ serviceName: string }> = ({ serviceName }) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiServiceImages(serviceName)
      .then((d) => { setImages(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serviceName]);

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>;
  if (!images.length) return <div className="text-slate-500 text-sm py-8 text-center">No images found.</div>;

  return (
    <div className="flex flex-col divide-y divide-slate-600/60">
      {images.map((img) => (
        <div key={img.id} className="w-full flex flex-col gap-4 py-5 first:pt-1">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Image size={14} className="text-blue-400 shrink-0" />
              <span className="text-white font-bold text-base">{img.name}</span>
              <span className="text-slate-500 font-mono text-xs">{img.id}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">
              {img.tag}
            </span>
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
  );
};
