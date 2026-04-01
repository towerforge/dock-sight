export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1000;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatTooltipTime = (timestamp: number) => {
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  if (diffSeconds === 0) return "Just now";

  let ago = "";
  if (diffSeconds < 60) {
    ago = `${diffSeconds}s`;
  } else if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    ago = `${mins}m`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    ago = `${hours}h`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    ago = `${days}d`;
  }
  
  return `${timeStr} (${ago} ago)`;
};