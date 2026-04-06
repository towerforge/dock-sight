import { ChevronDown } from 'lucide-react'
import styles from '@/css/ui/segmented-control.module.css'
import inlineStyles from '@/css/ui/inline-select.module.css'

interface Option {
    value: string
    label: string
}

interface Props {
    label: string
    value: string
    options: Option[]
    onChange: (value: string) => void
    style?: React.CSSProperties
}

export function InlineSelect({ label, value, options, onChange, style }: Props) {
    const selected = options.find(o => o.value === value)
    return (
        <div className={styles.root} style={style}>
            <label className={inlineStyles.root}>
                <span className={inlineStyles.label}>{label}</span>
                <span className={inlineStyles.value}>{selected?.label}</span>
                <ChevronDown size={12} className={inlineStyles.arrow} />
                <select
                    className={inlineStyles.select}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                >
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </label>
        </div>
    )
}
