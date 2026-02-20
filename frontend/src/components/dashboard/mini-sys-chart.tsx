import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { formatTooltipTime, formatBytes } from '@/lib/formatters';
import type { SysHistoryPoint } from '@/types/dashboard';

interface Props {
  data: SysHistoryPoint[];
  dataKey: string;
  colorHex: string;
  colorId: string;
}

export const MiniSysChart: React.FC<Props> = ({ data, dataKey, colorHex, colorId }) => {
  const secondColor = (hex: string) => (hex && hex.length === 7 ? `${hex}66` : hex);

  const isNetwork = dataKey === 'network';

  return (
    <div className="h-24 w-full mt-auto relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${colorId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colorHex} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={colorHex} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id={`grad-${colorId}-tx`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={secondColor(colorHex)} stopOpacity={0.35}/>
              <stop offset="95%" stopColor={secondColor(colorHex)} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" domain={["dataMin", "dataMax"]} type="number" hide />
          <YAxis domain={[0, 'auto']} hide />
          <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', fontSize: '12px', borderRadius: '6px' }}
              itemStyle={(value) => ({ color: Array.isArray(value) ? colorHex : colorHex }) as any}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px', fontWeight: 600 }}
              labelFormatter={(value) => formatTooltipTime(value)}
              formatter={(value?: number, name?: string) => {
                if (value == null) return [''];
                if (isNetwork) return [formatBytes(value)];
                return [`${value.toFixed(1)}%`];
              }}
          />

          {isNetwork ? (
            <>
              <Area
                type="monotone"
                dataKey="networkRx"
                name="Download"
                stroke={colorHex}
                strokeWidth={2}
                fill={`url(#grad-${colorId})`}
                isAnimationActive={false}
                dot={{ r: 2.5, fill: '#1e293b', stroke: colorHex, strokeWidth: 2, fillOpacity: 1 }}
                activeDot={{ r: 6, fill: colorHex, stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="networkTx"
                name="Upload"
                stroke={secondColor(colorHex)}
                strokeWidth={2}
                fill={`url(#grad-${colorId}-tx)`}
                isAnimationActive={false}
                dot={{ r: 2.5, fill: '#1e293b', stroke: secondColor(colorHex), strokeWidth: 2, fillOpacity: 1 }}
                activeDot={{ r: 6, fill: secondColor(colorHex), stroke: '#fff', strokeWidth: 2 }}
              />
            </>
          ) : (
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colorHex} 
              strokeWidth={3} 
              fill={`url(#grad-${colorId})`} 
              isAnimationActive={false}
              dot={{ r: 2.5, fill: '#1e293b', stroke: colorHex, strokeWidth: 2, fillOpacity: 1 }}
              activeDot={{ r: 6, fill: colorHex, stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};