import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DockerService } from '@/types/dashboard'

// ── Constants ─────────────────────────────────────────────────────────────────
export { NETWORK_COLORS as COLORS } from '@/lib/colors'
import { NETWORK_COLORS as COLORS } from '@/lib/colors'

const COL_W   = 36
const ROW_H   = 38
const NODE_R  = 7
const PAD_L   = 18
const PAD_T   = 24
const LINE_W  = 2
const BADGE_H = 26
const BADGE_P = 10
const ICON_S  = 14

// ── Types ─────────────────────────────────────────────────────────────────────
type Row =
    | { kind: 'network'; name: string; ci: number; ri: number }
    | { kind: 'service'; svc: DockerService }

// ── Helpers ───────────────────────────────────────────────────────────────────
const cx = (ci: number) => PAD_L + ci * COL_W

export function buildRows(dock: DockerService[]) {
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

// ── Icons ─────────────────────────────────────────────────────────────────────
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
function ServiceBadge({ x, y, name, paused, cols, colors }: {
    x: number; y: number; name: string; paused: boolean; cols: number[]; colors: string[]
}) {
    const w = name.length * 7.5 + BADGE_P * 2 + ICON_S + 8
    const gradId = `svc-grad-${name.replace(/[^a-z0-9]/gi, '_')}`

    const strokeVal = cols.length === 0
        ? 'var(--stroke-1)'
        : cols.length === 1
            ? colors[0]
            : `url(#${gradId})`

    const iconColor = cols.length > 0 ? colors[0] : 'var(--text-3)'

    return (
        <g>
            {cols.length > 1 && (
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {cols.map((ci, i) => (
                            <stop key={ci} offset={`${(i / (cols.length - 1)) * 100}%`}
                                  stopColor={colors[i]} />
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function NetworkGraph({ dock, networks: networksProp, allNetworks: allNetworksProp, hoveredNetwork, onNetworkClick }: { dock: DockerService[]; networks?: string[]; allNetworks?: string[]; hoveredNetwork?: string | null; onNetworkClick?: (network: string) => void }) {
    const navigate  = useNavigate()
    const { networks: networksFromDock, rows } = useMemo(() => buildRows(dock), [dock])
    const networks    = networksProp    ?? networksFromDock
    const allNetworks = allNetworksProp ?? networksFromDock

    // Only service rows, sorted alphabetically (already sorted in buildRows)
    const svcs = rows.filter(r => r.kind === 'service') as Extract<typeof rows[number], { kind: 'service' }>[]

    // y helpers — row 0 = network header, services start at row 1
    const netY  = PAD_T + ROW_H / 2
    const svcY  = (i: number) => netY + (i + 1) * ROW_H

    // Last service row index per network (for vertical line extent)
    const netLastSvcIdx = networks.map(net =>
        svcs.reduce((last, svc, i) =>
            (svc.svc.networks ?? []).includes(net) ? i : last, -1)
    )

    const labelX = PAD_L + Math.max(networks.length, 1) * COL_W + 20
    const svgH   = netY + (svcs.length + 1) * ROW_H
    const svgW   = labelX + 360

    const DIM = 0.12
    const netOp  = (net: string)  => !hoveredNetwork || hoveredNetwork === net ? 1 : DIM
    const svcOp  = (nets: string[]) => !hoveredNetwork || nets.includes(hoveredNetwork) ? 1 : DIM

    return (
        <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>

            {/* Vertical lines */}
            {networks.map((net, ci) => {
                const colorIdx = allNetworks.indexOf(net)
                const lastY = netLastSvcIdx[ci] >= 0 ? svcY(netLastSvcIdx[ci]) : netY
                return (
                    <line key={`vline-${net}`}
                        x1={cx(ci)} y1={netY}
                        x2={cx(ci)} y2={lastY}
                        stroke={COLORS[colorIdx % COLORS.length]}
                        strokeWidth={LINE_W}
                        opacity={0.55 * netOp(net)}
                        style={{ transition: 'opacity 0.2s' }}
                    />
                )
            })}

            {/* Network header row — all dots aligned */}
            {networks.map((net, ci) => {
                const colorIdx = allNetworks.indexOf(net)
                return (
                    <circle key={`net-${net}`}
                        cx={cx(ci)} cy={netY} r={NODE_R}
                        fill={COLORS[colorIdx % COLORS.length]}
                        stroke="var(--layer-1)" strokeWidth={2}
                        opacity={netOp(net)}
                        style={{ transition: 'opacity 0.2s', cursor: onNetworkClick ? 'pointer' : undefined }}
                        onClick={onNetworkClick ? () => onNetworkClick(net) : undefined} />
                )
            })}

            {/* Service rows */}
            {svcs.map(({ svc }, i) => {
                const y    = svcY(i)
                const cols = (svc.networks ?? [])
                    .map(n => networks.indexOf(n))
                    .filter(idx => idx >= 0)
                    .sort((a, b) => a - b)
                const paused  = svc.containers === 0
                const opacity = svcOp(svc.networks ?? [])

                return (
                    <g key={`svc-${svc.name}`}
                       style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}
                       onClick={() => navigate(`/service/overview?name=${encodeURIComponent(svc.name)}`)}>

                        {cols.length > 1 && (
                            <line
                                x1={cx(cols[0])} y1={y}
                                x2={cx(cols[cols.length - 1])} y2={y}
                                stroke="var(--stroke-1)" strokeWidth={LINE_W}
                            />
                        )}

                        {cols.map(ci => {
                            const colorIdx = allNetworks.indexOf(networks[ci])
                            return (
                                <circle key={ci}
                                    cx={cx(ci)} cy={y} r={NODE_R}
                                    fill={COLORS[colorIdx % COLORS.length]}
                                    stroke="var(--layer-1)" strokeWidth={2} />
                            )
                        })}

                        {cols.length === 0 && (
                            <circle cx={labelX - 16} cy={y} r={NODE_R}
                                fill="var(--text-3)" stroke="var(--layer-1)" strokeWidth={2} />
                        )}

                        <ServiceBadge x={labelX} y={y} name={svc.name}
                            paused={paused} cols={cols}
                            colors={cols.map(ci => COLORS[allNetworks.indexOf(networks[ci]) % COLORS.length])} />
                    </g>
                )
            })}
        </svg>
    )
}
