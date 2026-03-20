import React from 'react';
import { Box } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, CartesianGrid, XAxis } from 'recharts';
import { formatBytes, formatTooltipTime } from '@/lib/formatters';
import type { DockerService, ServiceHistoryPoint } from '@/types/dashboard';

interface Props {
  service: DockerService;
  historyData: ServiceHistoryPoint[];
  pointCount?: number;
}

export const ServiceCard: React.FC<Props> = ({ service, historyData, pointCount }) => {
  const isHighLoad = service.info.cpu.percent > 70;

  const count = typeof pointCount === 'number' ? pointCount : 10;
  const limitedHistory = historyData.slice(-count);

  return (
    <div className="bg-app-bg border border-card-border rounded-xl p-5 shadow-sm flex flex-col h-64 relative overflow-hidden group hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-4 z-10">
        <div>
          <a href={`/service?name=${encodeURIComponent(service.name)}`} className="text-white hover:text-blue-400 transition-colors font-bold text-lg flex items-center gap-2 truncate">
            <Box size={18} className="text-blue-500 shrink-0" />
            {service.name}
          </a>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {service.containers} Cont.
            </span>
            <span className="flex items-center gap-1">RAM: {formatBytes(service.info.ram.used)}</span>
          </div>
        </div>
        <div>
          {isHighLoad ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">HIGH LOAD</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">OK</span>
          )}
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={limitedHistory}>
            <defs>
              <linearGradient id="splitColorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="splitColorRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e35" vertical={false} />
            <XAxis dataKey="time" domain={['dataMin', 'dataMax']} type="number" hide />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#15191f', borderColor: '#2a2e35', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ padding: 0, fontWeight: 500 }}
              labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontSize: '11px', fontFamily: 'monospace' }}
              labelFormatter={(value) => formatTooltipTime(value)}
              formatter={(val?: number, name?: string) => {
                if (val == null) return ['', name === 'cpu' ? 'CPU' : 'RAM'];
                return [`${val.toFixed(1)}%`, name === 'cpu' ? 'CPU' : 'RAM'];
              }}
            />
            
            <Area 
              type="monotone" 
              dataKey="ramPercent" 
              stroke="#10b981" 
              strokeWidth={2.5} 
              fill="url(#splitColorRam)" 
              isAnimationActive={false}
              dot={{ r: 2, fill: '#1f2329', stroke: '#10b981', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            />
            
            <Area 
              type="monotone" 
              dataKey="cpu" 
              stroke="#3b82f6" 
              strokeWidth={2.5} 
              fill="url(#splitColorCpu)" 
              isAnimationActive={false}
              dot={{ r: 2, fill: '#1f2329', stroke: '#3b82f6', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-start gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1 text-blue-400"><span className="w-2 h-0.5 bg-blue-500"></span> CPU: {service.info.cpu.percent.toFixed(1)}%</div>
        <div className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-0.5 bg-emerald-500"></span> RAM: {service.info.ram.percent.toFixed(1)}%</div>
      </div>
    </div>
  );
};