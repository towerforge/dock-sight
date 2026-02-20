import React from 'react';
import { MiniSysChart } from '@/components/dashboard/mini-sys-chart';

type DataKey = 'cpu' | 'ram' | 'disk' | 'network';

export default function MetricCard({
  title,
  Icon,
  progressBgClass,
  percent,
  mainValue,
  subtitle,
  dataKey,
  colorHex,
  colorId,
  viewMode,
  sysHistory,
}: {
  title: string;
  Icon: React.ComponentType<any>;
  progressBgClass: string;
  percent: number;
  mainValue: string | number;
  subtitle?: string;
  dataKey: DataKey;
  colorHex: string;
  colorId: string;
  viewMode: 'bars' | 'chart';
  sysHistory: any;
}) {
  const fill = progressBgClass.replace('text-', 'bg-');
  const labels = ['0%', '50%', '100%'];
  return (
    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
      <div>
        <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2">
          <Icon size={16} className={progressBgClass} />{title}
        </h3>
        <div className="text-2xl font-bold text-white mt-1">{mainValue}</div>
        {subtitle && <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>}
      </div>

      {viewMode === 'bars' ? (
        <div className="mt-auto">
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
            <div className={`${fill} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            <span>{labels[0]}</span><span>{labels[1]}</span><span>{labels[2]}</span>
          </div>
        </div>
      ) : (
        <MiniSysChart data={sysHistory} dataKey={dataKey} colorHex={colorHex} colorId={colorId} />
      )}
    </div>
  );
}
