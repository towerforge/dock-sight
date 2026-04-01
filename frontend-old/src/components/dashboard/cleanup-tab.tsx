import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Package, Box, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiCleanupPreview, apiRunCleanup } from '@/services/sysinfo';
import { formatBytes } from '@/lib/formatters';
import { ConfirmModal } from '@/components/service/ui';

interface Container { id: string; name: string; image: string; status: string }
interface Image     { id: string; tag: string; size: number }

export const CleanupTab: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [images,     setImages]     = useState<Image[]>([]);
  const [totalSpace, setTotalSpace] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [confirm,    setConfirm]    = useState(false);
  const [running,    setRunning]    = useState(false);
  const [result,     setResult]     = useState<{ containers_deleted: number; images_deleted: number; space_reclaimed: number } | null>(null);

  const fetchPreview = useCallback(() => {
    setLoading(true);
    setError(false);
    setResult(null);
    apiCleanupPreview()
      .then((d) => {
        setContainers(d.containers ?? []);
        setImages(d.images ?? []);
        setTotalSpace(d.total_space ?? 0);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const handleCleanup = async () => {
    setConfirm(false);
    setRunning(true);
    try {
      const res = await apiRunCleanup();
      setResult(res);
      fetchPreview();
    } catch {
      setRunning(false);
    } finally {
      setRunning(false);
    }
  };

  const isEmpty = containers.length === 0 && images.length === 0;

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>;

  if (error) return (
    <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
      <AlertCircle size={28} />
      <p className="text-sm">Could not load cleanup data</p>
      <button onClick={fetchPreview} className="text-xs text-blue-400 hover:underline mt-1">Retry</button>
    </div>
  );

  return (
    <>
      {confirm && (
        <ConfirmModal
          title="Run cleanup"
          description={`Remove ${containers.length} stopped containers and ${images.length} unused images. This cannot be undone.`}
          onConfirm={handleCleanup}
          onCancel={() => setConfirm(false)}
          loading={running}
        />
      )}

      <div className="flex flex-col gap-6">

        {/* Result banner */}
        {result && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm">
              Removed <span className="font-semibold">{result.containers_deleted}</span> containers
              and <span className="font-semibold">{result.images_deleted}</span> images
              {result.space_reclaimed > 0 && <> — freed <span className="font-semibold">{formatBytes(result.space_reclaimed)}</span></>}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Unused resources</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {isEmpty
                ? 'Nothing to clean up'
                : `${containers.length} containers · ${images.length} images · ~${formatBytes(totalSpace)} to free`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPreview}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-card-border/40 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setConfirm(true)}
              disabled={isEmpty || running}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
              {running ? 'Cleaning…' : 'Clean All'}
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
            <CheckCircle2 size={32} />
            <p className="text-sm">Everything is clean</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {containers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-2">
                  <Box size={11} /> Stopped containers ({containers.length})
                </div>
                <div className="flex flex-col divide-y divide-slate-700/50 rounded-xl border border-card-border overflow-hidden">
                  {containers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-card-bg/50 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white font-medium truncate">{c.name}</span>
                        <span className="text-slate-500 font-mono shrink-0">{c.id}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-slate-500 font-mono truncate max-w-[160px]">{c.image}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400">{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-2">
                  <Package size={11} /> Unused images ({images.length})
                </div>
                <div className="flex flex-col divide-y divide-slate-700/50 rounded-xl border border-card-border overflow-hidden">
                  {images.map((img) => (
                    <div key={img.id} className="flex items-center justify-between px-3 py-2 bg-card-bg/50 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white font-medium truncate">{img.tag}</span>
                        <span className="text-slate-500 font-mono shrink-0">{img.id}</span>
                      </div>
                      <span className="text-slate-400 shrink-0 ml-2">{formatBytes(img.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
};
