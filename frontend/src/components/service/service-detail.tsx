import React, { useMemo, useState } from 'react';
import { ArrowLeft, Box, Cpu, MemoryStick, Info, Image } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatBytes } from '@/lib/formatters';
import type { ServiceHistoryPoint } from '@/types/dashboard';
import { ServiceMetricCard } from './service-metric-card';
import { InfoTab } from './info-tab';
import { ImagesTab } from './images-tab';

const TABS = [
  { id: 'info',   label: 'General Info', Icon: Info  },
  { id: 'images', label: 'Images',       Icon: Image },
] as const;

const ServiceDetail: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const serviceName = params.get('name') ?? '';

  const { dock, serviceHistory } = useDashboardData(3000);
  const [activeTab, setActiveTab] = useState<'info' | 'images'>('info');

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
    <div className="flex flex-col gap-6">

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
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {service.containers} container{service.containers !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-slate-400">{formatBytes(service.info.ram.used)} RAM</span>
              {isHighLoad
                ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">HIGH LOAD</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">OK</span>
              }
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ServiceMetricCard
            title="CPU Load" Icon={Cpu} iconClass="text-blue-400"
            mainValue={`${(service?.info.cpu.percent ?? 0).toFixed(1)}%`}
            data={history} dataKey="cpu" colorHex="#3b82f6" colorId="cpu"
          />
          <ServiceMetricCard
            title="RAM Usage" Icon={MemoryStick} iconClass="text-emerald-400"
            mainValue={`${(service?.info.ram.percent ?? 0).toFixed(1)}%`}
            subtitle={service ? formatBytes(service.info.ram.used) : undefined}
            data={history} dataKey="ramPercent" colorHex="#10b981" colorId="ram"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col">
        <div className="flex border-b border-card-border">
          {TABS.map(({ id, label, Icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <TabIcon size={14} />{label}
            </button>
          ))}
        </div>
        <div className="pt-4">
          {activeTab === 'info'   && <InfoTab   serviceName={serviceName} />}
          {activeTab === 'images' && <ImagesTab serviceName={serviceName} />}
        </div>
      </div>

    </div>
  );
};

export default ServiceDetail;
