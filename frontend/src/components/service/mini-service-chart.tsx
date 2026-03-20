import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { formatTooltipTime } from '@/lib/formatters';
import type { ServiceHistoryPoint } from '@/types/dashboard';

interface Props {
  data: ServiceHistoryPoint[];
  dataKey: 'cpu' | 'ramPercent';
  colorHex: string;
  colorId: string;
}

export const MiniServiceChart: React.FC<Props> = ({ data, dataKey, colorHex, colorId }) => (
  <div className="h-24 w-full mt-auto relative">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-svc-${colorId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorHex} stopOpacity={0.2} />
            <stop offset="95%" stopColor={colorHex} stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" domain={['dataMin', 'dataMax']} type="number" hide />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          contentStyle={{ backgroundColor: '#15191f', borderColor: '#2a2e35', color: '#f8fafc', fontSize: '12px', borderRadius: '6px' }}
          labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px', fontWeight: 600 }}
          labelFormatter={(v) => formatTooltipTime(v)}
          formatter={(val?: number) => (val == null ? [''] : [`${val.toFixed(1)}%`])}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={colorHex}
          strokeWidth={3}
          fill={`url(#grad-svc-${colorId})`}
          isAnimationActive={false}
          dot={{ r: 2.5, fill: '#15191f', stroke: colorHex, strokeWidth: 2, fillOpacity: 1 }}
          activeDot={{ r: 6, fill: colorHex, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
