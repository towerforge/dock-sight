import React, { useState, useEffect } from 'react';
import { X, Tag, RefreshCw, AlertCircle, ExternalLink, Github } from 'lucide-react';
import { APP_VERSION } from '@/generated/version';

const GITHUB_REPO = 'towerforge/dock-sight';
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

interface Props {
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ onClose }) => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((r) => r.json())
      .then((d) => setLatestVersion((d.tag_name as string)?.replace(/^v/, '') ?? null))
      .catch(() => null)
      .finally(() => setChecking(false));
  }, []);

  const hasUpdate = APP_VERSION && latestVersion && APP_VERSION !== latestVersion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-card-bg border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Github size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Dock Sight</h2>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-blue-400 text-xs flex items-center gap-1 transition-colors"
            >
              {GITHUB_REPO} <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Version info */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-app-bg rounded-xl px-4 py-3 border border-card-border/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Tag size={14} /> Current version
            </div>
            <span className="text-white font-mono font-bold text-sm">{APP_VERSION}</span>
          </div>

          {!checking && hasUpdate && (
            <>
              <div className="flex items-center justify-between bg-app-bg rounded-xl px-4 py-3 border border-card-border/50">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <RefreshCw size={14} /> Latest release
                </div>
                <span className="text-white font-mono font-bold text-sm">{latestVersion}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 border bg-amber-500/10 border-amber-500/20 text-amber-400 text-sm font-medium">
                <AlertCircle size={15} />
                <span>Update available</span>
                <a
                  href={`${GITHUB_URL}/releases/latest`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto underline hover:no-underline flex items-center gap-1"
                >
                  View release <ExternalLink size={10} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
