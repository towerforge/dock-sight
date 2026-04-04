import styles from '@/css/ui/spinner.module.css'

interface Props {
    label?: string
}

export function Spinner({ label }: Props) {
    return (
        <div className={styles.wrap}>
            <div className={styles.ring} />
            {label && <span className={styles.label}>{label}</span>}
        </div>
    )
}
