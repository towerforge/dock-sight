import { useState, useEffect } from 'react';
import { apiSysInfo, apiDockerService } from '@/services/sysinfo';
import type { SystemStats, DockerService, SysHistoryPoint, ServiceHistoryPoint } from '@/types/dashboard';

export function useDashboardData(refreshInterval: number) {
  const [sys, setSys] = useState<SystemStats | null>(null);
  const [dock, setDock] = useState<DockerService[]>([]);
  const [sysHistory, setSysHistory] = useState<SysHistoryPoint[]>([]);
  const [serviceHistory, setServiceHistory] = useState<Record<string, ServiceHistoryPoint[]>>({});

  const maxSysHistory = 200;
  
  // Internal trigger to force a re-render on each interval
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const results = await Promise.allSettled([apiSysInfo(), apiDockerService()]);
        const now = Date.now();

        const sysResult = results[0];
        const dockResult = results[1];

        if (sysResult.status === 'fulfilled') {
          const sysData = sysResult.value;
          if (mounted) {
            setSys(sysData);
            setSysHistory(prev => {
              const newPoint: SysHistoryPoint = {
                time: now,
                cpu: sysData.cpu.percent,
                ram: sysData.ram.percent,
                disk: sysData.disk.percent,
                networkRx: sysData.network?.total_rx ?? 0,
                networkTx: sysData.network?.total_tx ?? 0
              };
              let newArr = [newPoint, ...prev];
              if (newArr.length > maxSysHistory) newArr.pop();
              return newArr;
            });
          }
        } else {
          console.error('Error fetching sys info:', sysResult.reason);
        }

        if (dockResult.status === 'fulfilled') {
          const dockData = dockResult.value;
          if (mounted) {
            setDock(dockData);
            setServiceHistory(prev => {
              const next = { ...prev };
              dockData.forEach((svc: DockerService) => {
                if (!next[svc.name]) next[svc.name] = [];
                const svcHistory = [...next[svc.name], {
                  time: now,
                  cpu: svc.info.cpu.percent,
                  ramPercent: svc.info.ram.percent
                }];
                if (svcHistory.length > maxSysHistory) svcHistory.shift();
                next[svc.name] = svcHistory;
              });
              return next;
            });
          }
        } else {
          console.error('Error fetching docker services:', dockResult.reason);
        }
      } catch (err) {
        console.error('Unexpected error metrics:', err);
      }
    })();
    return () => { mounted = false; };
  }, [tick]);

  // Interval management
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return { sys, dock, sysHistory, serviceHistory };
}