import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Trash2, ArrowDownToLine, ArrowDown } from 'lucide-react'

interface LogLine {
    container: string
    time: string
    message: string
    level: 'error' | 'warn' | 'info' | 'debug' | 'default'
}

const COLORS = [
    { dot: '#60a5fa', text: '#60a5fa' },
    { dot: '#34d399', text: '#34d399' },
    { dot: '#a78bfa', text: '#a78bfa' },
    { dot: '#fbbf24', text: '#fbbf24' },
    { dot: '#f472b6', text: '#f472b6' },
    { dot: '#22d3ee', text: '#22d3ee' },
]

const LEVEL_COLOR: Record<LogLine['level'], string> = {
    error:   '#f87171',
    warn:    '#fbbf24',
    info:    'var(--text-1)',
    debug:   'var(--text-3)',
    default: 'var(--text-1)',
}

const LEVEL_BADGE: Record<string, { bg: string; color: string; border: string }> = {
    ERROR:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.2)' },
    CRITICAL: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.2)' },
    FATAL:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.2)' },
    WARNING:  { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
    WARN:     { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
    INFO:     { bg: 'var(--fill-2)',          color: 'var(--text-2)', border: 'var(--stroke-1)' },
    DEBUG:    { bg: 'var(--fill-1)',          color: 'var(--text-3)', border: 'var(--stroke-1)' },
}

const BRACKETED_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[^\]]*)\]\s*(?:\[(\d+)\]\s*)?(?:\[([A-Z]+)\]\s*)?(.*)/s
const PLAIN_TS_RE  = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:\s?UTC|Z)?)\s*/

function parseLine(message: string) {
    const bm = message.match(BRACKETED_RE)
    if (bm) return { ts: bm[1] ?? '', pid: bm[2] ?? '', level: bm[3] ?? '', rest: bm[4] ?? '' }
    const tm = message.match(PLAIN_TS_RE)
    if (tm) return { ts: tm[1], pid: '', level: '', rest: message.slice(tm[0].length) }
    return { ts: '', pid: '', level: '', rest: message }
}

function formatTs(ts: string) {
    try {
        const d = new Date(ts.replace(' UTC', 'Z').replace(' ', 'T'))
        return isNaN(d.getTime()) ? ts : d.toLocaleTimeString()
    } catch { return ts }
}

function detectLevel(message: string): LogLine['level'] {
    const bm = message.match(/\[([A-Z]+)\]/)
    if (bm) {
        const l = bm[1]
        if (['ERROR', 'FATAL', 'CRITICAL'].includes(l)) return 'error'
        if (['WARN', 'WARNING'].includes(l))             return 'warn'
        if (l === 'DEBUG')                               return 'debug'
        if (l === 'INFO')                                return 'info'
    }
    const m = message.toLowerCase()
    if (m.includes('error') || m.includes('fatal') || m.includes('critical') || m.includes('panic')) return 'error'
    if (m.includes('warn'))  return 'warn'
    if (m.includes('debug')) return 'debug'
    if (m.includes('info'))  return 'info'
    return 'default'
}

const badgeStyle = (b?: { bg: string; color: string; border: string }): React.CSSProperties => ({
    fontSize: 10, padding: '2px 5px', borderRadius: 3, fontWeight: 700, flexShrink: 0,
    background: b?.bg ?? 'var(--fill-2)',
    color: b?.color ?? 'var(--text-3)',
    border: `1px solid ${b?.border ?? 'var(--stroke-1)'}`,
})

const tsBadgeStyle: React.CSSProperties = { fontSize: 10, padding: '2px 5px', borderRadius: 3, background: 'var(--fill-2)', border: '1px solid var(--stroke-1)', color: 'var(--text-3)', fontFamily: 'monospace', flexShrink: 0, tabularNums: true } as any

export function LogsTab({ serviceName }: { serviceName: string }) {
    const [logs, setLogs] = useState<LogLine[]>([])
    const [connected, setConnected] = useState(false)
    const [legend, setLegend] = useState<{ name: string; color: typeof COLORS[0] }[]>([])
    const [search, setSearch] = useState('')
    const [autoScroll, setAutoScroll] = useState(true)
    const [marked, setMarked] = useState<number | null>(null)
    const containerColors = useRef<Record<string, typeof COLORS[0]>>({})
    const colorIndex = useRef(0)
    const bottomRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setLogs([]); setLegend([])
        containerColors.current = {}; colorIndex.current = 0
        const es = new EventSource(`/docker-service/logs?name=${encodeURIComponent(serviceName)}`)
        es.onopen = () => setConnected(true)
        es.onmessage = (e) => {
            try {
                const raw = JSON.parse(e.data)
                const line: LogLine = { ...raw, level: detectLevel(raw.message) }
                if (!containerColors.current[line.container]) {
                    const color = COLORS[colorIndex.current % COLORS.length]
                    containerColors.current[line.container] = color
                    colorIndex.current++
                    setLegend(prev => [...prev, { name: line.container, color }])
                }
                setLogs(prev => [...prev.slice(-2000), line])
            } catch { /* ignore */ }
        }
        es.onerror = () => setConnected(false)
        return () => es.close()
    }, [serviceName])

    useEffect(() => {
        if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }, [logs, autoScroll])

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
    }, [])

    const filtered = search ? logs.filter(l => l.message.toLowerCase().includes(search.toLowerCase())) : logs

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10b981' : 'var(--text-3)', display: 'inline-block' }} />
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                    {legend.map(({ name, color }) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: color.text }}>{name}</span>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                        <input
                            type="text" placeholder="Filter…" value={search} onChange={e => setSearch(e.target.value)}
                            style={{
                                background: 'var(--layer-1)', border: '1px solid var(--stroke-1)', color: 'var(--text-1)',
                                fontSize: 13, borderRadius: 'var(--radius-1)', paddingLeft: 32, paddingRight: 12,
                                paddingTop: 6, paddingBottom: 6, width: 200, outline: 'none',
                            }}
                        />
                    </div>

                    <button
                        onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                            borderRadius: 'var(--radius-1)', border: '1px solid var(--stroke-1)',
                            background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)',
                        }}
                    >
                        {autoScroll ? <ArrowDownToLine size={14} /> : <ArrowDown size={14} />}
                        {autoScroll ? 'Live' : 'Scroll'}
                    </button>

                    <button
                        onClick={() => setLogs([])}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 34, height: 34, borderRadius: 'var(--radius-1)',
                            border: '1px solid var(--stroke-1)', background: 'none', cursor: 'pointer', color: 'var(--text-3)',
                        }}
                        title="Clear logs"
                    >
                        <Trash2 size={14} />
                    </button>

                    {logs.length > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                            {filtered.length}{search ? `/${logs.length}` : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Log lines */}
            <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, minHeight: 0 }}>
                {filtered.length === 0 ? (
                    <span style={{ color: 'var(--text-3)' }}>{search ? 'No matches.' : 'Waiting for logs…'}</span>
                ) : (
                    filtered.map((line, i) => {
                        const { ts, pid, level, rest } = parseLine(line.message)
                        const isMarked = marked === i
                        const color = containerColors.current[line.container]

                        return (
                            <div
                                key={i}
                                onClick={() => setMarked(isMarked ? null : i)}
                                style={{
                                    display: 'flex', gap: 8, padding: '6px 8px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--stroke-1)',
                                    background: isMarked ? 'rgba(250,204,21,0.08)' : line.level === 'error' ? 'rgba(239,68,68,0.04)' : undefined,
                                }}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isMarked ? '#facc15' : (color?.dot ?? 'var(--text-3)'), flexShrink: 0, marginTop: 4 }} />

                                <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 6px', minWidth: 0 }}>
                                    {ts && <span style={tsBadgeStyle}>{formatTs(ts)}</span>}
                                    {pid && <span style={{ ...tsBadgeStyle, color: 'var(--text-3)' }}>{pid}</span>}
                                    {level && <span style={badgeStyle(LEVEL_BADGE[level])}>{level}</span>}
                                    <span style={{ color: isMarked ? '#facc15' : LEVEL_COLOR[line.level], wordBreak: 'break-all' }}>{rest}</span>
                                </span>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
