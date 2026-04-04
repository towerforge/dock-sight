import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '@/components/ui'
import { useDashboard } from '@/context/dashboard-context'
import type { DockerService } from '@/types/dashboard'

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ef4444', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#14b8a6',
]

const COL_W   = 36    // distance between network columns
const ROW_H   = 38    // row height
const NODE_R  = 7     // dot radius
const PAD_L   = 18    // left padding
const PAD_T   = 24    // top padding
const LINE_W  = 2     // line stroke width
const BADGE_H = 26    // badge height
const BADGE_P = 10    // badge horizontal padding
const ICON_S  = 14    // icon size

// ── Types ─────────────────────────────────────────────────────────────────────
type Row =
    | { kind: 'network'; name: string; ci: number; ri: number }
    | { kind: 'service'; svc: DockerService }

// ── Helpers ───────────────────────────────────────────────────────────────────
const cx = (ci: number) => PAD_L + ci * COL_W
const ry = (ri: number) => PAD_T + ri * ROW_H + ROW_H / 2

function buildRows(dock: DockerService[]) {
    const netSet = new Set<string>()
    for (const svc of dock) for (const n of svc.networks ?? []) netSet.add(n)
    const networks = Array.from(netSet).sort()
    const sorted   = [...dock].sort((a, b) => a.name.localeCompare(b.name))
    const rows: Row[] = [
        ...networks.map((name, ci) => ({ kind: 'network' as const, name, ci, ri: ci })),
        ...sorted.map(svc           => ({ kind: 'service'  as const, svc              })),
    ]
    return { networks, rows }
}

// ── Lucide-style icons ────────────────────────────────────────────────────────
function GlobeIcon({ x, y, color }: { x: number; y: number; color: string }) {
    const s = ICON_S / 24
    return (
        <g transform={`translate(${x - ICON_S / 2}, ${y - ICON_S / 2}) scale(${s})`}
           fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10} />
            <line x1={2} y1={12} x2={22} y2={12} />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </g>
    )
}

function GitBranchIcon({ x, y, color }: { x: number; y: number; color: string }) {
    const s = ICON_S / 24
    return (
        <g transform={`translate(${x - ICON_S / 2}, ${y - ICON_S / 2}) scale(${s})`}
           fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1={6} y1={3} x2={6} y2={15} />
            <circle cx={18} cy={6} r={3} />
            <circle cx={6}  cy={18} r={3} />
            <path d="M18 9a9 9 0 0 1-9 9" />
        </g>
    )
}

// ── Badges ────────────────────────────────────────────────────────────────────
function NetworkBadge({ x, y, name, color }: { x: number; y: number; name: string; color: string }) {
    const w = name.length * 7.5 + BADGE_P * 2 + ICON_S + 8
    return (
        <g>
            <rect x={x} y={y - BADGE_H / 2} width={w} height={BADGE_H} rx={5}
                  fill={color + '15'} stroke={color} strokeWidth={1.5}
                  strokeDasharray="5 3" />
            <GlobeIcon x={x + BADGE_P + ICON_S / 2} y={y} color={color} />
            <text x={x + BADGE_P + ICON_S + 6} y={y + 4} fontSize={12} fontWeight={600}
                  fill={color} style={{ userSelect: 'none' }}>
                {name}
            </text>
        </g>
    )
}

function ServiceBadge({ x, y, name, paused, cols }: {
    x: number; y: number; name: string; paused: boolean; cols: number[]
}) {
    const w = name.length * 7.5 + BADGE_P * 2 + ICON_S + 8
    const gradId = `svc-grad-${name.replace(/[^a-z0-9]/gi, '_')}`

    // Border color: single color, gradient, or neutral
    const strokeVal = cols.length === 0
        ? 'var(--stroke-1)'
        : cols.length === 1
            ? COLORS[cols[0] % COLORS.length]
            : `url(#${gradId})`

    const iconColor = cols.length > 0 ? COLORS[cols[0] % COLORS.length] : 'var(--text-3)'

    return (
        <g>
            {/* Gradient def for multi-network service */}
            {cols.length > 1 && (
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {cols.map((ci, i) => (
                            <stop key={ci} offset={`${(i / (cols.length - 1)) * 100}%`}
                                  stopColor={COLORS[ci % COLORS.length]} />
                        ))}
                    </linearGradient>
                </defs>
            )}
            <rect x={x} y={y - BADGE_H / 2} width={w} height={BADGE_H} rx={5}
                  fill="var(--fill-1)" stroke={strokeVal} strokeWidth={1.5} />
            <GitBranchIcon x={x + BADGE_P + ICON_S / 2} y={y} color={iconColor} />
            <text x={x + BADGE_P + ICON_S + 6} y={y + 4} fontSize={12} fontWeight={500}
                  fill={paused ? 'var(--text-3)' : 'var(--text-1)'}
                  style={{ userSelect: 'none' }}>
                {name}
            </text>
        </g>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TopologyPage() {
    const { dock }           = useDashboard()
    const navigate           = useNavigate()
    const { networks, rows } = useMemo(() => buildRows(dock), [dock])

    if (dock.length === 0) return (
        <Page>
            <p style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>
                No services
            </p>
        </Page>
    )

    // For each network: last row index that uses it
    const netLastRow = networks.map(net => {
        let last = networks.indexOf(net) // at minimum, the network's own row
        rows.forEach((row, ri) => {
            if (row.kind === 'service' && (row.svc.networks ?? []).includes(net)) last = ri
        })
        return last
    })

    const labelX = PAD_L + Math.max(networks.length, 1) * COL_W + 20
    const svgH   = PAD_T + rows.length * ROW_H + 16
    const svgW   = labelX + 360

    return (
        <Page>
            <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>

                {/* ── Vertical lines: from network row to last service row ── */}
                {networks.map((net, ci) => (
                    <line key={`vline-${net}`}
                        x1={cx(ci)} y1={ry(ci)}
                        x2={cx(ci)} y2={ry(netLastRow[ci])}
                        stroke={COLORS[ci % COLORS.length]}
                        strokeWidth={LINE_W}
                        opacity={0.55}
                    />
                ))}

                {/* ── Rows ── */}
                {rows.map((row, ri) => {
                    const y = ry(ri)

                    // ── Network row ──
                    if (row.kind === 'network') {
                        const color = COLORS[row.ci % COLORS.length]
                        return (
                            <g key={`net-${row.name}`}>
                                <circle cx={cx(row.ci)} cy={y} r={NODE_R}
                                    fill={color} stroke="var(--layer-1)" strokeWidth={2} />
                                <NetworkBadge x={labelX} y={y} name={row.name} color={color} />
                            </g>
                        )
                    }

                    // ── Service row ──
                    const { svc } = row
                    const cols = (svc.networks ?? [])
                        .map(n => networks.indexOf(n))
                        .filter(i => i >= 0)
                        .sort((a, b) => a - b)
                    const paused = svc.containers === 0

                    return (
                        <g key={`svc-${svc.name}`}
                           style={{ cursor: 'pointer' }}
                           onClick={() => navigate(`/service/overview?name=${encodeURIComponent(svc.name)}`)}>

                            {/* Straight line connecting multi-network dots */}
                            {cols.length > 1 && (
                                <line
                                    x1={cx(cols[0])} y1={y}
                                    x2={cx(cols[cols.length - 1])} y2={y}
                                    stroke="var(--stroke-1)" strokeWidth={LINE_W}
                                />
                            )}

                            {/* Dot on each network column */}
                            {cols.map(ci => (
                                <circle key={ci}
                                    cx={cx(ci)} cy={y} r={NODE_R}
                                    fill={COLORS[ci % COLORS.length]}
                                    stroke="var(--layer-1)" strokeWidth={2} />
                            ))}

                            {/* No network: floating dot */}
                            {cols.length === 0 && (
                                <circle cx={labelX - 16} cy={y} r={NODE_R}
                                    fill="var(--text-3)" stroke="var(--layer-1)" strokeWidth={2} />
                            )}

                            <ServiceBadge x={labelX} y={y} name={svc.name}
                                paused={paused} cols={cols} />
                        </g>
                    )
                })}
            </svg>
        </Page>
    )
}
