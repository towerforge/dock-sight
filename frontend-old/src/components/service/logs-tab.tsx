import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Trash2, ArrowDownToLine, ArrowDown, Maximize2 } from 'lucide-react';

interface LogLine {
  container: string;
  time: string;
  message: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'default';
}

interface ParsedLine {
  ts: string;
  pid: string;
  level: string;
  rest: string;
}

const COLORS = [
  { dot: 'bg-blue-400',    text: 'text-blue-400'    },
  { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  { dot: 'bg-violet-400',  text: 'text-violet-400'  },
  { dot: 'bg-amber-400',   text: 'text-amber-400'   },
  { dot: 'bg-pink-400',    text: 'text-pink-400'    },
  { dot: 'bg-cyan-400',    text: 'text-cyan-400'    },
];

const LEVEL_STYLES: Record<LogLine['level'], string> = {
  error:   'text-red-400',
  warn:    'text-amber-400',
  info:    'text-slate-300',
  debug:   'text-slate-500',
  default: 'text-slate-300',
};

const LEVEL_BADGE: Record<string, string> = {
  ERROR:    'bg-red-500/10 text-red-400 border-red-500/20',
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  FATAL:    'bg-red-500/10 text-red-400 border-red-500/20',
  WARNING:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  WARN:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  INFO:     'bg-slate-700/60 text-slate-400 border-slate-600/50',
  DEBUG:    'bg-slate-800/60 text-slate-500 border-slate-700/50',
};

// [2026-03-20 23:57:00 +0000] [PID] [LEVEL] rest
const BRACKETED_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[^\]]*)\]\s*(?:\[(\d+)\]\s*)?(?:\[([A-Z]+)\]\s*)?(.*)/s;
// 2026-03-20T19:54:01.801Z rest  or  2026-03-20 19:54:01 UTC rest
const PLAIN_TS_RE = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:\s?UTC|Z)?)\s*/;

function parseLine(message: string): ParsedLine {
  const bm = message.match(BRACKETED_RE);
  if (bm) return { ts: bm[1] ?? '', pid: bm[2] ?? '', level: bm[3] ?? '', rest: bm[4] ?? '' };
  const tm = message.match(PLAIN_TS_RE);
  if (tm) return { ts: tm[1], pid: '', level: '', rest: message.slice(tm[0].length) };
  return { ts: '', pid: '', level: '', rest: message };
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts.replace(' UTC', 'Z').replace(' ', 'T'));
    return isNaN(d.getTime()) ? ts : d.toLocaleTimeString();
  } catch { return ts; }
}

function detectLevel(message: string): LogLine['level'] {
  const bm = message.match(/\[([A-Z]+)\]/);
  if (bm) {
    const l = bm[1];
    if (['ERROR', 'FATAL', 'CRITICAL'].includes(l)) return 'error';
    if (['WARN', 'WARNING'].includes(l))             return 'warn';
    if (l === 'DEBUG')                               return 'debug';
    if (l === 'INFO')                                return 'info';
  }
  const m = message.toLowerCase();
  if (m.includes('error') || m.includes('fatal') || m.includes('critical') || m.includes('panic')) return 'error';
  if (m.includes('warn'))  return 'warn';
  if (m.includes('debug')) return 'debug';
  if (m.includes('info'))  return 'info';
  return 'default';
}

export const LogsTab: React.FC<{ serviceName: string; fullscreen?: boolean }> = ({ serviceName, fullscreen = false }) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [legend, setLegend] = useState<{ name: string; color: typeof COLORS[0] }[]>([]);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [marked, setMarked] = useState<number | null>(null);
  const containerColors = useRef<Record<string, typeof COLORS[0]>>({});
  const colorIndex = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([]);
    setLegend([]);
    containerColors.current = {};
    colorIndex.current = 0;

    const es = new EventSource(`/docker-service/logs?name=${encodeURIComponent(serviceName)}`);
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data);
        const line: LogLine = { ...raw, level: detectLevel(raw.message) };
        if (!containerColors.current[line.container]) {
          const color = COLORS[colorIndex.current % COLORS.length];
          containerColors.current[line.container] = color;
          colorIndex.current++;
          setLegend((prev) => [...prev, { name: line.container, color }]);
        }
        setLogs((prev) => [...prev.slice(-2000), line]);
      } catch { /* ignore */ }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [serviceName]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [logs, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }, []);

  const filtered = search
    ? logs.filter((l) => l.message.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap flex-1 ml-2">
          {legend.map(({ name, color }) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
              <span className={`text-xs font-mono ${color.text}`}>{name}</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-app-bg border border-card-border text-slate-200 text-sm rounded-lg pl-8 pr-3 py-2 w-56 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          <button
            onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            title="Scroll to bottom"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-card-border text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {autoScroll ? <ArrowDownToLine size={14} /> : <ArrowDown size={14} />}
            {autoScroll ? 'Live' : 'Scroll'}
          </button>

          {!fullscreen && (
            <button
              onClick={() => window.open(`/logs?name=${encodeURIComponent(serviceName)}`, '_blank')}
              title="Open fullscreen"
              className="flex items-center justify-center w-[38px] h-[38px] rounded-lg border border-card-border text-slate-500 hover:text-white hover:border-slate-500 transition-colors"
            >
              <Maximize2 size={14} />
            </button>
          )}

          <button
            onClick={() => setLogs([])}
            title="Clear logs"
            className="flex items-center justify-center w-[38px] h-[38px] rounded-lg border border-card-border text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <Trash2 size={14} />
          </button>

          {logs.length > 0 && (
            <span className="text-xs text-slate-600 tabular-nums">
              {filtered.length}{search ? `/${logs.length}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Logs */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-xs min-h-0"
      >
        {filtered.length === 0 ? (
          <span className="text-slate-600">{search ? 'No matches.' : 'Waiting for logs…'}</span>
        ) : (
          filtered.map((line, i) => {
            const { ts, pid, level, rest } = parseLine(line.message);
            const isMarked = marked === i;
            const msgClass = isMarked ? 'text-yellow-200' : LEVEL_STYLES[line.level];
            const badgeClass = isMarked ? 'bg-yellow-400/10 text-yellow-300 border-yellow-400/30' : undefined;

            return (
              <div
                key={i}
                onClick={() => setMarked(isMarked ? null : i)}
                className={`flex gap-2 pl-2 py-1.5 min-w-0 cursor-pointer transition-colors ${
                  isMarked
                    ? 'bg-yellow-400/10 border-y border-yellow-400/40'
                    : line.level === 'error'
                    ? 'bg-red-500/5 hover:bg-red-500/10 border-b border-slate-700/50'
                    : 'hover:bg-white/[0.03] border-b border-slate-700/50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${isMarked ? 'bg-yellow-400' : containerColors.current[line.container]?.dot ?? 'bg-slate-400'}`} />

                <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                  {/* Timestamp */}
                  {ts && (
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] tabular-nums border ${badgeClass ?? 'text-slate-500 bg-slate-800/60 border-slate-700/50'}`}>
                      {formatTs(ts)}
                    </span>
                  )}

                  {/* PID */}
                  {pid && (
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] tabular-nums border ${badgeClass ?? 'text-slate-600 bg-slate-800/40 border-slate-700/30'}`}>
                      {pid}
                    </span>
                  )}

                  {/* Level */}
                  {level && (
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold border ${badgeClass ?? LEVEL_BADGE[level] ?? 'text-slate-400 bg-slate-700/40 border-slate-600/40'}`}>
                      {level}
                    </span>
                  )}

                  {/* Message */}
                  <span className={`break-all ${msgClass}`}>{rest}</span>
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  );
};
