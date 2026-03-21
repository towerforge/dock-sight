import React, { useMemo, useState } from 'react';
import { ArrowLeft, Box, Cpu, MemoryStick, Image, ScrollText } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatBytes } from '@/lib/formatters';
import type { ServiceHistoryPoint } from '@/types/dashboard';
import { ServiceMetricCard } from './service-metric-card';
import { InfoTab } from './containers-tab';
import { ImagesTab } from './images-tab';
import { LogsTab } from './logs-tab';
import { HeaderControls } from '@/components/header-controls';

const TABS = [
  { id: 'info',   label: 'Containers', Icon: Box   },
  { id: 'images', label: 'Images',     Icon: Image },
  { id: 'logs',   label: 'Logs',       Icon: ScrollText },
] as const;

const ServiceDetail: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const serviceName = params.get('name') ?? '';

  const validTabs = ['info', 'images', 'logs'] as const;
  type TabId = typeof validTabs[number];
  const initialTab = (validTabs as readonly string[]).includes(params.get('tab') ?? '')
    ? (params.get('tab') as TabId)
    : 'info';

  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [pointCount, setPointCount] = useState(10);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
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
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </a>
        <div className="w-px h-5 bg-card-border" />
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl font-bold text-white truncate">{serviceName}</h1>
          {service && (
            <div className="flex items-center gap-3 ml-1">
              {isHighLoad
                ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">HIGH LOAD</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">OK</span>
              }
            </div>
          )}
          <div className="ml-auto">
            <HeaderControls
              refreshInterval={refreshInterval} onRefreshIntervalChange={setRefreshInterval}
              pointCount={pointCount} onPointCountChange={setPointCount}
              viewMode={viewMode} onViewModeChange={setViewMode}
              viewOptions={[{ value: 'table', label: 'Table' }, { value: 'grid', label: 'Grid' }]}
            />
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ServiceMetricCard
          title="CPU" Icon={Cpu} iconClass="text-blue-400" fillClass="bg-blue-500"
          percent={service?.info.cpu.percent ?? 0}
          mainValue={`${(service?.info.cpu.percent ?? 0).toFixed(1)}%`}
          data={history} dataKey="cpu" colorHex="#3b82f6" colorId="cpu"
          pointCount={pointCount} viewMode={viewMode}
        />
        <ServiceMetricCard
          title="RAM" Icon={MemoryStick} iconClass="text-emerald-400" fillClass="bg-emerald-500"
          percent={service?.info.ram.percent ?? 0}
          mainValue={`${(service?.info.ram.percent ?? 0).toFixed(1)}%`}
          subtitle={service ? formatBytes(service.info.ram.used) : undefined}
          data={history} dataKey="ramPercent" colorHex="#10b981" colorId="ram"
          pointCount={pointCount} viewMode={viewMode}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex gap-1">
          {TABS.map(({ id, label, Icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                const p = new URLSearchParams(window.location.search);
                p.set('tab', id);
                window.history.replaceState(null, '', `?${p.toString()}`);
              }}
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
        <div className={`bg-card-bg border border-card-border rounded-b-xl rounded-tr-xl p-4 relative z-0 flex-1 min-h-0 ${activeTab === 'logs' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {activeTab === 'info'   && <InfoTab   serviceName={serviceName} />}
          {activeTab === 'images' && <ImagesTab serviceName={serviceName} />}
          {activeTab === 'logs'   && <LogsTab   serviceName={serviceName} />}
        </div>
      </div>

    </div>
  );
};

export default ServiceDetail;
