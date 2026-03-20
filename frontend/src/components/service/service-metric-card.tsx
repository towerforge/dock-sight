import React from 'react';
import { MiniServiceChart } from './mini-service-chart';
import type { ServiceHistoryPoint } from '@/types/dashboard';

interface Props {
  title: string;
  Icon: React.ComponentType<any>;
  iconClass: string;
  fillClass: string;
  percent: number;
  mainValue: string;
  subtitle?: string;
  data: ServiceHistoryPoint[];
  dataKey: 'cpu' | 'ramPercent';
  colorHex: string;
  colorId: string;
  pointCount?: number;
  viewMode: 'table' | 'grid';
}

export const ServiceMetricCard: React.FC<Props> = ({
  title, Icon, iconClass, fillClass, percent, mainValue, subtitle,
  data, dataKey, colorHex, colorId, pointCount, viewMode,
}) => (
  <div className="p-3 rounded-2xl bg-card-bg border border-card-border shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
    <div>
      <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2">
        <Icon size={16} className={iconClass} />{title}
      </h3>
      <div className="text-2xl font-bold text-white mt-1">{mainValue}</div>
      {subtitle && <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>}
    </div>

    {viewMode === 'table' ? (
      <div className="mt-auto">
        <div className="w-full bg-card-border h-2 rounded-full overflow-hidden mb-2">
          <div className={`${fillClass} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
    ) : (
      <MiniServiceChart data={data} dataKey={dataKey} colorHex={colorHex} colorId={colorId} pointCount={pointCount} />
    )}
  </div>
);
