import React from 'react';
import { LogsTab } from './service/logs-tab';

const LogsFullscreen: React.FC = () => {
  const name = new URLSearchParams(window.location.search).get('name') ?? '';

  return (
    <div className="h-screen w-screen bg-app-bg flex flex-col p-4 overflow-hidden">
      <LogsTab serviceName={name} fullscreen />
    </div>
  );
};

export default LogsFullscreen;
