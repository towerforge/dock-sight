import React, { useState, useMemo } from 'react';
import { Search, Server, Cpu, CircuitBoard, HardDrive, BarChart2, Activity } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatBytes } from '@/lib/formatters';
import { MiniSysChart } from '@/components/dashboard/mini-sys-chart';
import { ServiceCard } from '@/components/dashboard/service-card';
import { ServiceBar } from '@/components/dashboard/service-bar';
import { TimeSelector } from '@/components/dashboard/time-selector';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'bars' | 'chart'>('bars');
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Hook call that manages all data and the refresh interval
  const { sys, dock, sysHistory, serviceHistory } = useDashboardData(refreshInterval);

  // Optimized filtering
  const filteredDocs = useMemo(() => {
    return dock
      .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dock, searchTerm]);

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

      {/* GLOBAL METRICS (CPU / RAM / DISK) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CPU */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between h-56 relative overflow-hidden">
          <div>
            <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2"><Cpu size={18} className="text-blue-500"/> CPU</h3>
            <div className="text-3xl font-bold text-white mt-1">{sys?.cpu.percent.toFixed(0) ?? 0}%</div>
            <div className="text-xs text-slate-500 mt-1">{sys?.cpu.total ?? 0} Cores Active</div>
          </div>
          {viewMode === 'bars' ? (
            <div className="mt-auto">
               <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                 <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${sys?.cpu.percent ?? 0}%` }}></div>
               </div>
               <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider"><span>0%</span><span>Load</span><span>100%</span></div>
            </div>
          ) : (
            <MiniSysChart data={sysHistory} dataKey="cpu" colorHex="#3b82f6" colorId="blue" />
          )}
        </div>

        {/* RAM */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between h-56 relative overflow-hidden">
          <div>
            <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2"><CircuitBoard size={18} className="text-emerald-500"/> RAM</h3>
            <div className="text-3xl font-bold text-white mt-1">{sys?.ram.percent.toFixed(0) ?? 0}%</div>
            <div className="text-xs text-slate-500 mt-1">{formatBytes(sys?.ram.used ?? 0)} Used</div>
          </div>
          {viewMode === 'bars' ? (
            <div className="mt-auto">
               <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                 <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${sys?.ram.percent ?? 0}%` }}></div>
               </div>
               <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider"><span>Used</span><span>Free</span></div>
            </div>
          ) : (
            <MiniSysChart data={sysHistory} dataKey="ram" colorHex="#10b981" colorId="emerald" />
          )}
        </div>

        {/* DISK */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between h-56 relative overflow-hidden">
           <div>
            <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2"><HardDrive size={18} className="text-amber-500"/> DISK</h3>
            <div className="text-3xl font-bold text-white mt-1">{sys?.disk.percent.toFixed(0) ?? 0}%</div>
            <div className="text-xs text-slate-500 mt-1">{formatBytes(sys?.disk.used ?? 0)} Used</div>
          </div>
          {viewMode === 'bars' ? (
            <div className="mt-auto">
               <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                 <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${sys?.disk.percent ?? 0}%` }}></div>
               </div>
               <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider"><span>Used</span><span>Free</span></div>
            </div>
          ) : (
            <MiniSysChart data={sysHistory} dataKey="disk" colorHex="#f59e0b" colorId="amber" />
          )}
        </div>
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