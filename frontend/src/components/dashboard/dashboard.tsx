import React, { useState, useMemo } from 'react';
import { Search, Server, Cpu, CircuitBoard, HardDrive, BarChart2, Activity } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatBytes } from '@/lib/formatters';
import { ServiceCard } from '@/components/dashboard/service-card';
import { ServiceBar } from '@/components/dashboard/service-bar';
import { TimeSelector } from '@/components/dashboard/time-selector';
import MetricCard from '@/components/dashboard/metric-card';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'bars' | 'chart'>('bars');
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Hook managing real-time system and docker data
  const { sys, dock, sysHistory, serviceHistory } = useDashboardData(refreshInterval);

  // Optimized filtering for Docker services
  const filteredDocs = useMemo(() => {
    return dock
      .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dock, searchTerm]);

  // Network Logic: Calculate throughput and percentage relative to hardware capacity
  const totalNetworkTraffic = (sys?.network?.total_rx ?? 0) + (sys?.network?.total_tx ?? 0);
  
  // Use max_limit from Rust (or fallback to 1Gbps / 125MB/s)
  const networkHardwareLimit = sys?.network?.max_limit ?? 125000000; 
  
  // Relative percentage for the progress bar
  const networkUsagePercent = Math.min((totalNetworkTraffic / networkHardwareLimit) * 100, 100);

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-0">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dock Sight</h1>
          <p className="text-slate-400">Real-time control panel</p>
        </div>
        
        <div className="flex items-center gap-3">
          <TimeSelector value={refreshInterval} onChange={setRefreshInterval} />

          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex shadow-sm h-[38px]">
            <button onClick={() => setViewMode('bars')} className={`flex items-center gap-2 px-4 rounded-md text-sm font-medium transition-all ${viewMode === 'bars' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}>
              <BarChart2 size={16} /> Table
            </button>
            <button onClick={() => setViewMode('chart')} className={`flex items-center gap-2 px-4 rounded-md text-sm font-medium transition-all ${viewMode === 'chart' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}>
              <Activity size={16} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* GLOBAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="CPU"
          Icon={Cpu}
          progressBgClass="text-blue-500"
          percent={sys?.cpu.percent ?? 0}
          mainValue={`${sys?.cpu.percent.toFixed(0) ?? 0}%`}
          subtitle={`${sys?.cpu.active ?? 0} / ${sys?.cpu.total ?? 0} Cores`}
          dataKey="cpu"
          colorHex="#3b82f6"
          colorId="blue"
          viewMode={viewMode}
          sysHistory={sysHistory}
        />

        <MetricCard
          title="RAM"
          Icon={CircuitBoard}
          progressBgClass="text-emerald-500"
          percent={sys?.ram.percent ?? 0}
          mainValue={`${sys?.ram.percent.toFixed(0) ?? 0}%`}
          subtitle={`${formatBytes(sys?.ram.used ?? 0)} / ${formatBytes(sys?.ram.total ?? 0)}`}
          dataKey="ram"
          colorHex="#10b981"
          colorId="emerald"
          viewMode={viewMode}
          sysHistory={sysHistory}
        />

        <MetricCard
          title="DISK"
          Icon={HardDrive}
          progressBgClass="text-amber-500"
          percent={sys?.disk.percent ?? 0}
          mainValue={`${sys?.disk.percent.toFixed(0) ?? 0}%`}
          subtitle={`${formatBytes(sys?.disk.used ?? 0)} / ${formatBytes(sys?.disk.total ?? 0)}`}
          dataKey="disk"
          colorHex="#f59e0b"
          colorId="amber"
          viewMode={viewMode}
          sysHistory={sysHistory}
        />

        <MetricCard
          title="NETWORK"
          Icon={Activity}
          progressBgClass="text-violet-500"
          percent={networkUsagePercent} 
          mainValue={`${networkUsagePercent > 0 ? networkUsagePercent.toFixed(0) : 0}%`}
          subtitle={`↓ ${formatBytes(sys?.network?.total_rx ?? 0)}/s • ↑ ${formatBytes(sys?.network?.total_tx ?? 0)}/s`}
          dataKey="network"
          colorHex="#8b5cf6"
          colorId="violet"
          viewMode={viewMode}
          sysHistory={sysHistory}
        />
      </div>

      {/* SERVICES SECTION */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Server size={20} className="text-slate-400" />
            <span className="text-lg font-medium text-white">Docker Services</span>
            <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full">{filteredDocs.length}</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {viewMode === 'bars' ? (
          <ServiceBar items={filteredDocs} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((s) => (
              <ServiceCard 
                key={s.name} 
                service={s} 
                historyData={serviceHistory[s.name] || []} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}