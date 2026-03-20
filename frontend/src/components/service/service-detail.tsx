import React, { useMemo, useState } from 'react';
import { ArrowLeft, Box, Cpu, MemoryStick, Image, BarChart2, Activity } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatBytes } from '@/lib/formatters';
import type { ServiceHistoryPoint } from '@/types/dashboard';
import { ServiceMetricCard } from './service-metric-card';
import { InfoTab } from './containers-tab';
import { ImagesTab } from './images-tab';
import { TimeSelector } from '@/components/dashboard/time-selector';
import { PointCountSelector } from '@/components/dashboard/point-count-selector';

const TABS = [
  { id: 'info',   label: 'Containers', Icon: Box  },
  { id: 'images', label: 'Images',       Icon: Image },
] as const;

const ServiceDetail: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const serviceName = params.get('name') ?? '';

  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [pointCount, setPointCount] = useState(10);
  const [activeTab, setActiveTab] = useState<'info' | 'images'>('info');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { dock, serviceHistory } = useDashboardData(refreshInterval);

  const service = useMemo(
    () => dock.find((s) => s.name === serviceName) ?? null,
    [dock, serviceName],
  );
  const history: ServiceHistoryPoint[] = serviceHistory[serviceName] ?? [];

  if (!serviceName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <p>No service name provided.</p>
        <a href="/" className="text-blue-400 hover:underline text-sm">← Back to dashboard</a>
      </div>
    );
  }

  const isHighLoad = (service?.info.cpu.percent ?? 0) > 70;

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </a>
        <div className="w-px h-5 bg-card-border" />
        <div className="flex items-center gap-3 flex-1">
          <Box size={20} className="text-blue-500 shrink-0" />
          <h1 className="text-xl font-bold text-white truncate">{serviceName}</h1>
          {service && (
            <div className="flex items-center gap-3 ml-1">
              {isHighLoad
                ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">HIGH LOAD</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">OK</span>
              }
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <TimeSelector value={refreshInterval} onChange={setRefreshInterval} />
            <PointCountSelector value={pointCount} onChange={setPointCount} />
            <div className="bg-card-bg p-1 rounded-lg border border-card-border flex shadow-sm h-[38px]">
              <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-card-border text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}>
                <BarChart2 size={15} /> Table
              </button>
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-3 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-card-border text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}>
                <Activity size={15} /> Grid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ServiceMetricCard
          title="CPU Load" Icon={Cpu} iconClass="text-blue-400" fillClass="bg-blue-500"
          percent={service?.info.cpu.percent ?? 0}
          mainValue={`${(service?.info.cpu.percent ?? 0).toFixed(1)}%`}
          data={history} dataKey="cpu" colorHex="#3b82f6" colorId="cpu"
          pointCount={pointCount} viewMode={viewMode}
        />
        <ServiceMetricCard
          title="RAM Usage" Icon={MemoryStick} iconClass="text-emerald-400" fillClass="bg-emerald-500"
          percent={service?.info.ram.percent ?? 0}
          mainValue={`${(service?.info.ram.percent ?? 0).toFixed(1)}%`}
          subtitle={service ? formatBytes(service.info.ram.used) : undefined}
          data={history} dataKey="ramPercent" colorHex="#10b981" colorId="ram"
          pointCount={pointCount} viewMode={viewMode}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col flex-1">
        <div className="flex gap-1">
          {TABS.map(({ id, label, Icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-xl border transition-colors relative z-10 -mb-px ${
                activeTab === id
                  ? 'bg-card-bg border-card-border border-b-[#1f2329] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <TabIcon size={14} />{label}
            </button>
          ))}
        </div>
        <div className="bg-card-bg border border-card-border rounded-b-xl rounded-tr-xl p-4 relative z-0 flex-1 overflow-y-auto">
          {activeTab === 'info'   && <InfoTab   serviceName={serviceName} />}
          {activeTab === 'images' && <ImagesTab serviceName={serviceName} />}
        </div>
      </div>

    </div>
  );
};

export default ServiceDetail;
