import React, { useState, useMemo } from 'react';
import { Search, Server, Cpu, CircuitBoard, HardDrive, Activity, Trash2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAuth } from '@/hooks/use-auth';
import { formatBytes } from '@/lib/formatters';
import { ServiceCard } from '@/components/dashboard/service-card';
import { ServiceBar } from '@/components/dashboard/service-bar';
import MetricCard from '@/components/dashboard/metric-card';
import { CleanupTab } from '@/components/dashboard/cleanup-tab';
import { HeaderControls } from '@/components/header-controls';
import { AuthView } from '@/components/auth/auth-view';

export default function Dashboard() {
  const { status: authStatus, loading: authLoading, logout, refresh: refreshAuth } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'bars' | 'chart'>('bars');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [pointCount, setPointCount] = useState(10);
  const [bottomTab, setBottomTab] = useState<'services' | 'cleanup'>('services');

  // Hook managing real-time system and docker data
  const { sys, dock, sysHistory, serviceHistory } = useDashboardData(refreshInterval);

  // Optimized filtering for Docker services
  const filteredDocs = useMemo(() => {
    return dock
      .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dock, searchTerm]);

  if (authLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return (
      <AuthView
        setupRequired={authStatus?.setup_required ?? false}
        onAuthenticated={refreshAuth}
      />
    );
  }

  // Network Logic: Calculate throughput and percentage relative to hardware capacity
  const totalNetworkTraffic = (sys?.network?.total_rx ?? 0) + (sys?.network?.total_tx ?? 0);

  // Use max_limit from Rust (or fallback to 1Gbps / 125MB/s)
  const networkHardwareLimit = sys?.network?.max_limit ?? 125000000;

  // Relative percentage for the progress bar
  const networkUsagePercent = Math.min((totalNetworkTraffic / networkHardwareLimit) * 100, 100);

  return (
    <div className="w-full h-full flex flex-col">

      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-end gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dock Sight</h1>
          <p className="text-slate-400">Real-time control panel</p>
        </div>
        <HeaderControls
          refreshInterval={refreshInterval} onRefreshIntervalChange={setRefreshInterval}
          pointCount={pointCount} onPointCountChange={setPointCount}
          viewMode={viewMode} onViewModeChange={setViewMode}
          viewOptions={[{ value: 'bars', label: 'Table' }, { value: 'chart', label: 'Grid' }]}
          onLogout={logout}
        />
      </div>

      {/* GLOBAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
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
          pointCount={pointCount}
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
          pointCount={pointCount}
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
          pointCount={pointCount}
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
          pointCount={pointCount}
        />
      </div>

      {/* BOTTOM SECTION */}
      <div className="rounded-2xl bg-card-bg border border-card-border flex-1 min-h-0 flex flex-col">

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-card-border shrink-0">
          <button
            onClick={() => setBottomTab('services')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              bottomTab === 'services'
                ? 'text-white border-blue-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Server size={14} />
            Services
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-card-border text-slate-400">{filteredDocs.length}</span>
          </button>
          <button
            onClick={() => setBottomTab('cleanup')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              bottomTab === 'cleanup'
                ? 'text-white border-red-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Trash2 size={14} />
            Cleanup
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {bottomTab === 'services' ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-app-bg border border-card-border text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              {viewMode === 'bars' ? (
                <ServiceBar items={filteredDocs} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDocs.map((s) => (
                    <ServiceCard key={s.name} service={s} historyData={serviceHistory[s.name] || []} pointCount={pointCount} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <CleanupTab />
          )}
        </div>

      </div>
    </div>
  );
}
