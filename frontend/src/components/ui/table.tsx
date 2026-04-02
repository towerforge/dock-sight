import styles from "@/css/ui/table.module.css"

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export function Table({ children, className = "", ...props }: TableProps) {
    return (
        <div className={`${styles.wrap} ${className}`} {...props}>
            <table className={styles.table}>
                {children}
            </table>
        </div>
    )
}

export function TableHead({ children }: { children: React.ReactNode }) {
    return <thead className={styles.thead}><tr className={styles.tr}>{children}</tr></thead>
}

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    align?: "left" | "right"
    shrink?: boolean
}

export function Th({ align, shrink, className = "", children, ...props }: ThProps) {
    const cls = [
        styles.th,
        align === "right" ? styles.right : "",
        shrink ? styles.shrink : "",
        className,
    ].join(" ")
    return <th className={cls} {...props}>{children}</th>
}

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode
}

export function TableBody({ children }: { children: React.ReactNode }) {
    return <tbody className={styles.tbody}>{children}</tbody>
}

export function Tr({ className = "", children, ...props }: TrProps) {
    return <tr className={`${styles.tr} ${className}`} {...props}>{children}</tr>
}

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    align?: "left" | "right"
    muted?: boolean
    shrink?: boolean
}

export function Td({ align, muted, shrink, className = "", children, ...props }: TdProps) {
    const cls = [
        styles.td,
        align === "right" ? styles.right : "",
        muted ? styles.muted : "",
        shrink ? styles.shrink : "",
        className,
    ].join(" ")
    return <td className={cls} {...props}>{children}</td>
}

export function TableCell({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <span className={styles.cell}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </span>
    )
}
