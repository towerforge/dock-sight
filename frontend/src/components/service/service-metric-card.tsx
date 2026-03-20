import React from 'react';
import { MiniServiceChart } from './mini-service-chart';
import type { ServiceHistoryPoint } from '@/types/dashboard';

interface Props {
  title: string;
  Icon: React.ComponentType<any>;
  iconClass: string;
  mainValue: string;
  subtitle?: string;
  data: ServiceHistoryPoint[];
  dataKey: 'cpu' | 'ramPercent';
  colorHex: string;
  colorId: string;
}

export const ServiceMetricCard: React.FC<Props> = ({
  title, Icon, iconClass, mainValue, subtitle,
  data, dataKey, colorHex, colorId,
}) => (
  <div className="p-3 rounded-2xl bg-card-bg border border-card-border shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
    <div>
      <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2">
        <Icon size={16} className={iconClass} />{title}
      </h3>
      <div className="text-2xl font-bold text-white mt-1">{mainValue}</div>
      {subtitle && <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>}
    </div>
    <MiniServiceChart data={data} dataKey={dataKey} colorHex={colorHex} colorId={colorId} />
  </div>
);
