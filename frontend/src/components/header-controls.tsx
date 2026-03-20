import React, { useState } from 'react';
import { BarChart2, Activity, Info } from 'lucide-react';
import { TimeSelector } from '@/components/dashboard/time-selector';
import { PointCountSelector } from '@/components/dashboard/point-count-selector';
import { AboutModal } from '@/components/about-modal';

interface Props {
  refreshInterval: number;
  onRefreshIntervalChange: (v: number) => void;
  pointCount: number;
  onPointCountChange: (v: number) => void;
  viewMode: string;
  onViewModeChange: (v: any) => void;
  viewOptions: { value: string; label: string }[];
}

export const HeaderControls: React.FC<Props> = ({
  refreshInterval, onRefreshIntervalChange,
  pointCount, onPointCountChange,
  viewMode, onViewModeChange,
  viewOptions,
}) => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      <div className="flex items-center gap-2">
        <TimeSelector value={refreshInterval} onChange={onRefreshIntervalChange} />
        <PointCountSelector value={pointCount} onChange={onPointCountChange} />
        <div className="bg-card-bg p-1 rounded-lg border border-card-border flex shadow-sm h-[38px]">
          {viewOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onViewModeChange(value)}
              className={`flex items-center gap-2 px-3 rounded-md text-sm font-medium transition-all ${
                viewMode === value
                  ? 'bg-card-border text-white shadow-sm ring-1 ring-white/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {value === viewOptions[0].value ? <BarChart2 size={15} /> : <Activity size={15} />}
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAbout(true)}
          className="flex items-center justify-center w-[38px] h-[38px] rounded-lg border border-card-border bg-card-bg text-slate-400 hover:text-white hover:border-slate-500 transition-colors shadow-sm"
        >
          <Info size={16} />
        </button>
      </div>
    </>
  );
};
