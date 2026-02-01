import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { formatTooltipTime } from '@/lib/formatters';
import type { SysHistoryPoint } from '@/types/dashboard';

interface Props {
  data: SysHistoryPoint[];
  dataKey: string;
  colorHex: string;
  colorId: string;
}

export const MiniSysChart: React.FC<Props> = ({ data, dataKey, colorHex, colorId }) => (
  <div className="h-24 w-full mt-auto relative">
    {/* Indicador Live */}
    <div className="absolute top-0 right-0 flex items-center gap-1.5 pointer-events-none z-10">
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${colorId}-500`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 bg-${colorId}-500`}></span>
      </span>
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Live</span>
    </div>
    
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${colorId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorHex} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={colorHex} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="time" domain={['dataMin', 'dataMax']} type="number" hide />
        <YAxis domain={[0, 'auto']} hide />
        <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', fontSize: '12px', borderRadius: '6px' }}
            itemStyle={{ color: colorHex }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px', fontWeight: 600 }}
            labelFormatter={(value) => formatTooltipTime(value)}
            formatter={(value?: number) => {
              if (value == null) return [''];
              return [`${value.toFixed(1)}%`];
            }}
        />
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
      </AreaChart>
    </ResponsiveContainer>
  </div>
);