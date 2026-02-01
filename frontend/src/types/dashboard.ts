export interface SystemStats {
  cpu: { percent: number; total: number };
  ram: { percent: number; total: number; used: number; free: number };
  disk: { percent: number; total: number; used: number; free: number };
}

export interface DockerService {
  name: string;
  containers: number;
  info: {
    cpu: { percent: number };
    ram: { used: number; percent: number };
  };
}

// For the global chart (SysInfo)
export interface SysHistoryPoint {
  time: number;
  cpu: number;
  ram: number;
  disk: number;
}

// For the services chart (Docker)
export interface ServiceHistoryPoint {
  time: number;
  cpu: number;
  ramPercent: number;
}