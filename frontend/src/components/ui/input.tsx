import styles from "@/css/ui/input.module.css"

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    hint?: string
    error?: string
    iconLeft?: React.ReactNode
    iconRight?: React.ReactNode
}

export function Input({
    label,
    hint,
    error,
    iconLeft,
    iconRight,
    disabled,
    required,
    id,
    className = "",
    ...props
}: Props) {
    const wrapperClass = [
        styles.wrapper,
        disabled ? styles.disabled : "",
        error    ? styles.error    : "",
    ].join(" ")

    return (
        <div className={wrapperClass}>
            {label && (
                <label className={styles.label} htmlFor={id}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={styles.control}>
                {iconLeft  && <span className={styles.iconLeft}>{iconLeft}</span>}
                <input
                    id={id}
                    disabled={disabled}
                    required={required}
                    className={`${styles.input} ${className}`}
                    {...props}
                />
                {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
            </div>

            {error && (
                <span className={`${styles.message} ${styles.errorMsg}`}>
                    <svg className={styles.messageIcon} width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 1a5 5 0 1 1 0 10A5 5 0 0 1 6 1Zm0 7.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM6 3a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0v-3A.5.5 0 0 0 6 3Z"/>
                    </svg>
                    {error}
                </span>
            )}

            {hint && !error && (
                <span className={`${styles.message} ${styles.hint}`}>{hint}</span>
            )}
        </div>
    )
}
