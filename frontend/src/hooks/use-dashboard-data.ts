import { useState, useEffect } from 'react';
import { apiSysInfo, apiDockerService } from '@/services/sysinfo';
import type { SystemStats, DockerService, SysHistoryPoint, ServiceHistoryPoint } from '@/types/dashboard';

export function useDashboardData(refreshInterval: number) {
  const [sys, setSys] = useState<SystemStats | null>(null);
  const [dock, setDock] = useState<DockerService[]>([]);
  const [sysHistory, setSysHistory] = useState<SysHistoryPoint[]>([]);
  const [serviceHistory, setServiceHistory] = useState<Record<string, ServiceHistoryPoint[]>>({});
  
  // Internal trigger to force a re-render on each interval
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Promise.all([apiSysInfo(), apiDockerService()])
      .then(([sysData, dockData]) => {
        setSys(sysData);
        setDock(dockData);
        const now = Date.now();

        // 1. Update global history
        setSysHistory(prev => {
          const newPoint: SysHistoryPoint = {
            time: now,
            cpu: sysData.cpu.percent,
            ram: sysData.ram.percent,
            disk: sysData.disk.percent
          };
          const newArr = [...prev, newPoint];
          if (newArr.length > 60) newArr.shift();
          return newArr;
        });

        // 2. Update services history
        setServiceHistory(prev => {
          const next = { ...prev };
          dockData.forEach((svc: DockerService) => {
            if (!next[svc.name]) next[svc.name] = [];
            const svcHistory = [...next[svc.name], { 
              time: now, 
              cpu: svc.info.cpu.percent, 
              ramPercent: svc.info.ram.percent 
            }];
            if (svcHistory.length > 50) svcHistory.shift();
            next[svc.name] = svcHistory;
          });
          return next;
        });
      })
      .catch((err) => console.error("Error metrics:", err));
  }, [tick]);

  // Interval management
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return { sys, dock, sysHistory, serviceHistory };
}